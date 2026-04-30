-- v22.8.3: enforce creator free-content policy at the database boundary.
-- Keep these limits in sync with backend/Learner and Creator Product/domain/creatorCoursePolicy.ts.

create index if not exists courses_creator_free_policy_idx
  on public.courses (creator_user_id, id)
  where not (
    coalesce(premium_enabled, false)
    and coalesce(price_amount, 0) > 0
    and coalesce(premium_access_days, 0) > 0
  );

create index if not exists course_nodes_free_policy_idx
  on public.course_nodes (module_id, id)
  where not coalesce(is_premium, false);

create or replace function public.creator_free_course_limit()
returns integer
language sql
stable
as $$
  select 3;
$$;

create or replace function public.premium_course_free_node_limit()
returns integer
language sql
stable
as $$
  select 5;
$$;

create or replace function public.enforce_creator_free_course_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := public.creator_free_course_limit();
  v_existing_free_course_count integer;
  v_new_course_is_free boolean;
begin
  v_new_course_is_free := not (
    coalesce(new.premium_enabled, false)
    and coalesce(new.price_amount, 0) > 0
    and coalesce(new.premium_access_days, 0) > 0
  );

  if not v_new_course_is_free then
    return new;
  end if;

  select count(*)::integer
    into v_existing_free_course_count
  from public.courses courses
  where courses.creator_user_id = new.creator_user_id
    and (tg_op = 'INSERT' or courses.id <> new.id)
    and not (
      coalesce(courses.premium_enabled, false)
      and coalesce(courses.price_amount, 0) > 0
      and coalesce(courses.premium_access_days, 0) > 0
    );

  if v_existing_free_course_count >= v_limit then
    raise exception 'Creator free course limit reached. A creator can keep at most % free courses. Enable premium pricing or convert an existing free course to premium.', v_limit
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists courses_creator_free_course_limit_tg on public.courses;
create trigger courses_creator_free_course_limit_tg
before insert or update of creator_user_id, premium_enabled, price_amount, premium_access_days, status
on public.courses
for each row
execute function public.enforce_creator_free_course_limit();

create or replace function public.enforce_course_premium_free_node_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := public.premium_course_free_node_limit();
  v_free_node_count integer;
  v_course_is_premium boolean;
begin
  v_course_is_premium := (
    coalesce(new.premium_enabled, false)
    and coalesce(new.price_amount, 0) > 0
    and coalesce(new.premium_access_days, 0) > 0
  );

  if not v_course_is_premium then
    return new;
  end if;

  select count(*)::integer
    into v_free_node_count
  from public.course_modules modules
  join public.course_nodes nodes on nodes.module_id = modules.id
  where modules.course_id = new.id
    and not coalesce(nodes.is_premium, false);

  if v_free_node_count > v_limit then
    raise exception 'Premium courses can expose at most % free nodes. This course currently has % free nodes.', v_limit, v_free_node_count
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists courses_premium_free_node_limit_tg on public.courses;
create trigger courses_premium_free_node_limit_tg
before update of premium_enabled, price_amount, premium_access_days, status
on public.courses
for each row
execute function public.enforce_course_premium_free_node_limit();

create or replace function public.enforce_node_free_limit_for_premium_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := public.premium_course_free_node_limit();
  v_course record;
  v_existing_free_node_count integer;
begin
  if coalesce(new.is_premium, false) then
    return new;
  end if;

  select courses.id,
         courses.premium_enabled,
         courses.price_amount,
         courses.premium_access_days
    into v_course
  from public.course_modules modules
  join public.courses courses on courses.id = modules.course_id
  where modules.id = new.module_id;

  if not found then
    return new;
  end if;

  if not (
    coalesce(v_course.premium_enabled, false)
    and coalesce(v_course.price_amount, 0) > 0
    and coalesce(v_course.premium_access_days, 0) > 0
  ) then
    return new;
  end if;

  select count(*)::integer
    into v_existing_free_node_count
  from public.course_modules modules
  join public.course_nodes nodes on nodes.module_id = modules.id
  where modules.course_id = v_course.id
    and (tg_op = 'INSERT' or nodes.id <> new.id)
    and not coalesce(nodes.is_premium, false);

  if v_existing_free_node_count >= v_limit then
    raise exception 'Premium courses can expose at most % free nodes. Mark this node as premium, or convert an existing free node to premium first.', v_limit
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists course_nodes_premium_course_free_node_limit_tg on public.course_nodes;
create trigger course_nodes_premium_course_free_node_limit_tg
before insert or update of module_id, is_premium
on public.course_nodes
for each row
execute function public.enforce_node_free_limit_for_premium_course();
