-- v1.0.3: block direct public PDF links for newly saved PDF nodes.
-- PDF nodes must store uploaded PDF data so learner pages can serve them through
-- the protected in-app reader route instead of exposing downloadable source URLs.

create or replace function public.prevent_public_pdf_course_node_sources()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pdf_url text;
begin
  if new.type::text <> 'pdf' then
    return new;
  end if;

  v_pdf_url := coalesce(new.payload->>'pdfUrl', '');

  if v_pdf_url = '' or left(v_pdf_url, length('data:application/pdf;base64,')) <> 'data:application/pdf;base64,' then
    raise exception 'Public PDF URLs are disabled. Upload the PDF into the node so it can be served through the protected reader.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists course_nodes_prevent_public_pdf_sources_tg on public.course_nodes;
create trigger course_nodes_prevent_public_pdf_sources_tg
before insert or update of type, payload
on public.course_nodes
for each row
execute function public.prevent_public_pdf_course_node_sources();
