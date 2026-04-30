-- RazorpayX payout flow: create withdrawal as pending first.
-- Provider result (paid/rejected) is applied from the application layer and webhooks.

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

  select * into v_settings
  from public.platform_settings
  where id = 1;

  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

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
    status,
    processed_at
  )
  values (
    p_creator_user_id,
    p_amount,
    coalesce(nullif(p_currency, ''), v_settings.currency),
    p_payout_method_snapshot,
    'pending',
    null
  )
  returning * into v_request;

  perform public.refresh_creator_balance_summary(p_creator_user_id);

  return query select * from public.withdrawal_requests where id = v_request.id;
end;
$$;


