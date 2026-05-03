-- v23: backend hardening, audience-aware broadcast RLS, and payment idempotency guardrails.
-- Safe to run repeatedly after the existing baseline migrations.

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_type text,
  provider_order_id text,
  provider_payment_id text,
  provider_payout_id text,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, event_key)
);

create index if not exists payment_webhook_events_provider_processed_idx
  on public.payment_webhook_events (provider, processed_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "payment_webhook_events_service_role_only" on public.payment_webhook_events;
create policy "payment_webhook_events_service_role_only"
on public.payment_webhook_events
for all
to service_role
using (true)
with check (true);

grant all on public.payment_webhook_events to service_role;

create unique index if not exists course_purchases_provider_order_id_non_null_key
  on public.course_purchases (provider_order_id)
  where provider_order_id is not null;

create unique index if not exists course_purchases_provider_payment_id_non_null_key
  on public.course_purchases (provider_payment_id)
  where provider_payment_id is not null;

drop policy if exists "admin_broadcasts_select_all" on public.admin_broadcasts;
drop policy if exists "admin_broadcasts_select_audience" on public.admin_broadcasts;
create policy "admin_broadcasts_select_audience"
on public.admin_broadcasts
for select
to anon, authenticated
using (
  is_active = true
  and (
    audience = 'all'
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.user_profiles profiles
        where profiles.user_id = auth.uid()
          and profiles.is_banned = false
          and (
            (audience = 'learners' and profiles.primary_role = 'learner')
            or (audience = 'creators' and profiles.primary_role = 'creator')
            or (audience = 'admins' and profiles.is_admin = true)
          )
      )
    )
  )
);

drop policy if exists "admin_broadcasts_write_admin" on public.admin_broadcasts;
create policy "admin_broadcasts_write_admin"
on public.admin_broadcasts
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create or replace function public.assert_backend_hardening_policies()
returns void
language plpgsql
stable
as $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_broadcasts'
      and policyname = 'admin_broadcasts_select_audience'
  ) then
    raise exception 'Missing audience-aware admin_broadcasts select policy.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'course_purchases'
      and indexname = 'course_purchases_provider_payment_id_non_null_key'
  ) then
    raise exception 'Missing non-null provider payment id uniqueness guard.';
  end if;
end;
$$;

select public.assert_backend_hardening_policies();
