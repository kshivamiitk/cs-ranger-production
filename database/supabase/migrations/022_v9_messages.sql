create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  conversation_type text not null check (conversation_type in ('learner_creator', 'learner_admin')),
  related_course_id uuid references public.courses(id) on delete set null,
  subject text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role_at_creation text not null,
  last_read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);


