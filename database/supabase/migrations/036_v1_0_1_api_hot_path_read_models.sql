-- v1.0.1: API hot-path read models and search indexes.
-- Safe to run repeatedly after 001-035.

create extension if not exists pg_trgm;

create index if not exists courses_title_trgm_idx
  on public.courses using gin (title gin_trgm_ops);

create index if not exists courses_description_trgm_idx
  on public.courses using gin (description gin_trgm_ops);

create index if not exists course_modules_title_trgm_idx
  on public.course_modules using gin (title gin_trgm_ops);

create index if not exists course_modules_summary_trgm_idx
  on public.course_modules using gin (summary gin_trgm_ops);

create index if not exists course_nodes_title_trgm_idx
  on public.course_nodes using gin (title gin_trgm_ops);

create index if not exists course_nodes_excerpt_trgm_idx
  on public.course_nodes using gin (excerpt gin_trgm_ops);

create index if not exists user_profiles_bio_trgm_idx
  on public.user_profiles using gin (bio gin_trgm_ops);

create table if not exists public.creator_public_stats_read_model (
  creator_user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  published_course_count integer not null default 0,
  published_node_count integer not null default 0,
  premium_course_count integer not null default 0,
  follower_count integer not null default 0,
  featured_course_titles text[] not null default '{}'::text[],
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists creator_public_stats_followers_idx
  on public.creator_public_stats_read_model (follower_count desc, published_node_count desc, published_course_count desc)
  where published_course_count > 0;

create index if not exists creator_public_stats_contributions_idx
  on public.creator_public_stats_read_model (published_node_count desc, published_course_count desc, follower_count desc)
  where published_course_count > 0;

create or replace function public.refresh_creator_public_stats_read_model(target_creator_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_creator_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.user_profiles profiles
    where profiles.user_id = target_creator_user_id
      and profiles.primary_role = 'creator'
      and profiles.is_banned = false
  ) then
    delete from public.creator_public_stats_read_model
    where creator_user_id = target_creator_user_id;
    return;
  end if;

  insert into public.creator_public_stats_read_model (
    creator_user_id,
    published_course_count,
    published_node_count,
    premium_course_count,
    follower_count,
    featured_course_titles,
    updated_at
  )
  select
    profiles.user_id,
    count(distinct courses.id)::integer,
    count(distinct nodes.id)::integer,
    count(distinct courses.id) filter (
      where coalesce(courses.premium_enabled, false)
        and coalesce(courses.price_amount, 0) > 0
        and coalesce(courses.premium_access_days, 0) > 0
    )::integer,
    count(distinct followers.follower_user_id)::integer,
    coalesce(
      array(
        select featured.title
        from public.courses featured
        where featured.creator_user_id = profiles.user_id
          and featured.status = 'published'
        order by featured.updated_at desc
        limit 3
      ),
      '{}'::text[]
    ),
    timezone('utc', now())
  from public.user_profiles profiles
  left join public.courses courses
    on courses.creator_user_id = profiles.user_id
   and courses.status = 'published'
  left join public.course_modules modules on modules.course_id = courses.id
  left join public.course_nodes nodes on nodes.module_id = modules.id
  left join public.creator_followers followers on followers.creator_user_id = profiles.user_id
  where profiles.user_id = target_creator_user_id
  group by profiles.user_id
  on conflict (creator_user_id) do update
  set published_course_count = excluded.published_course_count,
      published_node_count = excluded.published_node_count,
      premium_course_count = excluded.premium_course_count,
      follower_count = excluded.follower_count,
      featured_course_titles = excluded.featured_course_titles,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_creator_public_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_creator_user_id uuid;
  v_old_creator_user_id uuid;
begin
  if TG_TABLE_NAME = 'user_profiles' then
    if TG_OP <> 'DELETE' then
      v_new_creator_user_id := new.user_id;
    end if;
    if TG_OP <> 'INSERT' then
      v_old_creator_user_id := old.user_id;
    end if;
  elsif TG_TABLE_NAME = 'creator_followers' then
    if TG_OP <> 'DELETE' then
      v_new_creator_user_id := new.creator_user_id;
    end if;
    if TG_OP <> 'INSERT' then
      v_old_creator_user_id := old.creator_user_id;
    end if;
  elsif TG_TABLE_NAME = 'courses' then
    if TG_OP <> 'DELETE' then
      v_new_creator_user_id := new.creator_user_id;
    end if;
    if TG_OP <> 'INSERT' then
      v_old_creator_user_id := old.creator_user_id;
    end if;
  elsif TG_TABLE_NAME = 'course_modules' then
    if TG_OP <> 'DELETE' and new.course_id is not null then
      select creator_user_id into v_new_creator_user_id
      from public.courses
      where id = new.course_id;
    end if;

    if TG_OP <> 'INSERT' and old.course_id is not null then
      select creator_user_id into v_old_creator_user_id
      from public.courses
      where id = old.course_id;
    end if;
  elsif TG_TABLE_NAME = 'course_nodes' then
    if TG_OP <> 'DELETE' and new.module_id is not null then
      select courses.creator_user_id into v_new_creator_user_id
      from public.course_modules modules
      join public.courses courses on courses.id = modules.course_id
      where modules.id = new.module_id;
    end if;

    if TG_OP <> 'INSERT' and old.module_id is not null then
      select courses.creator_user_id into v_old_creator_user_id
      from public.course_modules modules
      join public.courses courses on courses.id = modules.course_id
      where modules.id = old.module_id;
    end if;
  end if;

  if v_old_creator_user_id is not null then
    perform public.refresh_creator_public_stats_read_model(v_old_creator_user_id);
  end if;

  if v_new_creator_user_id is not null and v_new_creator_user_id is distinct from v_old_creator_user_id then
    perform public.refresh_creator_public_stats_read_model(v_new_creator_user_id);
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
exception when others then
  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists user_profiles_refresh_creator_public_stats on public.user_profiles;
create trigger user_profiles_refresh_creator_public_stats
after insert or update of full_name, username, bio, profile_photo_url, primary_role, is_banned
on public.user_profiles
for each row execute function public.refresh_creator_public_stats_trigger();

drop trigger if exists creator_followers_refresh_creator_public_stats on public.creator_followers;
create trigger creator_followers_refresh_creator_public_stats
after insert or delete on public.creator_followers
for each row execute function public.refresh_creator_public_stats_trigger();

drop trigger if exists courses_refresh_creator_public_stats on public.courses;
create trigger courses_refresh_creator_public_stats
after insert or update of creator_user_id, title, status, premium_enabled, price_amount, premium_access_days, updated_at or delete
on public.courses
for each row execute function public.refresh_creator_public_stats_trigger();

drop trigger if exists course_modules_refresh_creator_public_stats on public.course_modules;
create trigger course_modules_refresh_creator_public_stats
after insert or update of course_id or delete on public.course_modules
for each row execute function public.refresh_creator_public_stats_trigger();

drop trigger if exists course_nodes_refresh_creator_public_stats on public.course_nodes;
create trigger course_nodes_refresh_creator_public_stats
after insert or update of module_id or delete on public.course_nodes
for each row execute function public.refresh_creator_public_stats_trigger();

alter table public.creator_public_stats_read_model enable row level security;

drop policy if exists "creator_public_stats_read_model_select_all" on public.creator_public_stats_read_model;
create policy "creator_public_stats_read_model_select_all"
on public.creator_public_stats_read_model
for select
to anon, authenticated
using (published_course_count > 0);

grant select on public.creator_public_stats_read_model to anon, authenticated, service_role;

select public.refresh_creator_public_stats_read_model(user_id)
from public.user_profiles
where primary_role = 'creator';
