-- Route creator doubts only from comments explicitly tagged as "doubt".
-- Regular comments stay in node discussion but are not added to creator doubt queues.

alter table public.node_discussion_comments
  add column if not exists comment_tag text;

-- Existing guard trigger requires auth.uid() and blocks migration-time backfills.
-- Drop it before backfill and recreate it after replacing the function.
drop trigger if exists node_discussion_comments_guard_update on public.node_discussion_comments;

update public.node_discussion_comments
set comment_tag = 'discussion'
where comment_tag is null;

alter table public.node_discussion_comments
  alter column comment_tag set default 'discussion';

alter table public.node_discussion_comments
  alter column comment_tag set not null;

alter table public.node_discussion_comments
  drop constraint if exists node_discussion_comments_comment_tag_check;

alter table public.node_discussion_comments
  add constraint node_discussion_comments_comment_tag_check
  check (comment_tag in ('discussion', 'doubt'));

alter table public.node_discussion_comments
  drop constraint if exists node_discussion_comments_reply_comment_tag_check;

alter table public.node_discussion_comments
  add constraint node_discussion_comments_reply_comment_tag_check
  check (parent_comment_id is null or comment_tag = 'discussion');

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
  where comments.thread_id = target_thread_id
    and comments.parent_comment_id is null
    and comments.comment_tag = 'doubt'
    and comments.status = 'open'
    and not comments.is_deleted;

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

    if new.comment_tag is distinct from old.comment_tag then
      raise exception 'Comment tag cannot be changed after posting.';
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

    if old.comment_tag <> 'doubt' then
      raise exception 'Only comments tagged as doubt can be resolved.';
    end if;

    if new.body is distinct from old.body
      or new.is_deleted is distinct from old.is_deleted
      or new.is_edited is distinct from old.is_edited
      or new.author_user_id is distinct from old.author_user_id
      or new.parent_comment_id is distinct from old.parent_comment_id
      or new.root_comment_id is distinct from old.root_comment_id
      or new.depth is distinct from old.depth
      or new.comment_tag is distinct from old.comment_tag
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
    and comments.comment_tag = 'doubt'
    and comments.parent_comment_id is null
    and comments.status = 'open'
    and not comments.is_deleted
  order by threads.last_activity_at desc, comments.created_at desc;
$$;

do $$
declare
  v_thread_id uuid;
begin
  for v_thread_id in
    select id from public.node_discussion_threads
  loop
    perform public.refresh_node_discussion_thread_summary(v_thread_id);
  end loop;
end;
$$;

grant execute on function public.refresh_node_discussion_thread_summary(uuid) to authenticated;
grant execute on function public.list_creator_learner_doubts(uuid) to authenticated;


