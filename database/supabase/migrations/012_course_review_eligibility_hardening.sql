-- Restrict course reviews to eligible learner accounts only.
-- Admins and course creators cannot submit course ratings/reviews.

create or replace function public.can_user_review_course(
  target_course_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses courses
    join public.user_profiles actor on actor.user_id = target_user_id
    where courses.id = target_course_id
      and not actor.is_banned
      and not actor.is_admin
      and actor.primary_role = 'learner'
      and courses.creator_user_id <> target_user_id
      and courses.status = 'published'
      and (
        not courses.premium_enabled
        or courses.price_amount <= 0
        or courses.premium_access_days is null
        or exists (
          select 1
          from public.course_entitlements entitlements
          where entitlements.course_id = courses.id
            and entitlements.learner_user_id = target_user_id
            and entitlements.status = 'active'
            and entitlements.expires_at > timezone('utc', now())
        )
      )
  );
$$;

grant execute on function public.can_user_review_course(uuid, uuid) to authenticated;


