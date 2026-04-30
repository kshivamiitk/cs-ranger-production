-- 030_v21_scaling_foundation.sql
-- CS-Ranger v21 scaling foundation.
-- Safe additive migration for API-scale readiness.

create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  owner_user_id uuid references public.user_profiles(user_id) on delete set null,
  operation text not null,
  request_hash text,
  response_payload jsonb,
  status text not null default 'started',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key, operation),
  check (status in ('started', 'completed', 'failed'))
);

create index if not exists api_idempotency_keys_owner_idx
  on public.api_idempotency_keys (owner_user_id, created_at desc);

create index if not exists api_idempotency_keys_expiry_idx
  on public.api_idempotency_keys (expires_at);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (attempts >= 0),
  check (status in ('pending', 'processing', 'processed', 'failed'))
);

create index if not exists outbox_events_worker_idx
  on public.outbox_events (status, available_at, created_at);

create table if not exists public.course_card_read_model (
  course_id uuid primary key references public.courses(id) on delete cascade,
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  title text not null,
  slug text not null,
  description text not null,
  image_url text,
  course_domain_id uuid,
  creator_name text,
  creator_avatar_url text,
  rating_average numeric(4,2) not null default 0,
  rating_count integer not null default 0,
  minimum_price_amount numeric(12,2) not null default 0,
  premium_enabled boolean not null default false,
  status public.course_status not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists course_card_read_model_status_idx
  on public.course_card_read_model (status, updated_at desc);

create index if not exists course_card_read_model_creator_idx
  on public.course_card_read_model (creator_user_id, updated_at desc);

create table if not exists public.learner_dashboard_summary (
  learner_user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  enrolled_course_count integer not null default 0,
  active_entitlement_count integer not null default 0,
  completed_node_count integer not null default 0,
  certificate_count integer not null default 0,
  unseen_notification_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_dashboard_summary (
  creator_user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  published_course_count integer not null default 0,
  draft_course_count integer not null default 0,
  learner_count integer not null default 0,
  unresolved_doubt_count integer not null default 0,
  gross_revenue_amount numeric(12,2) not null default 0,
  available_balance_amount numeric(12,2) not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_attempts_course_submitted_idx
  on public.quiz_attempts (course_id, submitted_at desc);

create index if not exists course_purchases_learner_course_status_idx
  on public.course_purchases (learner_user_id, course_id, payment_status, created_at desc);

create index if not exists course_entitlements_active_lookup_idx
  on public.course_entitlements (learner_user_id, course_id, status, expires_at desc);

create index if not exists node_discussion_comments_thread_status_idx
  on public.node_discussion_comments (thread_id, status, created_at desc);

create index if not exists course_reviews_course_created_idx
  on public.course_reviews (course_id, created_at desc);

alter table public.api_idempotency_keys enable row level security;
alter table public.outbox_events enable row level security;
alter table public.course_card_read_model enable row level security;
alter table public.learner_dashboard_summary enable row level security;
alter table public.creator_dashboard_summary enable row level security;

drop policy if exists "course_card_read_model_select_all" on public.course_card_read_model;
create policy "course_card_read_model_select_all"
on public.course_card_read_model
for select
to authenticated, anon
using (status = 'published' or creator_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "learner_dashboard_summary_select_own_or_admin" on public.learner_dashboard_summary;
create policy "learner_dashboard_summary_select_own_or_admin"
on public.learner_dashboard_summary
for select
to authenticated
using (learner_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "creator_dashboard_summary_select_own_or_admin" on public.creator_dashboard_summary;
create policy "creator_dashboard_summary_select_own_or_admin"
on public.creator_dashboard_summary
for select
to authenticated
using (creator_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "api_idempotency_keys_service_only" on public.api_idempotency_keys;
create policy "api_idempotency_keys_service_only"
on public.api_idempotency_keys
for all
to service_role
using (true)
with check (true);

drop policy if exists "outbox_events_service_only" on public.outbox_events;
create policy "outbox_events_service_only"
on public.outbox_events
for all
to service_role
using (true)
with check (true);



