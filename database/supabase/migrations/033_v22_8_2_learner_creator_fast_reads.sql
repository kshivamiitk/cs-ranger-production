-- v22.8.2: fast read model and indexes for Learner & Creator Product APIs.
-- This migration is safe to run repeatedly in Supabase SQL Editor.

create index if not exists courses_status_created_idx
  on public.courses (status, created_at desc);

create index if not exists courses_creator_updated_idx
  on public.courses (creator_user_id, updated_at desc);

create index if not exists courses_creator_created_idx
  on public.courses (creator_user_id, created_at desc);

create index if not exists courses_creator_status_created_idx
  on public.courses (creator_user_id, status, created_at desc);

create index if not exists courses_published_created_idx
  on public.courses (created_at desc, id)
  where status = 'published';

create index if not exists courses_published_domain_created_idx
  on public.courses (course_domain_id, created_at desc, id)
  where status = 'published';

create index if not exists course_nodes_module_premium_idx
  on public.course_nodes (module_id, is_premium, position);

create index if not exists course_nodes_module_tree_cover_idx
  on public.course_nodes (module_id, position, id)
  include (type, title, is_premium, excerpt, created_at, updated_at);

create index if not exists course_reviews_course_deleted_rating_idx
  on public.course_reviews (course_id, is_deleted, rating);

create index if not exists course_reviews_course_visible_rating_idx
  on public.course_reviews (course_id, rating)
  where is_deleted = false;

create index if not exists course_reviews_course_visible_created_idx
  on public.course_reviews (course_id, created_at desc)
  include (reviewer_user_id, rating, is_edited, updated_at)
  where is_deleted = false;

create index if not exists course_wishlist_entries_course_idx
  on public.course_wishlist_entries (course_id);

create index if not exists course_wishlist_entries_learner_course_idx
  on public.course_wishlist_entries (learner_user_id, course_id);

create index if not exists course_entitlements_course_active_idx
  on public.course_entitlements (course_id, status, expires_at desc);

create index if not exists course_entitlements_course_active_learner_idx
  on public.course_entitlements (course_id, expires_at desc, learner_user_id)
  where status = 'active';

create index if not exists course_entitlements_learner_active_course_idx
  on public.course_entitlements (learner_user_id, course_id, expires_at desc)
  where status = 'active';

create index if not exists course_collaborators_collaborator_idx
  on public.course_collaborators (collaborator_user_id, created_at desc, course_id);

create index if not exists course_collaborator_invites_incoming_idx
  on public.course_collaborator_invites (invitee_user_id, status, created_at desc);

create index if not exists course_collaborator_invites_course_status_idx
  on public.course_collaborator_invites (course_id, status, created_at desc);

create index if not exists user_profiles_username_creator_idx
  on public.user_profiles (username, primary_role, is_banned);

create or replace view public.v_course_overview_read_model as
select
  courses.id,
  courses.creator_user_id,
  courses.title,
  courses.slug,
  courses.description,
  courses.image_url,
  courses.course_domain_id,
  courses.price_amount,
  courses.premium_enabled,
  courses.premium_access_days,
  courses.premium_updated_at,
  courses.status,
  courses.created_at,
  courses.updated_at,
  creators.full_name as creator_name,
  creators.username as creator_username,
  domains.name as domain_name,
  domains.slug as domain_slug,
  coalesce(module_node_stats.module_count, 0)::integer as module_count,
  coalesce(module_node_stats.node_count, 0)::integer as node_count,
  coalesce(module_node_stats.premium_node_count, 0)::integer as premium_node_count,
  coalesce(wishlist_stats.wishlist_count, 0)::integer as wishlist_count,
  coalesce(review_stats.average_rating, 0)::numeric as average_rating,
  coalesce(review_stats.total_reviews, 0)::integer as total_reviews,
  coalesce(entitlement_stats.active_learner_count, 0)::integer as active_learner_count
from public.courses courses
left join public.user_profiles creators on creators.user_id = courses.creator_user_id
left join public.course_domains domains on domains.id = courses.course_domain_id
left join lateral (
  select
    count(distinct modules.id)::integer as module_count,
    count(nodes.id)::integer as node_count,
    count(nodes.id) filter (where nodes.is_premium)::integer as premium_node_count
  from public.course_modules modules
  left join public.course_nodes nodes on nodes.module_id = modules.id
  where modules.course_id = courses.id
) module_node_stats on true
left join lateral (
  select
    coalesce(round(avg(reviews.rating)::numeric, 2), 0)::numeric as average_rating,
    count(*)::integer as total_reviews
  from public.course_reviews reviews
  where reviews.course_id = courses.id
    and reviews.is_deleted = false
) review_stats on true
left join lateral (
  select count(*)::integer as wishlist_count
  from public.course_wishlist_entries wishlist
  where wishlist.course_id = courses.id
) wishlist_stats on true
left join lateral (
  select count(distinct entitlements.learner_user_id)::integer as active_learner_count
  from public.course_entitlements entitlements
  where entitlements.course_id = courses.id
    and entitlements.status = 'active'
    and entitlements.expires_at > timezone('utc', now())
) entitlement_stats on true;

grant select on public.v_course_overview_read_model to anon, authenticated, service_role;
