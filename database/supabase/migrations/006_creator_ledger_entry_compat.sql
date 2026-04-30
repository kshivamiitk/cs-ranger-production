-- Keep creator balance summaries consistent across migration-era ledger entry naming.
-- Older rows may use `purchase_credit`, while the rebuilt flow writes `premium_purchase_credit`.

update public.creator_balance_ledger
set entry_type = 'premium_purchase_credit'
where entry_type = 'purchase_credit';

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
    and entry_type in ('premium_purchase_credit', 'purchase_credit');

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


