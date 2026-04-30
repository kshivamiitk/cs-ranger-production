-- Support purchase-time premium duration selection (for example 1 month or 3 months).
-- Each purchase stores its chosen access duration and finalization uses that duration.

alter table public.course_purchases
  add column if not exists purchased_access_days integer;

alter table public.course_purchases
  drop constraint if exists course_purchases_purchased_access_days_check;

alter table public.course_purchases
  add constraint course_purchases_purchased_access_days_check
  check (purchased_access_days is null or purchased_access_days > 0);

update public.course_purchases purchases
set purchased_access_days = courses.premium_access_days
from public.courses courses
where purchases.course_id = courses.id
  and purchases.purchased_access_days is null
  and courses.premium_access_days is not null;

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
  v_access_days integer := 0;
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

  if not v_course.premium_enabled or v_course.price_amount <= 0 then
    raise exception 'Course premium plan is not configured.';
  end if;

  v_access_days := coalesce(v_purchase.purchased_access_days, v_course.premium_access_days, 0);
  if v_access_days <= 0 then
    raise exception 'Premium access duration is not configured.';
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

  v_expiry := v_start + make_interval(days => v_access_days);

  update public.course_purchases
  set payment_status = 'paid',
      provider_payment_id = p_provider_payment_id,
      provider_signature = p_provider_signature,
      paid_at = coalesce(p_paid_at, timezone('utc', now())),
      access_starts_at = v_start,
      access_expires_at = v_expiry,
      purchased_access_days = coalesce(v_purchase.purchased_access_days, v_access_days),
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
  )
  on conflict do nothing;

  perform public.refresh_creator_balance_summary(v_purchase.creator_user_id);

  return query
  select v_purchase.id, v_entitlement.id, v_purchase_kind;
end;
$$;


