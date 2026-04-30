-- Enforce strict premium-node access:
-- premium nodes are readable only by creator/admin or learners with an active entitlement.
-- Free nodes remain visible through node-level policies that already allow non-premium rows.

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
          and exists (
            select 1
            from public.course_entitlements entitlements
            where entitlements.course_id = target_course_id
              and entitlements.learner_user_id = auth.uid()
              and entitlements.status = 'active'
              and entitlements.expires_at > timezone('utc', now())
          )
        )
      )
  );
$$;


