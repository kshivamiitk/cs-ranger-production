-- V15: unique usernames plus GitHub-style course collaborators.
-- Owner remains the financial/publishing authority. Collaborators can edit course content.

create or replace function public.normalize_username(raw_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_value text;
begin
  v_value := lower(coalesce(raw_value, ''));
  v_value := regexp_replace(v_value, '[^a-z0-9_]+', '_', 'g');
  v_value := regexp_replace(v_value, '_{2,}', '_', 'g');
  v_value := trim(both '_' from v_value);

  if v_value = '' then
    return null;
  end if;

  if v_value !~ '^[a-z]' then
    v_value := 'u_' || v_value;
  end if;

  if length(v_value) < 3 then
    v_value := v_value || repeat('_', 3 - length(v_value));
  end if;

  return left(v_value, 32);
end;
$$;

alter table public.user_profiles
  add column if not exists username text;

update public.user_profiles
set username = case
  when coalesce(trim(full_name), '') <> ''
    then left(public.normalize_username(full_name) || '_' || substr(replace(user_id::text, '-', ''), 1, 6), 32)
  else 'user_' || substr(replace(user_id::text, '-', ''), 1, 12)
end;

update public.user_profiles
set username = 'user_' || substr(replace(user_id::text, '-', ''), 1, 12)
where username is null
   or length(username) < 3;

create unique index if not exists user_profiles_username_lower_key
  on public.user_profiles (lower(username));

alter table public.user_profiles
  alter column username set not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_username_format_check;

alter table public.user_profiles
  add constraint user_profiles_username_format_check
  check (username ~ '^[a-z][a-z0-9_]{2,31}$');

create index if not exists user_profiles_username_lower_idx
  on public.user_profiles (lower(username));

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  requested_username text;
  fallback_username text;
begin
  begin
    requested_role := case
      when coalesce(new.raw_user_meta_data ->> 'preferred_role', 'learner') = 'creator' then 'creator'::public.user_role
      else 'learner'::public.user_role
    end;

    requested_username := public.normalize_username(new.raw_user_meta_data ->> 'username');
    fallback_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);

    if requested_username is null then
      requested_username := fallback_username;
    elsif exists (
      select 1
      from public.user_profiles
      where lower(username) = lower(requested_username)
    ) then
      requested_username := left(requested_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6), 32);
    end if;

    insert into public.user_profiles (user_id, full_name, username, primary_role)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      requested_username,
      requested_role
    )
    on conflict (user_id) do nothing;
  exception when others then
    null;
  end;

  return new;
end;
$$;

create table if not exists public.course_collaborators (
  course_id uuid not null references public.courses(id) on delete cascade,
  collaborator_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role text not null default 'editor',
  added_by_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, collaborator_user_id),
  check (role in ('editor'))
);

create table if not exists public.course_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  inviter_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  invitee_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role text not null default 'editor',
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  check (role in ('editor')),
  check (status in ('pending', 'accepted', 'declined', 'revoked')),
  check (inviter_user_id <> invitee_user_id)
);

create index if not exists course_collaborators_user_idx
  on public.course_collaborators (collaborator_user_id, created_at desc);
create index if not exists course_collaborators_course_idx
  on public.course_collaborators (course_id, created_at asc);
create index if not exists course_collaborator_invites_invitee_idx
  on public.course_collaborator_invites (invitee_user_id, created_at desc);
create index if not exists course_collaborator_invites_course_idx
  on public.course_collaborator_invites (course_id, created_at desc);
create unique index if not exists course_collaborator_invites_pending_unique_idx
  on public.course_collaborator_invites (course_id, invitee_user_id)
  where status = 'pending';

create or replace function public.is_course_collaborator(target_course_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_collaborators collaborators
    where collaborators.course_id = target_course_id
      and collaborators.collaborator_user_id = target_user_id
  );
$$;

create or replace function public.current_user_can_edit_course_content(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses courses
    where courses.id = target_course_id
      and (
        courses.creator_user_id = auth.uid()
        or public.current_user_is_admin()
        or public.is_course_collaborator(target_course_id, auth.uid())
      )
  );
$$;

create or replace function public.current_user_can_manage_course_collaborators(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses courses
    where courses.id = target_course_id
      and (courses.creator_user_id = auth.uid() or public.current_user_is_admin())
  );
$$;

create or replace function public.is_module_editor(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_modules modules
    where modules.id = target_module_id
      and public.current_user_can_edit_course_content(modules.course_id)
  );
$$;

create or replace function public.is_node_editor(target_node_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_nodes nodes
    join public.course_modules modules on modules.id = nodes.module_id
    where nodes.id = target_node_id
      and public.current_user_can_edit_course_content(modules.course_id)
  );
$$;

alter table public.course_collaborators enable row level security;
alter table public.course_collaborator_invites enable row level security;

drop policy if exists "course_collaborators_select_related" on public.course_collaborators;
create policy "course_collaborators_select_related"
on public.course_collaborators
for select
to authenticated
using (
  collaborator_user_id = auth.uid()
  or public.current_user_can_manage_course_collaborators(course_id)
  or public.current_user_can_edit_course_content(course_id)
);

drop policy if exists "course_collaborator_invites_select_related" on public.course_collaborator_invites;
create policy "course_collaborator_invites_select_related"
on public.course_collaborator_invites
for select
to authenticated
using (
  invitee_user_id = auth.uid()
  or inviter_user_id = auth.uid()
  or public.current_user_can_manage_course_collaborators(course_id)
);

drop policy if exists "course_modules_write_owner_creator" on public.course_modules;
create policy "course_modules_write_owner_creator"
on public.course_modules
for all
to authenticated
using (
  public.is_module_editor(id)
  and public.current_user_role() = 'creator'
)
with check (
  public.current_user_can_edit_course_content(course_id)
  and public.current_user_role() = 'creator'
);

drop policy if exists "course_nodes_insert_owner_creator" on public.course_nodes;
create policy "course_nodes_insert_owner_creator"
on public.course_nodes
for insert
to authenticated
with check (
  public.is_module_editor(module_id)
  and public.current_user_role() = 'creator'
);

drop policy if exists "course_nodes_update_owner_creator" on public.course_nodes;
create policy "course_nodes_update_owner_creator"
on public.course_nodes
for update
to authenticated
using (
  public.is_node_editor(id)
  and public.current_user_role() = 'creator'
)
with check (
  public.is_node_editor(id)
  and public.current_user_role() = 'creator'
);


