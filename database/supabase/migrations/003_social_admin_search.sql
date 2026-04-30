alter table public.user_profiles
  add column if not exists profile_photo_url text,
  add column if not exists bio text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_banned boolean not null default false;

create table if not exists public.creator_followers (
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  follower_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (creator_user_id, follower_user_id),
  check (creator_user_id <> follower_user_id)
);

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  sender_role public.user_role not null,
  subject text,
  message text not null,
  message_type text not null,
  target_user_id uuid references public.user_profiles(user_id) on delete set null,
  status text not null default 'open',
  reviewed_by_admin_user_id uuid references public.user_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  target_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  source_message_id uuid references public.admin_messages(id) on delete set null,
  action_type text not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists creator_followers_creator_idx on public.creator_followers (creator_user_id, created_at desc);
create index if not exists creator_followers_follower_idx on public.creator_followers (follower_user_id, created_at desc);
create index if not exists admin_messages_sender_idx on public.admin_messages (sender_user_id, created_at desc);
create index if not exists admin_messages_status_idx on public.admin_messages (status, created_at desc);
create index if not exists admin_messages_target_idx on public.admin_messages (target_user_id, created_at desc);
create index if not exists admin_moderation_actions_target_idx on public.admin_moderation_actions (target_user_id, created_at desc);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_admin
    from public.user_profiles
    where user_id = auth.uid()
  ), false);
$$;

create or replace function public.current_user_is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_banned
    from public.user_profiles
    where user_id = auth.uid()
  ), false);
$$;

create or replace function public.can_access_course_content(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses
    where id = target_course_id
      and not public.current_user_is_banned()
      and (
        creator_user_id = auth.uid()
        or (
          status = 'published'
          and (
            price_amount = 0
            or exists (
              select 1
              from public.course_purchases
              where course_id = target_course_id
                and learner_user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

create or replace function public.guard_user_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if public.current_user_is_admin() then
    return new;
  end if;

  if auth.uid() <> old.user_id then
    raise exception 'You cannot update another user profile.';
  end if;

  if new.primary_role is distinct from old.primary_role
     or new.is_admin is distinct from old.is_admin
     or new.is_banned is distinct from old.is_banned
     or new.user_id is distinct from old.user_id then
    raise exception 'Only admins can change restricted profile fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists user_profiles_guard_update on public.user_profiles;
create trigger user_profiles_guard_update
before update on public.user_profiles
for each row execute function public.guard_user_profile_update();

drop trigger if exists admin_messages_set_updated_at on public.admin_messages;
create trigger admin_messages_set_updated_at
before update on public.admin_messages
for each row execute function public.set_updated_at();

alter table public.creator_followers enable row level security;
alter table public.admin_messages enable row level security;
alter table public.admin_moderation_actions enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
drop policy if exists "profiles_select_own_or_public_creator_or_admin" on public.user_profiles;
create policy "profiles_select_own_or_public_creator_or_admin"
on public.user_profiles
for select
to authenticated, anon
using (
  auth.uid() = user_id
  or public.current_user_is_admin()
  or (primary_role = 'creator' and is_banned = false)
);

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_admin" on public.user_profiles;
create policy "profiles_update_admin"
on public.user_profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "course_modules_select_visible" on public.course_modules;
create policy "course_modules_select_visible"
on public.course_modules
for select
to authenticated, anon
using (public.can_access_course_content(course_id));

drop policy if exists "course_nodes_select_visible" on public.course_nodes;
create policy "course_nodes_select_visible"
on public.course_nodes
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.course_modules modules
    where modules.id = module_id
      and public.can_access_course_content(modules.course_id)
  )
);

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own"
on public.quiz_attempts
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_access_course_content(course_id)
);

drop policy if exists "creator_followers_select_all" on public.creator_followers;
create policy "creator_followers_select_all"
on public.creator_followers
for select
to authenticated, anon
using (true);

drop policy if exists "creator_followers_insert_own" on public.creator_followers;
create policy "creator_followers_insert_own"
on public.creator_followers
for insert
to authenticated
with check (
  follower_user_id = auth.uid()
  and creator_user_id <> auth.uid()
  and not public.current_user_is_banned()
);

drop policy if exists "creator_followers_delete_own" on public.creator_followers;
create policy "creator_followers_delete_own"
on public.creator_followers
for delete
to authenticated
using (follower_user_id = auth.uid());

drop policy if exists "admin_messages_insert_sender" on public.admin_messages;
create policy "admin_messages_insert_sender"
on public.admin_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and not public.current_user_is_banned()
);

drop policy if exists "admin_messages_select_sender" on public.admin_messages;
create policy "admin_messages_select_sender"
on public.admin_messages
for select
to authenticated
using (sender_user_id = auth.uid());

drop policy if exists "admin_messages_select_admin" on public.admin_messages;
create policy "admin_messages_select_admin"
on public.admin_messages
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "admin_messages_update_admin" on public.admin_messages;
create policy "admin_messages_update_admin"
on public.admin_messages
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admin_moderation_actions_select_admin" on public.admin_moderation_actions;
create policy "admin_moderation_actions_select_admin"
on public.admin_moderation_actions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "admin_moderation_actions_insert_admin" on public.admin_moderation_actions;
create policy "admin_moderation_actions_insert_admin"
on public.admin_moderation_actions
for insert
to authenticated
with check (
  public.current_user_is_admin()
  and admin_user_id = auth.uid()
);

grant execute on function public.can_access_course_content(uuid) to authenticated, anon;


