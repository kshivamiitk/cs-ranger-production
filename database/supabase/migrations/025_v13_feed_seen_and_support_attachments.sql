alter table if exists public.admin_messages
  add column if not exists attachment_image_url text;

alter table if exists public.admin_message_replies
  add column if not exists attachment_image_url text;

create table if not exists public.learner_feed_event_views (
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  feed_event_id text not null,
  seen_at timestamptz not null default timezone('utc', now()),
  primary key (learner_user_id, feed_event_id)
);

create index if not exists learner_feed_event_views_seen_idx
  on public.learner_feed_event_views (learner_user_id, seen_at desc);


