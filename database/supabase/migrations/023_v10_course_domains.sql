create table if not exists public.course_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  normalized_name text not null,
  created_by_user_id uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists course_domains_slug_key
  on public.course_domains (slug);

create unique index if not exists course_domains_normalized_name_key
  on public.course_domains (normalized_name);

alter table public.courses
  add column if not exists course_domain_id uuid references public.course_domains(id) on delete set null;

create index if not exists courses_domain_idx
  on public.courses (course_domain_id, status, updated_at desc);

alter table public.course_domains enable row level security;

drop policy if exists "course_domains_select_visible" on public.course_domains;
create policy "course_domains_select_visible"
on public.course_domains
for select
to authenticated, anon
using (true);

-- Writes are expected to happen through server-side repository flows.
drop policy if exists "course_domains_insert_authenticated" on public.course_domains;
create policy "course_domains_insert_authenticated"
on public.course_domains
for insert
to authenticated
with check (auth.uid() is not null);


