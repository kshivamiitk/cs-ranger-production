create table if not exists public.quiz_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id text not null,
  question_index integer not null,
  selected_answer text,
  is_correct boolean not null default false,
  is_attempted boolean not null default false,
  marks_awarded numeric(10,2) not null default 0,
  correct_answer_snapshot text,
  explanation_snapshot text,
  question_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_attempt_items_attempt_idx on public.quiz_attempt_items (attempt_id, question_index);


