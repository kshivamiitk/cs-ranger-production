create extension if not exists pgcrypto;

create type public.user_role as enum ('learner', 'creator');
create type public.theme_mode as enum ('light', 'dark', 'ocean', 'forest', 'ember');
create type public.course_status as enum ('draft', 'published');
create type public.node_type as enum ('content', 'html', 'question', 'quiz', 'video', 'pdf', 'github');
create type public.withdrawal_status as enum ('pending', 'approved', 'rejected', 'paid');

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  primary_role public.user_role not null default 'learner',
  theme_mode public.theme_mode not null default 'dark',
  github_username text,
  github_profile_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text not null,
  image_url text,
  price_amount numeric(12, 2) not null default 0 check (price_amount >= 0),
  status public.course_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  summary text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (course_id, position)
);

create table public.course_nodes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  type public.node_type not null,
  title text not null,
  payload jsonb not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (module_id, position)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  node_id uuid not null references public.course_nodes(id) on delete cascade,
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  score integer not null check (score >= 0),
  max_score integer not null check (max_score >= 0),
  answers jsonb not null,
  submitted_at timestamptz not null default timezone('utc', now())
);

create table public.platform_settings (
  id bigint primary key default 1 check (id = 1),
  currency text not null default 'INR',
  platform_fee_percent numeric(5, 2) not null default 10 check (platform_fee_percent >= 0),
  platform_flat_fee_amount numeric(12, 2) not null default 0 check (platform_flat_fee_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  learner_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  creator_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  platform_fee_amount numeric(12, 2) not null check (platform_fee_amount >= 0),
  creator_net_amount numeric(12, 2) not null check (creator_net_amount >= 0),
  currency text not null default 'INR',
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, learner_user_id)
);

create table public.creator_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  entry_type text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  reference_type text not null,
  reference_id uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.creator_balance_summaries (
  creator_user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  currency text not null default 'INR',
  total_earned_amount numeric(12, 2) not null default 0,
  available_amount numeric(12, 2) not null default 0,
  withdrawn_amount numeric(12, 2) not null default 0,
  pending_withdrawal_amount numeric(12, 2) not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  payout_method_snapshot text not null,
  status public.withdrawal_status not null default 'pending',
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create index courses_creator_idx on public.courses (creator_user_id, updated_at desc);
create index courses_status_idx on public.courses (status, updated_at desc);
create index modules_course_idx on public.course_modules (course_id, position);
create index nodes_module_idx on public.course_nodes (module_id, position);
create index quiz_attempts_learner_idx on public.quiz_attempts (learner_user_id, submitted_at desc);
create index purchases_creator_idx on public.course_purchases (creator_user_id, created_at desc);
create index purchases_learner_idx on public.course_purchases (learner_user_id, created_at desc);
create index ledger_creator_idx on public.creator_balance_ledger (creator_user_id, created_at desc);
create index withdrawals_creator_idx on public.withdrawal_requests (creator_user_id, requested_at desc);

insert into public.platform_settings (id, currency, platform_fee_percent, platform_flat_fee_amount)
values (1, 'INR', 10, 0)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger course_modules_set_updated_at
before update on public.course_modules
for each row execute function public.set_updated_at();

create trigger course_nodes_set_updated_at
before update on public.course_nodes
for each row execute function public.set_updated_at();

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select primary_role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.is_course_owner(target_course_id uuid)
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
      and creator_user_id = auth.uid()
  );
$$;

create or replace function public.can_view_course(target_course_id uuid)
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
      and (status = 'published' or creator_user_id = auth.uid())
  );
$$;

create or replace function public.is_module_owner(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_modules modules
    join public.courses courses on courses.id = modules.course_id
    where modules.id = target_module_id
      and courses.creator_user_id = auth.uid()
  );
$$;

create or replace function public.is_node_owner(target_node_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_nodes nodes
    join public.course_modules modules on modules.id = nodes.module_id
    join public.courses courses on courses.id = modules.course_id
    where nodes.id = target_node_id
      and courses.creator_user_id = auth.uid()
  );
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  begin
    requested_role := case
      when coalesce(new.raw_user_meta_data ->> 'preferred_role', 'learner') = 'creator' then 'creator'::public.user_role
      else 'learner'::public.user_role
    end;

    insert into public.user_profiles (user_id, full_name, primary_role)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      requested_role
    )
    on conflict (user_id) do nothing;
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.refresh_creator_balance_summary(target_creator_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text := 'INR';
  v_total numeric(12, 2) := 0;
  v_withdrawn numeric(12, 2) := 0;
  v_pending numeric(12, 2) := 0;
begin
  select currency into v_currency
  from public.platform_settings
  where id = 1;

  select coalesce(sum(amount), 0) into v_total
  from public.creator_balance_ledger
  where creator_user_id = target_creator_user_id
    and entry_type = 'purchase_credit';

  select coalesce(sum(abs(amount)), 0) into v_withdrawn
  from public.creator_balance_ledger
  where creator_user_id = target_creator_user_id
    and entry_type = 'withdrawal_paid';

  select coalesce(sum(amount), 0) into v_pending
  from public.withdrawal_requests
  where creator_user_id = target_creator_user_id
    and status = 'pending';

  insert into public.creator_balance_summaries (
    creator_user_id,
    currency,
    total_earned_amount,
    available_amount,
    withdrawn_amount,
    pending_withdrawal_amount
  )
  values (
    target_creator_user_id,
    v_currency,
    v_total,
    greatest(v_total - v_withdrawn - v_pending, 0),
    v_withdrawn,
    v_pending
  )
  on conflict (creator_user_id) do update
  set currency = excluded.currency,
      total_earned_amount = excluded.total_earned_amount,
      available_amount = excluded.available_amount,
      withdrawn_amount = excluded.withdrawn_amount,
      pending_withdrawal_amount = excluded.pending_withdrawal_amount,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.refresh_summary_from_ledger()
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

create or replace function public.refresh_summary_from_withdrawal()
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

create trigger creator_balance_ledger_refresh_summary
after insert or update or delete on public.creator_balance_ledger
for each row execute function public.refresh_summary_from_ledger();

create trigger withdrawal_requests_refresh_summary
after insert or update or delete on public.withdrawal_requests
for each row execute function public.refresh_summary_from_withdrawal();

create or replace function public.record_course_purchase(
  p_learner_user_id uuid,
  p_creator_user_id uuid,
  p_course_id uuid,
  p_gross_amount numeric,
  p_platform_fee_amount numeric,
  p_creator_net_amount numeric,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
  v_purchase_id uuid;
begin
  if auth.uid() is not null and auth.uid() <> p_learner_user_id then
    raise exception 'Purchase learner mismatch.';
  end if;

  select *
  into v_course
  from public.courses
  where id = p_course_id
    and status = 'published';

  if not found then
    raise exception 'Course is not available for purchase.';
  end if;

  if v_course.creator_user_id <> p_creator_user_id then
    raise exception 'Creator mismatch.';
  end if;

  if v_course.price_amount <> p_gross_amount then
    raise exception 'Purchase amount mismatch.';
  end if;

  if p_creator_net_amount + p_platform_fee_amount <> p_gross_amount then
    raise exception 'Settlement mismatch.';
  end if;

  insert into public.course_purchases (
    course_id,
    learner_user_id,
    creator_user_id,
    gross_amount,
    platform_fee_amount,
    creator_net_amount,
    currency
  )
  values (
    p_course_id,
    p_learner_user_id,
    p_creator_user_id,
    p_gross_amount,
    p_platform_fee_amount,
    p_creator_net_amount,
    p_currency
  )
  returning id into v_purchase_id;

  insert into public.creator_balance_ledger (
    creator_user_id,
    entry_type,
    amount,
    currency,
    reference_type,
    reference_id
  )
  values (
    p_creator_user_id,
    'purchase_credit',
    p_creator_net_amount,
    p_currency,
    'course_purchase',
    v_purchase_id
  );
end;
$$;

create or replace function public.create_withdrawal_request(
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
  v_request public.withdrawal_requests%rowtype;
  v_available numeric(12, 2);
begin
  if auth.uid() is not null and auth.uid() <> p_creator_user_id then
    raise exception 'Withdrawal creator mismatch.';
  end if;

  perform public.refresh_creator_balance_summary(p_creator_user_id);

  select available_amount
  into v_available
  from public.creator_balance_summaries
  where creator_user_id = p_creator_user_id;

  if coalesce(v_available, 0) < p_amount then
    raise exception 'Insufficient available balance.';
  end if;

  insert into public.withdrawal_requests (
    creator_user_id,
    amount,
    currency,
    payout_method_snapshot
  )
  values (
    p_creator_user_id,
    p_amount,
    p_currency,
    p_payout_method_snapshot
  )
  returning * into v_request;

  insert into public.creator_balance_ledger (
    creator_user_id,
    entry_type,
    amount,
    currency,
    reference_type,
    reference_id
  )
  values (
    p_creator_user_id,
    'withdrawal_requested',
    -p_amount,
    p_currency,
    'withdrawal_request',
    v_request.id
  );

  return query
  select *
  from public.withdrawal_requests
  where id = v_request.id;
end;
$$;

alter table public.user_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_nodes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.platform_settings enable row level security;
alter table public.course_purchases enable row level security;
alter table public.creator_balance_ledger enable row level security;
alter table public.creator_balance_summaries enable row level security;
alter table public.withdrawal_requests enable row level security;

create policy "profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "courses_select_published_or_owner"
on public.courses
for select
to authenticated, anon
using (status = 'published' or creator_user_id = auth.uid());

create policy "courses_insert_owner_creator"
on public.courses
for insert
to authenticated
with check (
  creator_user_id = auth.uid()
  and public.current_user_role() = 'creator'
);

create policy "courses_update_owner_creator"
on public.courses
for update
to authenticated
using (
  creator_user_id = auth.uid()
  and public.current_user_role() = 'creator'
)
with check (
  creator_user_id = auth.uid()
  and public.current_user_role() = 'creator'
);

create policy "course_modules_select_visible"
on public.course_modules
for select
to authenticated, anon
using (public.can_view_course(course_id));

create policy "course_modules_write_owner_creator"
on public.course_modules
for all
to authenticated
using (
  public.is_course_owner(course_id)
  and public.current_user_role() = 'creator'
)
with check (
  public.is_course_owner(course_id)
  and public.current_user_role() = 'creator'
);

create policy "course_nodes_select_visible"
on public.course_nodes
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.course_modules modules
    where modules.id = module_id
      and public.can_view_course(modules.course_id)
  )
);

create policy "course_nodes_insert_owner_creator"
on public.course_nodes
for insert
to authenticated
with check (
  public.is_module_owner(module_id)
  and public.current_user_role() = 'creator'
);

create policy "course_nodes_update_owner_creator"
on public.course_nodes
for update
to authenticated
using (
  public.is_node_owner(id)
  and public.current_user_role() = 'creator'
)
with check (
  public.is_node_owner(id)
  and public.current_user_role() = 'creator'
);

create policy "quiz_attempts_select_own"
on public.quiz_attempts
for select
to authenticated
using (learner_user_id = auth.uid());

create policy "quiz_attempts_insert_own"
on public.quiz_attempts
for insert
to authenticated
with check (
  learner_user_id = auth.uid()
  and public.can_view_course(course_id)
);

create policy "platform_settings_select_all"
on public.platform_settings
for select
to authenticated, anon
using (true);

create policy "course_purchases_select_related"
on public.course_purchases
for select
to authenticated
using (
  learner_user_id = auth.uid()
  or creator_user_id = auth.uid()
);

create policy "creator_balance_ledger_select_own"
on public.creator_balance_ledger
for select
to authenticated
using (creator_user_id = auth.uid());

create policy "creator_balance_summaries_select_own"
on public.creator_balance_summaries
for select
to authenticated
using (creator_user_id = auth.uid());

create policy "withdrawal_requests_select_own"
on public.withdrawal_requests
for select
to authenticated
using (creator_user_id = auth.uid());

grant execute on function public.record_course_purchase(uuid, uuid, uuid, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.create_withdrawal_request(uuid, numeric, text, text) to authenticated;


