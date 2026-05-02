-- v1.0.2: retire legacy website nodes while preserving the historical enum value.
-- Existing rows can be migrated to another node type, but new rows cannot use the retired type.

create or replace function public.prevent_retired_github_course_nodes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type::text = 'github' then
    raise exception 'This node type has been retired. Use content, HTML, question, quiz, video, or PDF nodes instead.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists course_nodes_prevent_retired_github_tg on public.course_nodes;
create trigger course_nodes_prevent_retired_github_tg
before insert or update of type
on public.course_nodes
for each row
execute function public.prevent_retired_github_course_nodes();

update public.app_runtime_settings
set value = jsonb_set(coalesce(value, '{}'::jsonb), '{githubWebsiteNodes}', 'false'::jsonb, true),
    updated_at = timezone('utc', now())
where key = 'nodeRuntime';
