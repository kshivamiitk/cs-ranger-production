-- V20: persisted creator payout destinations plus admin bulk payout batches.

create table if not exists public.creator_payout_profiles (
  creator_user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  payout_method_snapshot text not null,
  masked_payout_label text not null,
  is_verified boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_payout_batches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('manual_run', 'scheduled_run')),
  status text not null check (status in ('draft', 'running', 'completed', 'partially_failed', 'failed')),
  triggered_by_admin_user_id uuid references public.user_profiles(user_id) on delete set null,
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  currency text not null default 'INR',
  minimum_threshold_snapshot numeric(12,2) not null default 0,
  total_creators_selected integer not null default 0,
  total_amount_selected numeric(12,2) not null default 0,
  total_amount_processed numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_payout_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.creator_payout_batches(id) on delete cascade,
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  creator_name text,
  withdrawal_request_id uuid references public.withdrawal_requests(id) on delete set null,
  eligible_amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null check (status in ('selected', 'pending', 'processed', 'failed', 'skipped')),
  skip_reason text,
  failure_reason text,
  provider_payout_id text,
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists creator_payout_batch_items_batch_idx
  on public.creator_payout_batch_items (batch_id, created_at asc);

create index if not exists creator_payout_batches_created_idx
  on public.creator_payout_batches (created_at desc);

create unique index if not exists creator_payout_batch_items_idempotency_idx
  on public.creator_payout_batch_items (idempotency_key)
  where idempotency_key is not null;

drop trigger if exists creator_payout_profiles_set_updated_at on public.creator_payout_profiles;
create trigger creator_payout_profiles_set_updated_at
before update on public.creator_payout_profiles
for each row execute function public.set_updated_at();

drop trigger if exists creator_payout_batches_set_updated_at on public.creator_payout_batches;
create trigger creator_payout_batches_set_updated_at
before update on public.creator_payout_batches
for each row execute function public.set_updated_at();

drop trigger if exists creator_payout_batch_items_set_updated_at on public.creator_payout_batch_items;
create trigger creator_payout_batch_items_set_updated_at
before update on public.creator_payout_batch_items
for each row execute function public.set_updated_at();

alter table public.creator_payout_profiles enable row level security;
alter table public.creator_payout_batches enable row level security;
alter table public.creator_payout_batch_items enable row level security;

drop policy if exists "creator_payout_profiles_select_related" on public.creator_payout_profiles;
create policy "creator_payout_profiles_select_related"
on public.creator_payout_profiles
for select
to authenticated
using (creator_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "creator_payout_profiles_upsert_owner_or_admin" on public.creator_payout_profiles;
create policy "creator_payout_profiles_upsert_owner_or_admin"
on public.creator_payout_profiles
for all
to authenticated
using (creator_user_id = auth.uid() or public.current_user_is_admin())
with check (creator_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "creator_payout_batches_select_admin" on public.creator_payout_batches;
create policy "creator_payout_batches_select_admin"
on public.creator_payout_batches
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "creator_payout_batches_write_admin" on public.creator_payout_batches;
create policy "creator_payout_batches_write_admin"
on public.creator_payout_batches
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "creator_payout_batch_items_select_admin" on public.creator_payout_batch_items;
create policy "creator_payout_batch_items_select_admin"
on public.creator_payout_batch_items
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "creator_payout_batch_items_write_admin" on public.creator_payout_batch_items;
create policy "creator_payout_batch_items_write_admin"
on public.creator_payout_batch_items
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());


