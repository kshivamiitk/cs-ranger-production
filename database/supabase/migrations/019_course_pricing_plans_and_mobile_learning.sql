-- Multiple manual pricing schemes per course plus safer learner-facing access choices.

create table if not exists public.course_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  price_amount numeric(12,2) not null check (price_amount >= 0),
  access_days integer not null check (access_days > 0),
  position integer not null check (position > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (course_id, position)
);

create index if not exists course_pricing_plans_course_idx
  on public.course_pricing_plans (course_id, is_active, position);

alter table public.course_purchases
  add column if not exists pricing_plan_id uuid references public.course_pricing_plans(id) on delete set null;

insert into public.course_pricing_plans (
  course_id,
  title,
  description,
  price_amount,
  access_days,
  position,
  is_active
)
select
  courses.id,
  case
    when courses.premium_access_days >= 180 then '180 day plan'
    when courses.premium_access_days >= 90 then '90 day plan'
    else '30 day plan'
  end,
  'Imported from the legacy single-plan premium configuration.',
  courses.price_amount,
  greatest(coalesce(courses.premium_access_days, 30), 1),
  1,
  true
from public.courses courses
where courses.premium_enabled = true
  and courses.price_amount > 0
  and coalesce(courses.premium_access_days, 0) > 0
  and not exists (
    select 1
    from public.course_pricing_plans plans
    where plans.course_id = courses.id
  );

drop trigger if exists course_pricing_plans_set_updated_at on public.course_pricing_plans;
create trigger course_pricing_plans_set_updated_at
before update on public.course_pricing_plans
for each row execute function public.set_updated_at();

alter table public.course_pricing_plans enable row level security;

drop policy if exists "course_pricing_plans_select_visible" on public.course_pricing_plans;
create policy "course_pricing_plans_select_visible"
on public.course_pricing_plans
for select
to authenticated, anon
using (
  is_active = true and exists (
    select 1
    from public.courses courses
    where courses.id = course_id
      and (
        courses.status = 'published'
        or courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

drop policy if exists "course_pricing_plans_write_owner_or_admin" on public.course_pricing_plans;
create policy "course_pricing_plans_write_owner_or_admin"
on public.course_pricing_plans
for all
to authenticated
using (
  exists (
    select 1
    from public.courses courses
    where courses.id = course_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
)
with check (
  exists (
    select 1
    from public.courses courses
    where courses.id = course_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
);


