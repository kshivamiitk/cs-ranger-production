alter table public.courses
  add column if not exists premium_enabled boolean not null default false,
  add column if not exists premium_access_days integer,
  add column if not exists premium_updated_at timestamptz;

alter table public.courses
  drop constraint if exists courses_premium_access_days_check;

alter table public.courses
  add constraint courses_premium_access_days_check
  check (premium_access_days is null or premium_access_days > 0);

update public.courses
set
  premium_enabled = case when price_amount > 0 then true else premium_enabled end,
  premium_access_days = case when price_amount > 0 and premium_access_days is null then 30 else premium_access_days end,
  premium_updated_at = case when price_amount > 0 and premium_updated_at is null then timezone('utc', now()) else premium_updated_at end;

alter table public.course_nodes
  add column if not exists is_premium boolean not null default false,
  add column if not exists excerpt text;

update public.course_nodes
set excerpt = left(title, 220)
where excerpt is null;

alter table public.course_purchases
  drop constraint if exists course_purchases_course_id_learner_user_id_key,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_provider text,
  add column if not exists provider_order_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_signature text,
  add column if not exists paid_at timestamptz,
  add column if not exists access_starts_at timestamptz,
  add column if not exists access_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.course_purchases
set payment_status = 'paid'
where payment_status is null;

update public.course_purchases
set
  paid_at = coalesce(paid_at, created_at),
  access_starts_at = coalesce(access_starts_at, created_at),
  access_expires_at = coalesce(access_expires_at, created_at)
where payment_status = 'paid';

create table if not exists public.course_entitlements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  purchase_id uuid not null references public.course_purchases(id) on delete cascade,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at > starts_at)
);

create index if not exists course_entitlements_course_learner_status_idx
  on public.course_entitlements (course_id, learner_user_id, status, expires_at desc);
create index if not exists course_entitlements_learner_status_idx
  on public.course_entitlements (learner_user_id, status, expires_at desc);

alter table public.platform_settings
  alter column platform_fee_percent set default 20;

update public.platform_settings
set platform_fee_percent = greatest(platform_fee_percent, 20)
where id = 1;

alter table public.platform_settings
  drop constraint if exists platform_settings_platform_fee_percent_check;

alter table public.platform_settings
  add constraint platform_settings_platform_fee_percent_check
  check (platform_fee_percent >= 20);

alter table public.platform_settings
  add column if not exists minimum_withdrawal_amount numeric(12, 2) not null default 500,
  add column if not exists settlement_hold_days integer not null default 0;

alter table public.creator_balance_summaries
  add column if not exists pending_settlement_amount numeric(12, 2) not null default 0;

create unique index if not exists course_purchases_provider_order_id_key
  on public.course_purchases (provider_order_id)
  where provider_order_id is not null;

create unique index if not exists course_purchases_provider_payment_id_key
  on public.course_purchases (provider_payment_id)
  where provider_payment_id is not null;

create index if not exists course_purchases_status_idx
  on public.course_purchases (payment_status, paid_at desc);

create or replace function public.can_access_course_content(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses
    where id = target_course_id
      and not public.current_user_is_banned()
      and (
        public.current_user_is_admin()
        or creator_user_id = auth.uid()
        or (
          status = 'published'
          and (
            not premium_enabled
            or price_amount <= 0
            or premium_access_days is null
            or exists (
              select 1
              from public.course_entitlements entitlements
              where entitlements.course_id = target_course_id
                and entitlements.learner_user_id = auth.uid()
                and entitlements.status = 'active'
                and entitlements.expires_at > timezone('utc', now())
            )
          )
        )
      )
  );
$$;

create or replace function public.refresh_creator_balance_summary(target_creator_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text := 'INR';
  v_hold_days integer := 0;
  v_total numeric(12, 2) := 0;
  v_pending_settlement numeric(12, 2) := 0;
  v_pending_withdrawal numeric(12, 2) := 0;
  v_withdrawn numeric(12, 2) := 0;
  v_available numeric(12, 2) := 0;
begin
  select currency, settlement_hold_days
  into v_currency, v_hold_days
  from public.platform_settings
  where id = 1;

  select coalesce(sum(amount), 0)
  into v_total
  from public.creator_balance_ledger
  where creator_user_id = target_creator_user_id
    and entry_type = 'premium_purchase_credit';

  select coalesce(sum(abs(amount)), 0)
  into v_withdrawn
  from public.creator_balance_ledger
  where creator_user_id = target_creator_user_id
    and entry_type = 'withdrawal_paid';

  select coalesce(sum(amount), 0)
  into v_pending_withdrawal
  from public.withdrawal_requests
  where creator_user_id = target_creator_user_id
    and status in ('pending', 'approved');

  if coalesce(v_hold_days, 0) > 0 then
    select coalesce(sum(creator_net_amount), 0)
    into v_pending_settlement
    from public.course_purchases
    where creator_user_id = target_creator_user_id
      and payment_status = 'paid'
      and paid_at is not null
      and paid_at + make_interval(days => v_hold_days) > timezone('utc', now());
  else
    v_pending_settlement := 0;
  end if;

  v_available := greatest(v_total - v_pending_settlement - v_pending_withdrawal - v_withdrawn, 0);

  insert into public.creator_balance_summaries (
    creator_user_id,
    currency,
    total_earned_amount,
    pending_settlement_amount,
    available_amount,
    withdrawn_amount,
    pending_withdrawal_amount,
    updated_at
  )
  values (
    target_creator_user_id,
    v_currency,
    v_total,
    v_pending_settlement,
    v_available,
    v_withdrawn,
    v_pending_withdrawal,
    timezone('utc', now())
  )
  on conflict (creator_user_id) do update
  set currency = excluded.currency,
      total_earned_amount = excluded.total_earned_amount,
      pending_settlement_amount = excluded.pending_settlement_amount,
      available_amount = excluded.available_amount,
      withdrawn_amount = excluded.withdrawn_amount,
      pending_withdrawal_amount = excluded.pending_withdrawal_amount,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_summary_from_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_creator_balance_summary(coalesce(new.creator_user_id, old.creator_user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists course_purchases_set_updated_at on public.course_purchases;
create trigger course_purchases_set_updated_at
before update on public.course_purchases
for each row execute function public.set_updated_at();

drop trigger if exists course_entitlements_set_updated_at on public.course_entitlements;
create trigger course_entitlements_set_updated_at
before update on public.course_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists course_purchases_refresh_summary on public.course_purchases;
create trigger course_purchases_refresh_summary
after insert or update or delete on public.course_purchases
for each row execute function public.refresh_summary_from_purchase();

create or replace function public.finalize_premium_course_purchase(
  p_purchase_id uuid,
  p_provider_payment_id text,
  p_provider_signature text,
  p_paid_at timestamptz
)
returns table (
  purchase_id uuid,
  entitlement_id uuid,
  purchase_kind text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.course_purchases%rowtype;
  v_course public.courses%rowtype;
  v_existing_entitlement public.course_entitlements%rowtype;
  v_entitlement public.course_entitlements%rowtype;
  v_start timestamptz;
  v_expiry timestamptz;
  v_purchase_kind text := 'initial';
begin
  select *
  into v_purchase
  from public.course_purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'Purchase not found.';
  end if;

  if v_purchase.payment_status = 'paid' then
    select *
    into v_existing_entitlement
    from public.course_entitlements
    where purchase_id = p_purchase_id
    order by created_at desc
    limit 1;

    if not found then
      raise exception 'Purchase already finalized without entitlement.';
    end if;

    return query
    select v_purchase.id, v_existing_entitlement.id,
      case
        when v_purchase.access_starts_at is not null and v_purchase.paid_at is not null and v_purchase.access_starts_at > v_purchase.paid_at then 'renewal'
        else 'initial'
      end;
    return;
  end if;

  if v_purchase.payment_status <> 'pending' then
    raise exception 'Only pending purchases can be finalized.';
  end if;

  if p_provider_payment_id is null or length(trim(p_provider_payment_id)) = 0 then
    raise exception 'Provider payment id is required.';
  end if;

  select *
  into v_course
  from public.courses
  where id = v_purchase.course_id
  for update;

  if not found then
    raise exception 'Course not found.';
  end if;

  if not v_course.premium_enabled or v_course.price_amount <= 0 or v_course.premium_access_days is null then
    raise exception 'Course premium plan is not configured.';
  end if;

  select *
  into v_existing_entitlement
  from public.course_entitlements
  where course_id = v_purchase.course_id
    and learner_user_id = v_purchase.learner_user_id
    and status = 'active'
    and expires_at > coalesce(p_paid_at, timezone('utc', now()))
  order by expires_at desc
  limit 1
  for update;

  if found then
    v_start := v_existing_entitlement.expires_at;
    v_purchase_kind := 'renewal';
  else
    v_start := coalesce(p_paid_at, timezone('utc', now()));
    v_purchase_kind := 'initial';
  end if;

  v_expiry := v_start + make_interval(days => v_course.premium_access_days);

  update public.course_purchases
  set payment_status = 'paid',
      provider_payment_id = p_provider_payment_id,
      provider_signature = p_provider_signature,
      paid_at = coalesce(p_paid_at, timezone('utc', now())),
      access_starts_at = v_start,
      access_expires_at = v_expiry,
      updated_at = timezone('utc', now())
  where id = p_purchase_id
  returning * into v_purchase;

  insert into public.course_entitlements (
    course_id,
    learner_user_id,
    purchase_id,
    starts_at,
    expires_at,
    status
  )
  values (
    v_purchase.course_id,
    v_purchase.learner_user_id,
    v_purchase.id,
    v_start,
    v_expiry,
    'active'
  )
  returning * into v_entitlement;

  insert into public.creator_balance_ledger (
    creator_user_id,
    entry_type,
    amount,
    currency,
    reference_type,
    reference_id
  )
  values (
    v_purchase.creator_user_id,
    'premium_purchase_credit',
    v_purchase.creator_net_amount,
    v_purchase.currency,
    'course_purchase',
    v_purchase.id
  );

  perform public.refresh_creator_balance_summary(v_purchase.creator_user_id);

  return query select v_purchase.id, v_entitlement.id, v_purchase_kind;
end;
$$;

create or replace function public.create_creator_withdrawal_request(
  p_creator_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_payout_method_snapshot text
)
returns setof public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.platform_settings%rowtype;
  v_summary public.creator_balance_summaries%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_profile public.user_profiles%rowtype;
begin
  select * into v_profile
  from public.user_profiles
  where user_id = p_creator_user_id;

  if not found then
    raise exception 'Creator profile not found.';
  end if;

  if v_profile.is_banned then
    raise exception 'Blocked creators cannot request withdrawals.';
  end if;

  select * into v_settings from public.platform_settings where id = 1;

  if p_amount < v_settings.minimum_withdrawal_amount then
    raise exception 'Withdrawal amount is below the minimum threshold.';
  end if;

  perform public.refresh_creator_balance_summary(p_creator_user_id);

  select * into v_summary
  from public.creator_balance_summaries
  where creator_user_id = p_creator_user_id
  for update;

  if not found then
    raise exception 'Creator balance summary not found.';
  end if;

  if p_amount > v_summary.available_amount then
    raise exception 'Insufficient available balance.';
  end if;

  insert into public.withdrawal_requests (
    creator_user_id,
    amount,
    currency,
    payout_method_snapshot,
    status
  ) values (
    p_creator_user_id,
    p_amount,
    coalesce(nullif(p_currency, ''), v_settings.currency),
    p_payout_method_snapshot,
    'pending'
  ) returning * into v_request;

  perform public.refresh_creator_balance_summary(p_creator_user_id);

  return query select * from public.withdrawal_requests where id = v_request.id;
end;
$$;

create or replace function public.update_withdrawal_request_status(
  p_admin_user_id uuid,
  p_withdrawal_request_id uuid,
  p_status text
)
returns setof public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_admin public.user_profiles%rowtype;
begin
  select * into v_admin
  from public.user_profiles
  where user_id = p_admin_user_id;

  if not found or not v_admin.is_admin then
    raise exception 'Admin access is required.';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found.';
  end if;

  if v_request.status = 'paid' then
    return query select * from public.withdrawal_requests where id = v_request.id;
    return;
  end if;

  if p_status not in ('paid', 'rejected') then
    raise exception 'Unsupported withdrawal status.';
  end if;

  update public.withdrawal_requests
  set status = p_status::public.withdrawal_status,
      processed_at = timezone('utc', now())
  where id = v_request.id
  returning * into v_request;

  if p_status = 'paid' then
    insert into public.creator_balance_ledger (
      creator_user_id,
      entry_type,
      amount,
      currency,
      reference_type,
      reference_id
    )
    values (
      v_request.creator_user_id,
      'withdrawal_paid',
      -v_request.amount,
      v_request.currency,
      'withdrawal_request',
      v_request.id
    )
    on conflict do nothing;
  end if;

  perform public.refresh_creator_balance_summary(v_request.creator_user_id);

  return query select * from public.withdrawal_requests where id = v_request.id;
end;
$$;

drop function if exists public.record_course_purchase(uuid, uuid, uuid, numeric, numeric, numeric, text);
drop function if exists public.create_withdrawal_request(uuid, numeric, text, text);

alter table public.course_entitlements enable row level security;

drop policy if exists "course_modules_select_visible" on public.course_modules;
create policy "course_modules_select_visible"
on public.course_modules
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.courses courses
    where courses.id = course_id
      and (courses.status = 'published' or courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
);

drop policy if exists "course_nodes_select_visible" on public.course_nodes;
create policy "course_nodes_select_visible"
on public.course_nodes
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.course_modules modules
    join public.courses courses on courses.id = modules.course_id
    where modules.id = module_id
      and (
        courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
        or (
          courses.status = 'published'
          and (
            not public.course_nodes.is_premium
            or public.can_access_course_content(courses.id)
          )
        )
      )
  )
);

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own"
on public.quiz_attempts
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and exists (
    select 1
    from public.course_nodes nodes
    join public.course_modules modules on modules.id = nodes.module_id
    join public.courses courses on courses.id = modules.course_id
    where nodes.id = node_id
      and courses.id = course_id
      and (
        courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
        or (
          courses.status = 'published'
          and (
            not nodes.is_premium
            or public.can_access_course_content(courses.id)
          )
        )
      )
  )
);

create policy "course_entitlements_select_related"
on public.course_entitlements
for select
to authenticated
using (learner_user_id = auth.uid() or public.current_user_is_admin());

create policy "platform_settings_update_admin"
on public.platform_settings
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "course_purchases_select_admin"
on public.course_purchases
for select
to authenticated
using (public.current_user_is_admin());

create policy "creator_balance_summaries_select_admin"
on public.creator_balance_summaries
for select
to authenticated
using (public.current_user_is_admin());

create policy "withdrawal_requests_select_admin"
on public.withdrawal_requests
for select
to authenticated
using (public.current_user_is_admin());

grant execute on function public.can_access_course_content(uuid) to authenticated, anon;
grant execute on function public.refresh_creator_balance_summary(uuid) to authenticated;
grant execute on function public.finalize_premium_course_purchase(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.create_creator_withdrawal_request(uuid, numeric, text, text) to authenticated;
grant execute on function public.update_withdrawal_request_status(uuid, uuid, text) to authenticated;


