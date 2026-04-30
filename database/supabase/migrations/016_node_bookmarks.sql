-- Learner node bookmarks for future reading and direct reopen flows.
-- Keeps bookmark state separate from progress and course wishlist state.

create table if not exists public.node_bookmark_entries (
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  node_id uuid not null references public.course_nodes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (learner_user_id, node_id)
);

create index if not exists node_bookmark_entries_learner_idx
  on public.node_bookmark_entries (learner_user_id, created_at desc);

create index if not exists node_bookmark_entries_course_idx
  on public.node_bookmark_entries (course_id, created_at desc);

create index if not exists node_bookmark_entries_node_idx
  on public.node_bookmark_entries (node_id);

drop trigger if exists node_bookmark_entries_set_updated_at on public.node_bookmark_entries;
create trigger node_bookmark_entries_set_updated_at
before update on public.node_bookmark_entries
for each row execute function public.set_updated_at();

alter table public.node_bookmark_entries enable row level security;

drop policy if exists "node_bookmark_entries_select_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_select_own"
on public.node_bookmark_entries
for select
to authenticated
using (learner_user_id = auth.uid());

drop policy if exists "node_bookmark_entries_insert_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_insert_own"
on public.node_bookmark_entries
for insert
to authenticated
with check (learner_user_id = auth.uid());

drop policy if exists "node_bookmark_entries_update_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_update_own"
on public.node_bookmark_entries
for update
to authenticated
using (learner_user_id = auth.uid())
with check (learner_user_id = auth.uid());

drop policy if exists "node_bookmark_entries_delete_own" on public.node_bookmark_entries;
create policy "node_bookmark_entries_delete_own"
on public.node_bookmark_entries
for delete
to authenticated
using (learner_user_id = auth.uid());


