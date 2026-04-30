create table if not exists public.admin_message_thread_reads (
  thread_id uuid not null references public.admin_messages(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, user_id)
);

create index if not exists admin_message_thread_reads_user_idx
  on public.admin_message_thread_reads (user_id, last_read_at desc);

alter table public.admin_message_thread_reads enable row level security;

drop policy if exists "admin_message_thread_reads_select_own_or_participant" on public.admin_message_thread_reads;
create policy "admin_message_thread_reads_select_own_or_participant"
on public.admin_message_thread_reads
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists "admin_message_thread_reads_insert_own" on public.admin_message_thread_reads;
create policy "admin_message_thread_reads_insert_own"
on public.admin_message_thread_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
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

drop policy if exists "admin_message_thread_reads_update_own" on public.admin_message_thread_reads;
create policy "admin_message_thread_reads_update_own"
on public.admin_message_thread_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table if exists public.admin_intro_cards
  add column if not exists image_focus text not null default 'center';

alter table if exists public.admin_intro_cards
  drop constraint if exists admin_intro_cards_image_focus_check;

alter table if exists public.admin_intro_cards
  add constraint admin_intro_cards_image_focus_check
  check (image_focus in (
    'top-left',
    'top-center',
    'top-right',
    'center-left',
    'center',
    'center-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ));


