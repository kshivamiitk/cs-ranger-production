-- v11: replace local messaging with persistent admin-only support threads,
-- and add admin-managed public intro cards for login/signup.

create table if not exists public.admin_message_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.admin_messages(id) on delete cascade,
  sender_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists admin_message_replies_thread_idx
  on public.admin_message_replies (thread_id, created_at asc);
create index if not exists admin_message_replies_sender_idx
  on public.admin_message_replies (sender_user_id, created_at desc);

create table if not exists public.admin_intro_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  cta_label text,
  cta_href text,
  is_active boolean not null default false,
  created_by_admin_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_intro_cards_single_active_idx
  on public.admin_intro_cards (is_active)
  where is_active = true;

alter table public.admin_message_replies enable row level security;
alter table public.admin_intro_cards enable row level security;

drop policy if exists "admin_message_replies_select_participants" on public.admin_message_replies;
create policy "admin_message_replies_select_participants"
on public.admin_message_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_messages threads
    where threads.id = thread_id
      and (
        threads.sender_user_id = auth.uid()
        or threads.target_user_id = auth.uid()
      )
  )
);

drop policy if exists "admin_message_replies_insert_participants" on public.admin_message_replies;
create policy "admin_message_replies_insert_participants"
on public.admin_message_replies
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.admin_messages threads
    where threads.id = thread_id
      and (
        threads.sender_user_id = auth.uid()
        or threads.target_user_id = auth.uid()
      )
  )
);

drop policy if exists "admin_intro_cards_select_all" on public.admin_intro_cards;
create policy "admin_intro_cards_select_all"
on public.admin_intro_cards
for select
to authenticated, anon
using (true);

drop policy if exists "admin_intro_cards_write_admin" on public.admin_intro_cards;
create policy "admin_intro_cards_write_admin"
on public.admin_intro_cards
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create trigger admin_intro_cards_set_updated_at
before update on public.admin_intro_cards
for each row execute function public.set_updated_at();


