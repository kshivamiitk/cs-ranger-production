update public.courses
set
  premium_enabled = false,
  premium_access_days = null,
  price_amount = 0,
  premium_updated_at = null
where premium_enabled
  and (price_amount <= 0 or premium_access_days is null or premium_access_days <= 0);

alter table public.courses
  drop constraint if exists courses_premium_enabled_requires_plan_check;

alter table public.courses
  add constraint courses_premium_enabled_requires_plan_check
  check (
    not premium_enabled
    or (
      price_amount > 0
      and premium_access_days is not null
      and premium_access_days > 0
    )
  );

create table if not exists public.course_certificate_templates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  template_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists course_certificate_templates_active_course_idx
  on public.course_certificate_templates (course_id)
  where is_active = true;

create table if not exists public.course_certificate_requirements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.course_certificate_templates(id) on delete cascade,
  requirement_type text not null,
  requirement_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists course_certificate_requirements_template_idx
  on public.course_certificate_requirements (template_id, created_at asc);

create table if not exists public.issued_certificates (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  template_id uuid not null references public.course_certificate_templates(id) on delete cascade,
  certificate_code text not null,
  issued_at timestamptz not null default timezone('utc', now()),
  pdf_url text,
  render_payload jsonb not null default '{}'::jsonb
);

create unique index if not exists issued_certificates_code_idx
  on public.issued_certificates (certificate_code);

create unique index if not exists issued_certificates_unique_issue_idx
  on public.issued_certificates (learner_user_id, course_id, template_id);

create index if not exists issued_certificates_course_idx
  on public.issued_certificates (course_id, issued_at desc);

create index if not exists issued_certificates_learner_idx
  on public.issued_certificates (learner_user_id, issued_at desc);

drop trigger if exists course_certificate_templates_set_updated_at on public.course_certificate_templates;
create trigger course_certificate_templates_set_updated_at
before update on public.course_certificate_templates
for each row execute function public.set_updated_at();

alter table public.course_certificate_templates enable row level security;
alter table public.course_certificate_requirements enable row level security;
alter table public.issued_certificates enable row level security;

drop policy if exists "course_certificate_templates_select_visible" on public.course_certificate_templates;
create policy "course_certificate_templates_select_visible"
on public.course_certificate_templates
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_id
      and (
        courses.status = 'published'
        or courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

drop policy if exists "course_certificate_templates_write_owner_or_admin" on public.course_certificate_templates;
create policy "course_certificate_templates_write_owner_or_admin"
on public.course_certificate_templates
for all
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = course_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
);

drop policy if exists "course_certificate_requirements_select_visible" on public.course_certificate_requirements;
create policy "course_certificate_requirements_select_visible"
on public.course_certificate_requirements
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.course_certificate_templates templates
    join public.courses courses on courses.id = templates.course_id
    where templates.id = template_id
      and (
        courses.status = 'published'
        or courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

drop policy if exists "course_certificate_requirements_write_owner_or_admin" on public.course_certificate_requirements;
create policy "course_certificate_requirements_write_owner_or_admin"
on public.course_certificate_requirements
for all
to authenticated
using (
  exists (
    select 1
    from public.course_certificate_templates templates
    join public.courses courses on courses.id = templates.course_id
    where templates.id = template_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
)
with check (
  exists (
    select 1
    from public.course_certificate_templates templates
    join public.courses courses on courses.id = templates.course_id
    where templates.id = template_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  )
);

drop policy if exists "issued_certificates_select_related" on public.issued_certificates;
create policy "issued_certificates_select_related"
on public.issued_certificates
for select
to authenticated
using (
  learner_user_id = auth.uid()
  or public.current_user_is_admin()
  or exists (
    select 1
    from public.courses
    where courses.id = course_id
      and courses.creator_user_id = auth.uid()
  )
);


