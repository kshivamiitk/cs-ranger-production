-- Learner progress, continue-learning state, and wishlist support.
-- Keeps progress and wishlist logic in rebuilt apps/web architecture.

create table if not exists public.learner_node_progress (
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  node_id uuid not null references public.course_nodes(id) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (learner_user_id, node_id)
);

create table if not exists public.learner_last_visited_nodes (
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  node_id uuid not null references public.course_nodes(id) on delete cascade,
  visited_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (learner_user_id, course_id)
);

create table if not exists public.course_wishlist_entries (
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, learner_user_id)
);

create index if not exists learner_node_progress_learner_course_idx
  on public.learner_node_progress (learner_user_id, course_id);
create index if not exists learner_node_progress_course_module_idx
  on public.learner_node_progress (course_id, module_id);
create index if not exists learner_last_visited_nodes_learner_idx
  on public.learner_last_visited_nodes (learner_user_id, visited_at desc);
create index if not exists learner_last_visited_nodes_node_idx
  on public.learner_last_visited_nodes (node_id);
create index if not exists course_wishlist_entries_learner_idx
  on public.course_wishlist_entries (learner_user_id, created_at desc);
create index if not exists course_wishlist_entries_course_idx
  on public.course_wishlist_entries (course_id, created_at desc);

create index if not exists courses_title_lower_idx
  on public.courses (lower(title));
create index if not exists courses_description_lower_idx
  on public.courses (lower(description));
create index if not exists user_profiles_full_name_lower_idx
  on public.user_profiles (lower(full_name));
create index if not exists user_profiles_bio_lower_idx
  on public.user_profiles (lower(bio));

drop trigger if exists learner_node_progress_set_updated_at on public.learner_node_progress;
create trigger learner_node_progress_set_updated_at
before update on public.learner_node_progress
for each row execute function public.set_updated_at();

drop trigger if exists learner_last_visited_nodes_set_updated_at on public.learner_last_visited_nodes;
create trigger learner_last_visited_nodes_set_updated_at
before update on public.learner_last_visited_nodes
for each row execute function public.set_updated_at();

alter table public.learner_node_progress enable row level security;
alter table public.learner_last_visited_nodes enable row level security;
alter table public.course_wishlist_entries enable row level security;

drop policy if exists "learner_node_progress_select_own" on public.learner_node_progress;
create policy "learner_node_progress_select_own"
on public.learner_node_progress
for select
to authenticated
using (learner_user_id = auth.uid());

drop policy if exists "learner_node_progress_insert_own" on public.learner_node_progress;
create policy "learner_node_progress_insert_own"
on public.learner_node_progress
for insert
to authenticated
with check (learner_user_id = auth.uid());

drop policy if exists "learner_node_progress_update_own" on public.learner_node_progress;
create policy "learner_node_progress_update_own"
on public.learner_node_progress
for update
to authenticated
using (learner_user_id = auth.uid())
with check (learner_user_id = auth.uid());

drop policy if exists "learner_node_progress_delete_own" on public.learner_node_progress;
create policy "learner_node_progress_delete_own"
on public.learner_node_progress
for delete
to authenticated
using (learner_user_id = auth.uid());

drop policy if exists "learner_last_visited_nodes_select_own" on public.learner_last_visited_nodes;
create policy "learner_last_visited_nodes_select_own"
on public.learner_last_visited_nodes
for select
to authenticated
using (learner_user_id = auth.uid());

drop policy if exists "learner_last_visited_nodes_insert_own" on public.learner_last_visited_nodes;
create policy "learner_last_visited_nodes_insert_own"
on public.learner_last_visited_nodes
for insert
to authenticated
with check (learner_user_id = auth.uid());

drop policy if exists "learner_last_visited_nodes_update_own" on public.learner_last_visited_nodes;
create policy "learner_last_visited_nodes_update_own"
on public.learner_last_visited_nodes
for update
to authenticated
using (learner_user_id = auth.uid())
with check (learner_user_id = auth.uid());

drop policy if exists "course_wishlist_entries_select_own" on public.course_wishlist_entries;
create policy "course_wishlist_entries_select_own"
on public.course_wishlist_entries
for select
to authenticated
using (learner_user_id = auth.uid());

drop policy if exists "course_wishlist_entries_insert_own" on public.course_wishlist_entries;
create policy "course_wishlist_entries_insert_own"
on public.course_wishlist_entries
for insert
to authenticated
with check (learner_user_id = auth.uid());

drop policy if exists "course_wishlist_entries_delete_own" on public.course_wishlist_entries;
create policy "course_wishlist_entries_delete_own"
on public.course_wishlist_entries
for delete
to authenticated
using (learner_user_id = auth.uid());


