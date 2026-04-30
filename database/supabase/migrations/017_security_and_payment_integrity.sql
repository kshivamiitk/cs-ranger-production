-- Harden learner-side write policies and payment ledger idempotency.
-- Keeps progress/bookmark rows aligned with actual course/node visibility.

create or replace function public.can_track_course_node(
  target_course_id uuid,
  target_node_id uuid
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
    where nodes.id = target_node_id
      and courses.id = target_course_id
      and not public.current_user_is_banned()
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

create or replace function public.can_add_course_to_wishlist(
  target_course_id uuid
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
    where courses.id = target_course_id
      and courses.status = 'published'
      and not public.current_user_is_banned()
      and courses.creator_user_id <> auth.uid()
  );
$$;

grant execute on function public.can_track_course_node(uuid, uuid) to authenticated;
grant execute on function public.can_add_course_to_wishlist(uuid) to authenticated;

-- Deduplicate older rows before enforcing idempotency on payment/payout ledger entries.
delete from public.creator_balance_ledger ledger
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by reference_type, reference_id, entry_type
        order by created_at asc, id asc
      ) as duplicate_rank
    from public.creator_balance_ledger
  ) ranked
  where ranked.duplicate_rank > 1
) duplicates
where ledger.id = duplicates.id;

create unique index if not exists creator_balance_ledger_reference_entry_idx
  on public.creator_balance_ledger (reference_type, reference_id, entry_type);

drop policy if exists "learner_node_progress_insert_own" on public.learner_node_progress;
create policy "learner_node_progress_insert_own"
on public.learner_node_progress
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);

drop policy if exists "learner_node_progress_update_own" on public.learner_node_progress;
create policy "learner_node_progress_update_own"
on public.learner_node_progress
for update
to authenticated
using (learner_user_id = auth.uid())
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);

drop policy if exists "learner_last_visited_nodes_insert_own" on public.learner_last_visited_nodes;
create policy "learner_last_visited_nodes_insert_own"
on public.learner_last_visited_nodes
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);

drop policy if exists "learner_last_visited_nodes_update_own" on public.learner_last_visited_nodes;
create policy "learner_last_visited_nodes_update_own"
on public.learner_last_visited_nodes
for update
to authenticated
using (learner_user_id = auth.uid())
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);

drop policy if exists "course_wishlist_entries_insert_own" on public.course_wishlist_entries;
create policy "course_wishlist_entries_insert_own"
on public.course_wishlist_entries
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_add_course_to_wishlist(course_id)
);

drop policy if exists "node_bookmark_entries_insert_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_insert_own"
on public.node_bookmark_entries
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);

drop policy if exists "node_bookmark_entries_update_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_update_own"
on public.node_bookmark_entries
for update
to authenticated
using (learner_user_id = auth.uid())
with check (
  learner_user_id = auth.uid()
  and public.can_track_course_node(course_id, node_id)
);


