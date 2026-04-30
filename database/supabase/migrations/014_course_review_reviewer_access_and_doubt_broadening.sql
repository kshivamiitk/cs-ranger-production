-- Broaden course reviews to authenticated reviewers with actual course access.
-- Broaden creator doubts to any top-level comment tagged as doubt, regardless of commenter role.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_reviews'
      and column_name = 'learner_user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_reviews'
      and column_name = 'reviewer_user_id'
  ) then
    alter table public.course_reviews
      rename column learner_user_id to reviewer_user_id;
  end if;
end;
$$;

alter table public.course_reviews
  drop constraint if exists course_reviews_course_id_learner_user_id_key;

alter table public.course_reviews
  drop constraint if exists course_reviews_course_id_reviewer_user_id_key;

alter table public.course_reviews
  add constraint course_reviews_course_id_reviewer_user_id_key
  unique (course_id, reviewer_user_id);

drop index if exists public.course_reviews_learner_created_idx;

create index if not exists course_reviews_reviewer_created_idx
  on public.course_reviews (reviewer_user_id, created_at desc);

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
      and courses.status = 'published'
      and not actor.is_banned
      and courses.creator_user_id <> target_user_id
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
  );
$$;

drop policy if exists "course_reviews_insert_own" on public.course_reviews;
create policy "course_reviews_insert_own"
on public.course_reviews
for insert
to authenticated
with check (
  reviewer_user_id = auth.uid()
  and not public.current_user_is_banned()
  and public.can_user_review_course(course_id, auth.uid())
);

drop policy if exists "course_reviews_update_own" on public.course_reviews;
create policy "course_reviews_update_own"
on public.course_reviews
for update
to authenticated
using (reviewer_user_id = auth.uid())
with check (reviewer_user_id = auth.uid());

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
    authors.full_name as learner_name,
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
  join public.user_profiles authors on authors.user_id = comments.author_user_id
  where threads.creator_user_id = p_creator_user_id
    and comments.comment_tag = 'doubt'
    and comments.parent_comment_id is null
    and comments.status = 'open'
    and not comments.is_deleted
  order by threads.last_activity_at desc, comments.created_at desc;
$$;

grant execute on function public.can_user_review_course(uuid, uuid) to authenticated;
grant execute on function public.list_creator_learner_doubts(uuid) to authenticated;


