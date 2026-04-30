-- 031_v22_performance_config_assets.sql
-- Version 22: additive performance/read-model and runtime-config foundation.
-- Safe to run after v20/v21 migrations.

create table if not exists public.app_runtime_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by_user_id uuid references public.user_profiles(user_id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_runtime_settings (key, value, description)
values
  ('brand', '{"companyName":"CS-Ranger","productName":"CS-Ranger","supportEmail":"support@cs-ranger.local"}'::jsonb, 'Brand names and public contact defaults.'),
  ('errors', '{"requestFailed":"Request failed.","unexpectedServerError":"Unexpected server error.","validationFailed":"Validation failed."}'::jsonb, 'User-facing API error message defaults.'),
  ('assets', '{"publicAssetBasePath":"/repository"}'::jsonb, 'Public asset repository defaults.')
on conflict (key) do nothing;

create index if not exists courses_status_domain_updated_idx
  on public.courses (status, course_domain_id, updated_at desc);

create index if not exists course_nodes_module_premium_position_idx
  on public.course_nodes (module_id, is_premium, position);

create index if not exists course_modules_course_position_idx
  on public.course_modules (course_id, position);

create index if not exists course_reviews_course_deleted_rating_idx
  on public.course_reviews (course_id, is_deleted, rating);

create index if not exists course_wishlist_entries_course_idx
  on public.course_wishlist_entries (course_id);

create index if not exists user_profiles_username_idx
  on public.user_profiles (username);

create or replace function public.refresh_course_card_read_model(target_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.course_card_read_model (
    course_id,
    creator_user_id,
    title,
    slug,
    description,
    image_url,
    course_domain_id,
    creator_name,
    creator_avatar_url,
    rating_average,
    rating_count,
    minimum_price_amount,
    premium_enabled,
    status,
    updated_at
  )
  select
    courses.id,
    courses.creator_user_id,
    courses.title,
    courses.slug,
    courses.description,
    courses.image_url,
    courses.course_domain_id,
    profiles.full_name,
    profiles.profile_photo_url,
    coalesce(avg(reviews.rating) filter (where reviews.is_deleted = false), 0)::numeric(4,2),
    coalesce(count(reviews.id) filter (where reviews.is_deleted = false), 0)::integer,
    coalesce(min(plans.price_amount) filter (where plans.is_active = true), courses.price_amount, 0),
    courses.premium_enabled,
    courses.status,
    timezone('utc', now())
  from public.courses courses
  left join public.user_profiles profiles on profiles.user_id = courses.creator_user_id
  left join public.course_reviews reviews on reviews.course_id = courses.id
  left join public.course_pricing_plans plans on plans.course_id = courses.id
  where courses.id = target_course_id
  group by courses.id, profiles.full_name, profiles.profile_photo_url
  on conflict (course_id) do update
  set creator_user_id = excluded.creator_user_id,
      title = excluded.title,
      slug = excluded.slug,
      description = excluded.description,
      image_url = excluded.image_url,
      course_domain_id = excluded.course_domain_id,
      creator_name = excluded.creator_name,
      creator_avatar_url = excluded.creator_avatar_url,
      rating_average = excluded.rating_average,
      rating_count = excluded.rating_count,
      minimum_price_amount = excluded.minimum_price_amount,
      premium_enabled = excluded.premium_enabled,
      status = excluded.status,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_course_card_read_model_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  if TG_TABLE_NAME = 'courses' then
    v_course_id := coalesce(new.id, old.id);
  elsif TG_TABLE_NAME = 'course_reviews' then
    v_course_id := coalesce(new.course_id, old.course_id);
  elsif TG_TABLE_NAME = 'course_pricing_plans' then
    v_course_id := coalesce(new.course_id, old.course_id);
  end if;

  if v_course_id is not null then
    perform public.refresh_course_card_read_model(v_course_id);
  end if;

  return coalesce(new, old);
exception when others then
  return coalesce(new, old);
end;
$$;

drop trigger if exists courses_refresh_card_read_model on public.courses;
create trigger courses_refresh_card_read_model
after insert or update on public.courses
for each row execute function public.refresh_course_card_read_model_trigger();

drop trigger if exists course_reviews_refresh_card_read_model on public.course_reviews;
create trigger course_reviews_refresh_card_read_model
after insert or update or delete on public.course_reviews
for each row execute function public.refresh_course_card_read_model_trigger();

drop trigger if exists course_pricing_plans_refresh_card_read_model on public.course_pricing_plans;
create trigger course_pricing_plans_refresh_card_read_model
after insert or update or delete on public.course_pricing_plans
for each row execute function public.refresh_course_card_read_model_trigger();

alter table public.app_runtime_settings enable row level security;

drop policy if exists "app_runtime_settings_select_all" on public.app_runtime_settings;
create policy "app_runtime_settings_select_all"
on public.app_runtime_settings
for select
to authenticated, anon
using (true);

drop policy if exists "app_runtime_settings_write_admin" on public.app_runtime_settings;
create policy "app_runtime_settings_write_admin"
on public.app_runtime_settings
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());



