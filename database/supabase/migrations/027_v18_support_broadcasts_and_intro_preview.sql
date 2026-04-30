alter table if exists public.admin_messages
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table if exists public.admin_message_replies
  add column if not exists deleted_at timestamptz;

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  cta_label text,
  cta_href text,
  audience text not null default 'all',
  is_active boolean not null default true,
  created_by_admin_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (audience in ('all', 'learners', 'creators', 'admins'))
);

create table if not exists public.admin_broadcast_reads (
  broadcast_id uuid not null references public.admin_broadcasts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (broadcast_id, user_id)
);

create index if not exists admin_broadcasts_updated_idx
  on public.admin_broadcasts (is_active, updated_at desc);

create index if not exists admin_broadcast_reads_user_idx
  on public.admin_broadcast_reads (user_id, read_at desc);

alter table public.admin_broadcasts enable row level security;
alter table public.admin_broadcast_reads enable row level security;

drop policy if exists "admin_broadcasts_select_all" on public.admin_broadcasts;
create policy "admin_broadcasts_select_all"
on public.admin_broadcasts
for select
to authenticated, anon
using (true);

drop policy if exists "admin_broadcasts_write_admin" on public.admin_broadcasts;
create policy "admin_broadcasts_write_admin"
on public.admin_broadcasts
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admin_broadcast_reads_select_own_or_admin" on public.admin_broadcast_reads;
create policy "admin_broadcast_reads_select_own_or_admin"
on public.admin_broadcast_reads
for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "admin_broadcast_reads_insert_own" on public.admin_broadcast_reads;
create policy "admin_broadcast_reads_insert_own"
on public.admin_broadcast_reads
for insert
to authenticated
with check (user_id = auth.uid());

drop trigger if exists admin_broadcasts_set_updated_at on public.admin_broadcasts;
create trigger admin_broadcasts_set_updated_at
before update on public.admin_broadcasts
for each row execute function public.set_updated_at();


