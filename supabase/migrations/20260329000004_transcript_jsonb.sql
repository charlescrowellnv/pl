-- Clear any malformed transcript data before changing column type
update public.sessions set transcript = null;

-- Change transcript column from text to jsonb
alter table public.sessions
  alter column transcript type jsonb
  using transcript::jsonb;
