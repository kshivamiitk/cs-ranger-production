-- Node-level discussions and course-level ratings/reviews.
-- Keeps discussion/review models separate from admin message flows.

create table if not exists public.node_discussion_threads (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  node_id uuid not null unique references public.course_nodes(id) on delete cascade,
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  is_open boolean not null default true,
  unresolved_count integer not null default 0,
  last_activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (unresolved_count >= 0)
);

create table if not exists public.node_discussion_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.node_discussion_threads(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  node_id uuid not null references public.course_nodes(id) on delete cascade,
  author_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  parent_comment_id uuid references public.node_discussion_comments(id) on delete cascade,
  root_comment_id uuid not null references public.node_discussion_comments(id) on delete cascade,
  body text not null,
  depth integer not null default 0,
  reply_count integer not null default 0,
  like_count integer not null default 0,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  status text not null default 'open',
  resolved_by_user_id uuid references public.user_profiles(user_id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (depth >= 0),
  check (reply_count >= 0),
  check (like_count >= 0),
  check (status in ('open', 'resolved')),
  check (
    (parent_comment_id is null and depth = 0 and root_comment_id = id)
    or (parent_comment_id is not null and depth > 0)
  )
);

create table if not exists public.node_comment_likes (
  comment_id uuid not null references public.node_discussion_comments(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, user_id)
);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (course_id, learner_user_id)
);

create index if not exists node_discussion_threads_course_activity_idx
  on public.node_discussion_threads (course_id, last_activity_at desc);
create index if not exists node_discussion_threads_creator_activity_idx
  on public.node_discussion_threads (creator_user_id, last_activity_at desc);
create index if not exists node_discussion_comments_node_created_idx
  on public.node_discussion_comments (node_id, created_at asc);
create index if not exists node_discussion_comments_root_created_idx
  on public.node_discussion_comments (root_comment_id, created_at asc);
create index if not exists node_discussion_comments_author_created_idx
  on public.node_discussion_comments (author_user_id, created_at desc);
create index if not exists node_discussion_comments_status_created_idx
  on public.node_discussion_comments (status, created_at desc);
create index if not exists course_reviews_course_created_idx
  on public.course_reviews (course_id, created_at desc);
create index if not exists course_reviews_learner_created_idx
  on public.course_reviews (learner_user_id, created_at desc);

drop trigger if exists node_discussion_threads_set_updated_at on public.node_discussion_threads;
create trigger node_discussion_threads_set_updated_at
before update on public.node_discussion_threads
for each row execute function public.set_updated_at();

drop trigger if exists node_discussion_comments_set_updated_at on public.node_discussion_comments;
create trigger node_discussion_comments_set_updated_at
before update on public.node_discussion_comments
for each row execute function public.set_updated_at();

drop trigger if exists course_reviews_set_updated_at on public.course_reviews;
create trigger course_reviews_set_updated_at
before update on public.course_reviews
for each row execute function public.set_updated_at();

create or replace function public.can_view_node_discussion(target_node_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_nodes nodes
    join public.course_modules modules on modules.id = nodes.module_id
    join public.courses courses on courses.id = modules.course_id
    where nodes.id = target_node_id
      and (
        public.current_user_is_admin()
        or courses.creator_user_id = auth.uid()
        or (
          courses.status = 'published'
          and (
            not nodes.is_premium
            or public.can_access_course_content(courses.id)
          )
        )
      )
  );
$$;

create or replace function public.can_user_comment_on_node(
  target_node_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_nodes nodes
    join public.course_modules modules on modules.id = nodes.module_id
    join public.courses courses on courses.id = modules.course_id
    join public.user_profiles actor on actor.user_id = target_user_id
    where nodes.id = target_node_id
      and not actor.is_banned
      and (
        actor.is_admin
        or courses.creator_user_id = target_user_id
        or (
          courses.status = 'published'
          and (
            not nodes.is_premium
            or exists (
              select 1
              from public.course_entitlements entitlements
              where entitlements.course_id = courses.id
                and entitlements.learner_user_id = target_user_id
                and entitlements.status = 'active'
                and entitlements.expires_at > timezone('utc', now())
            )
          )
        )
      )
  );
$$;

create or replace function public.can_user_review_course(
  target_course_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses courses
    join public.user_profiles actor on actor.user_id = target_user_id
    where courses.id = target_course_id
      and not actor.is_banned
      and actor.primary_role = 'learner'
      and (
        actor.is_admin
        or courses.creator_user_id = target_user_id
        or (
          courses.status = 'published'
          and (
            not courses.premium_enabled
            or courses.price_amount <= 0
            or courses.premium_access_days is null
            or exists (
              select 1
              from public.course_entitlements entitlements
              where entitlements.course_id = courses.id
                and entitlements.learner_user_id = target_user_id
                and entitlements.status = 'active'
                and entitlements.expires_at > timezone('utc', now())
            )
          )
        )
      )
  );
$$;

create or replace function public.refresh_node_discussion_thread_summary(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unresolved integer := 0;
  v_last_activity timestamptz := timezone('utc', now());
begin
  select count(*)
  into v_unresolved
  from public.node_discussion_comments comments
  join public.course_nodes nodes on nodes.id = comments.node_id
  where comments.thread_id = target_thread_id
    and comments.parent_comment_id is null
    and comments.status = 'open'
    and not comments.is_deleted
    and nodes.type = 'question';

  select coalesce(max(greatest(comments.created_at, comments.updated_at)), timezone('utc', now()))
  into v_last_activity
  from public.node_discussion_comments comments
  where comments.thread_id = target_thread_id;

  update public.node_discussion_threads threads
  set unresolved_count = coalesce(v_unresolved, 0),
      last_activity_at = coalesce(v_last_activity, threads.last_activity_at),
      updated_at = timezone('utc', now())
  where threads.id = target_thread_id;
end;
$$;

create or replace function public.get_or_create_node_discussion_thread(target_node_id uuid)
returns public.node_discussion_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node public.course_nodes%rowtype;
  v_module public.course_modules%rowtype;
  v_course public.courses%rowtype;
  v_thread public.node_discussion_threads%rowtype;
begin
  select * into v_node
  from public.course_nodes
  where id = target_node_id;

  if not found then
    raise exception 'Node not found.';
  end if;

  select * into v_module
  from public.course_modules
  where id = v_node.module_id;

  if not found then
    raise exception 'Module not found.';
  end if;

  select * into v_course
  from public.courses
  where id = v_module.course_id;

  if not found then
    raise exception 'Course not found.';
  end if;

  insert into public.node_discussion_threads (
    course_id,
    node_id,
    creator_user_id,
    is_open,
    unresolved_count,
    last_activity_at
  )
  values (
    v_course.id,
    v_node.id,
    v_course.creator_user_id,
    true,
    0,
    timezone('utc', now())
  )
  on conflict (node_id) do update
  set course_id = excluded.course_id,
      creator_user_id = excluded.creator_user_id,
      updated_at = timezone('utc', now())
  returning * into v_thread;

  return v_thread;
end;
$$;

create or replace function public.apply_node_comment_like_count(target_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  select count(*) into v_count
  from public.node_comment_likes
  where comment_id = target_comment_id;

  update public.node_discussion_comments
  set like_count = coalesce(v_count, 0)
  where id = target_comment_id;
end;
$$;

create or replace function public.node_comment_likes_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_node_comment_like_count(coalesce(new.comment_id, old.comment_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists node_comment_likes_after_change on public.node_comment_likes;
create trigger node_comment_likes_after_change
after insert or delete on public.node_comment_likes
for each row execute function public.node_comment_likes_after_change();

create or replace function public.node_discussion_comments_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.parent_comment_id is not null then
    update public.node_discussion_comments
    set reply_count = reply_count + 1
    where id = new.parent_comment_id;
  elsif tg_op = 'DELETE' and old.parent_comment_id is not null then
    update public.node_discussion_comments
    set reply_count = greatest(reply_count - 1, 0)
    where id = old.parent_comment_id;
  end if;

  perform public.refresh_node_discussion_thread_summary(coalesce(new.thread_id, old.thread_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists node_discussion_comments_after_change on public.node_discussion_comments;
create trigger node_discussion_comments_after_change
after insert or update or delete on public.node_discussion_comments
for each row execute function public.node_discussion_comments_after_change();

create or replace function public.guard_node_discussion_comment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if public.current_user_is_admin() then
    return new;
  end if;

  if old.author_user_id = auth.uid() then
    if old.is_deleted and new.body is distinct from old.body then
      raise exception 'Deleted comments cannot be edited.';
    end if;

    if new.status is distinct from old.status
      or new.resolved_by_user_id is distinct from old.resolved_by_user_id
      or new.resolved_at is distinct from old.resolved_at
    then
      raise exception 'Only the creator can resolve or reopen doubts.';
    end if;

    if new.body is distinct from old.body then
      new.is_edited := true;
    end if;

    return new;
  end if;

  if exists (
    select 1
    from public.node_discussion_threads threads
    where threads.id = old.thread_id
      and threads.creator_user_id = auth.uid()
  ) then
    if old.parent_comment_id is not null then
      raise exception 'Only top-level comments can be resolved.';
    end if;

    if not exists (
      select 1
      from public.course_nodes nodes
      where nodes.id = old.node_id
        and nodes.type = 'question'
    ) then
      raise exception 'Only question-node comments can be resolved.';
    end if;

    if new.body is distinct from old.body
      or new.is_deleted is distinct from old.is_deleted
      or new.is_edited is distinct from old.is_edited
      or new.author_user_id is distinct from old.author_user_id
      or new.parent_comment_id is distinct from old.parent_comment_id
      or new.root_comment_id is distinct from old.root_comment_id
      or new.depth is distinct from old.depth
    then
      raise exception 'Creators can only resolve or reopen doubts.';
    end if;

    return new;
  end if;

  raise exception 'You cannot update this comment.';
end;
$$;

drop trigger if exists node_discussion_comments_guard_update on public.node_discussion_comments;
create trigger node_discussion_comments_guard_update
before update on public.node_discussion_comments
for each row execute function public.guard_node_discussion_comment_update();

create or replace function public.list_creator_learner_doubts(p_creator_user_id uuid)
returns table (
  comment_id uuid,
  thread_id uuid,
  course_id uuid,
  course_title text,
  course_creator_user_id uuid,
  node_id uuid,
  node_title text,
  node_type text,
  learner_user_id uuid,
  learner_name text,
  parent_comment_id uuid,
  status text,
  is_deleted boolean,
  comment_body text,
  last_activity_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    comments.id as comment_id,
    comments.thread_id,
    comments.course_id,
    courses.title as course_title,
    courses.creator_user_id as course_creator_user_id,
    comments.node_id,
    nodes.title as node_title,
    nodes.type as node_type,
    comments.author_user_id as learner_user_id,
    learners.full_name as learner_name,
    comments.parent_comment_id,
    comments.status,
    comments.is_deleted,
    comments.body as comment_body,
    threads.last_activity_at,
    comments.created_at
  from public.node_discussion_comments comments
  join public.node_discussion_threads threads on threads.id = comments.thread_id
  join public.course_nodes nodes on nodes.id = comments.node_id
  join public.courses courses on courses.id = comments.course_id
  join public.user_profiles learners on learners.user_id = comments.author_user_id
  where threads.creator_user_id = p_creator_user_id
    and comments.parent_comment_id is null
    and comments.status = 'open'
    and not comments.is_deleted
    and nodes.type = 'question'
    and learners.primary_role = 'learner'
  order by threads.last_activity_at desc, comments.created_at desc;
$$;

alter table public.node_discussion_threads enable row level security;
alter table public.node_discussion_comments enable row level security;
alter table public.node_comment_likes enable row level security;
alter table public.course_reviews enable row level security;

drop policy if exists "node_discussion_threads_select_visible" on public.node_discussion_threads;
create policy "node_discussion_threads_select_visible"
on public.node_discussion_threads
for select
to authenticated, anon
using (public.can_view_node_discussion(node_id));

drop policy if exists "node_discussion_comments_select_visible" on public.node_discussion_comments;
create policy "node_discussion_comments_select_visible"
on public.node_discussion_comments
for select
to authenticated, anon
using (public.can_view_node_discussion(node_id));

drop policy if exists "node_discussion_comments_insert_visible" on public.node_discussion_comments;
create policy "node_discussion_comments_insert_visible"
on public.node_discussion_comments
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and not public.current_user_is_banned()
  and public.can_user_comment_on_node(node_id, auth.uid())
);

drop policy if exists "node_discussion_comments_update_author_or_creator" on public.node_discussion_comments;
create policy "node_discussion_comments_update_author_or_creator"
on public.node_discussion_comments
for update
to authenticated
using (
  author_user_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.node_discussion_threads threads
    where threads.id = thread_id
      and threads.creator_user_id = auth.uid()
  )
)
with check (
  author_user_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.node_discussion_threads threads
    where threads.id = thread_id
      and threads.creator_user_id = auth.uid()
  )
);

drop policy if exists "node_comment_likes_select_visible" on public.node_comment_likes;
create policy "node_comment_likes_select_visible"
on public.node_comment_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.node_discussion_comments comments
    where comments.id = comment_id
      and public.can_view_node_discussion(comments.node_id)
  )
);

drop policy if exists "node_comment_likes_insert_own" on public.node_comment_likes;
create policy "node_comment_likes_insert_own"
on public.node_comment_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and not public.current_user_is_banned()
  and exists (
    select 1
    from public.node_discussion_comments comments
    where comments.id = comment_id
      and public.can_view_node_discussion(comments.node_id)
  )
);

drop policy if exists "node_comment_likes_delete_own" on public.node_comment_likes;
create policy "node_comment_likes_delete_own"
on public.node_comment_likes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "course_reviews_select_visible" on public.course_reviews;
create policy "course_reviews_select_visible"
on public.course_reviews
for select
to authenticated, anon
using (
  not is_deleted
  and exists (
    select 1
    from public.courses courses
    where courses.id = course_id
      and (
        courses.status = 'published'
        or courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

drop policy if exists "course_reviews_insert_own" on public.course_reviews;
create policy "course_reviews_insert_own"
on public.course_reviews
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and not public.current_user_is_banned()
  and public.can_user_review_course(course_id, auth.uid())
);

drop policy if exists "course_reviews_update_own" on public.course_reviews;
create policy "course_reviews_update_own"
on public.course_reviews
for update
to authenticated
using (learner_user_id = auth.uid())
with check (learner_user_id = auth.uid());

grant execute on function public.can_view_node_discussion(uuid) to authenticated, anon;
grant execute on function public.can_user_comment_on_node(uuid, uuid) to authenticated;
grant execute on function public.can_user_review_course(uuid, uuid) to authenticated;
grant execute on function public.refresh_node_discussion_thread_summary(uuid) to authenticated;
grant execute on function public.get_or_create_node_discussion_thread(uuid) to authenticated;
grant execute on function public.apply_node_comment_like_count(uuid) to authenticated;
grant execute on function public.list_creator_learner_doubts(uuid) to authenticated;


