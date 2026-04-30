-- 032_v22_8_node_runtime_performance_testing.sql
-- CS-Ranger v22.8: scale indexes, PDF/GitHub node types, and testability metadata.
-- Safe additive migration. Run after 031_v22_performance_config_assets.sql.

create extension if not exists pg_trgm;

alter type public.node_type add value if not exists 'pdf';
alter type public.node_type add value if not exists 'github';

alter table if exists public.user_profiles
  add column if not exists github_username text,
  add column if not exists github_profile_url text;

-- User/profile lookup acceleration.
create index if not exists user_profiles_role_admin_banned_idx
  on public.user_profiles (primary_role, is_admin, is_banned, updated_at desc);

create index if not exists user_profiles_username_trgm_idx
  on public.user_profiles using gin (username gin_trgm_ops);

create index if not exists user_profiles_full_name_trgm_idx
  on public.user_profiles using gin (full_name gin_trgm_ops);

create index if not exists user_profiles_github_username_idx
  on public.user_profiles (github_username);

-- Catalog, creator dashboard, and search acceleration.
create index if not exists courses_published_updated_idx
  on public.courses (updated_at desc) where status = 'published';

create index if not exists courses_creator_status_updated_idx
  on public.courses (creator_user_id, status, updated_at desc);

create index if not exists courses_domain_status_updated_idx
  on public.courses (course_domain_id, status, updated_at desc);

create index if not exists courses_title_trgm_idx
  on public.courses using gin (title gin_trgm_ops);

create index if not exists courses_description_trgm_idx
  on public.courses using gin (description gin_trgm_ops);

create index if not exists course_domains_normalized_name_trgm_idx
  on public.course_domains using gin (normalized_name gin_trgm_ops);

-- Course tree and node access acceleration. These are the hot path for learner readers.
create index if not exists course_modules_course_position_cover_idx
  on public.course_modules (course_id, position, id);

create index if not exists course_nodes_module_position_cover_idx
  on public.course_nodes (module_id, position, id);

create index if not exists course_nodes_type_position_idx
  on public.course_nodes (type, position);

create index if not exists course_nodes_module_type_position_idx
  on public.course_nodes (module_id, type, position);

create index if not exists course_nodes_payload_gin_idx
  on public.course_nodes using gin (payload jsonb_path_ops);

-- Learner progress and continue-learning acceleration.
create index if not exists learner_node_progress_learner_course_updated_idx
  on public.learner_node_progress (learner_user_id, course_id, updated_at desc);

create index if not exists learner_node_progress_node_learner_idx
  on public.learner_node_progress (node_id, learner_user_id);

create index if not exists learner_last_visited_nodes_learner_course_updated_idx
  on public.learner_last_visited_nodes (learner_user_id, course_id, updated_at desc);

create index if not exists learner_last_visited_nodes_course_visited_idx
  on public.learner_last_visited_nodes (course_id, visited_at desc);

create index if not exists node_bookmark_entries_learner_course_created_idx
  on public.node_bookmark_entries (learner_user_id, course_id, created_at desc);

-- Purchases, entitlement, and revenue acceleration.
create index if not exists course_purchases_status_created_idx
  on public.course_purchases (payment_status, created_at desc);

create index if not exists course_purchases_creator_status_created_idx
  on public.course_purchases (creator_user_id, payment_status, created_at desc);

create index if not exists course_purchases_provider_order_idx
  on public.course_purchases (payment_provider, provider_order_id);

create index if not exists course_purchases_provider_payment_idx
  on public.course_purchases (payment_provider, provider_payment_id);

create index if not exists course_entitlements_course_status_expiry_idx
  on public.course_entitlements (course_id, status, expires_at desc);

create index if not exists course_entitlements_expiry_idx
  on public.course_entitlements (expires_at) where status = 'active';

create index if not exists creator_balance_ledger_reference_idx
  on public.creator_balance_ledger (reference_type, reference_id);

create index if not exists withdrawal_requests_status_requested_idx
  on public.withdrawal_requests (status, requested_at desc);

-- Discussions, doubts, feed, support, and admin surfaces.
create index if not exists node_discussion_threads_creator_activity_idx
  on public.node_discussion_threads (creator_user_id, is_open, last_activity_at desc);

create index if not exists node_discussion_threads_node_idx
  on public.node_discussion_threads (node_id, last_activity_at desc);

create index if not exists node_discussion_comments_author_created_idx
  on public.node_discussion_comments (author_user_id, created_at desc);

create index if not exists node_discussion_comments_course_status_created_idx
  on public.node_discussion_comments (course_id, status, created_at desc);

create index if not exists node_discussion_comments_root_created_idx
  on public.node_discussion_comments (root_comment_id, created_at asc);

create index if not exists admin_messages_status_created_idx
  on public.admin_messages (status, created_at desc) where is_deleted = false;

create index if not exists admin_messages_sender_created_idx
  on public.admin_messages (sender_user_id, created_at desc) where is_deleted = false;

create index if not exists admin_messages_target_created_idx
  on public.admin_messages (target_user_id, created_at desc) where is_deleted = false;

create index if not exists admin_message_replies_thread_created_idx
  on public.admin_message_replies (thread_id, created_at asc) where is_deleted = false;

create index if not exists admin_broadcasts_audience_active_updated_idx
  on public.admin_broadcasts (audience, is_active, updated_at desc);

create index if not exists learner_feed_event_views_user_seen_idx
  on public.learner_feed_event_views (learner_user_id, seen_at desc);

create index if not exists course_reviews_reviewer_created_idx
  on public.course_reviews (reviewer_user_id, created_at desc) where is_deleted = false;

-- Testing/runtime registry so admins can track load/API smoke-test outputs later.
create table if not exists public.test_run_reports (
  id uuid primary key default gen_random_uuid(),
  run_kind text not null,
  status text not null,
  target_base_url text,
  summary jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (run_kind in ('api_smoke', 'load', 'seed', 'e2e', 'database')),
  check (status in ('started', 'passed', 'failed', 'partial'))
);

create index if not exists test_run_reports_kind_created_idx
  on public.test_run_reports (run_kind, created_at desc);

alter table public.test_run_reports enable row level security;

drop policy if exists "test_run_reports_admin_only" on public.test_run_reports;
create policy "test_run_reports_admin_only"
on public.test_run_reports
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into public.app_runtime_settings (key, value, description)
values
  ('performance', '{"targetP95Ms":250,"targetP99Ms":800,"recommendedPageSize":20,"maxPageSize":100}'::jsonb, 'Default API latency and pagination targets for v22.8.'),
  ('testing', '{"apiSmoke":"npm run test:api:safe","loadTest":"npm run test:load:local","databaseIndexes":"database/supabase/migrations/032_v22_8_node_runtime_performance_testing.sql"}'::jsonb, 'Testing commands and performance check defaults.'),
  ('nodeRuntime', '{"pdfNodes":true,"githubWebsiteNodes":true,"htmlBridge":true}'::jsonb, 'Enabled node runtime capabilities.')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = timezone('utc', now());

