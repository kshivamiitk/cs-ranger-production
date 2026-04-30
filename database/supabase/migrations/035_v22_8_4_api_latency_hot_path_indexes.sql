-- v22.8.4: indexes for the slow page/API hot paths seen in dev logs.
-- Safe to run repeatedly in Supabase SQL Editor after migrations 001-034.

create index if not exists learner_node_progress_learner_completed_cover_idx
  on public.learner_node_progress (learner_user_id, completed_at desc)
  include (course_id, module_id, node_id, updated_at);

create index if not exists quiz_attempts_learner_submitted_cover_idx
  on public.quiz_attempts (learner_user_id, submitted_at desc)
  include (course_id, node_id, score, max_score);

create index if not exists course_modules_course_updated_cover_idx
  on public.course_modules (course_id, updated_at desc)
  include (id);

create index if not exists course_nodes_module_updated_cover_idx
  on public.course_nodes (module_id, updated_at desc)
  include (id);

create index if not exists admin_messages_sender_updated_cover_idx
  on public.admin_messages (sender_user_id, updated_at desc)
  include (subject, message, message_type, target_user_id, status, created_at, is_deleted);

create index if not exists admin_messages_target_updated_cover_idx
  on public.admin_messages (target_user_id, updated_at desc)
  include (subject, message, message_type, sender_user_id, status, created_at, is_deleted);

create index if not exists admin_message_replies_thread_created_cover_idx
  on public.admin_message_replies (thread_id, created_at desc)
  include (sender_user_id, body, is_deleted);

create index if not exists admin_message_thread_reads_user_thread_idx
  on public.admin_message_thread_reads (user_id, thread_id)
  include (last_read_at);
