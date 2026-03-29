-- ============================================================
-- Vault API Key Storage
-- Replace plaintext key columns with Vault secret ID references.
-- Actual key values are stored encrypted in vault.secrets.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Migrate user_settings columns
-- ──────────────────────────────────────────────────────────

alter table public.user_settings
  drop column elevenlabs_api_key,
  drop column anthropic_api_key,
  add column elevenlabs_api_key_id  uuid references vault.secrets(id) on delete set null,
  add column anthropic_api_key_id   uuid references vault.secrets(id) on delete set null;

-- elevenlabs_agent_id is not a secret (it's a public agent identifier), keep as text

-- ──────────────────────────────────────────────────────────
-- Migrate organizations columns
-- ──────────────────────────────────────────────────────────

alter table public.organizations
  drop column elevenlabs_api_key,
  drop column anthropic_api_key,
  add column elevenlabs_api_key_id  uuid references vault.secrets(id) on delete set null,
  add column anthropic_api_key_id   uuid references vault.secrets(id) on delete set null;

-- ============================================================
-- Wrapper functions (SECURITY DEFINER — callable only via
-- service role key from the server. Never expose to the browser.)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- User: store ElevenLabs API key
-- ──────────────────────────────────────────────────────────

create or replace function public.set_user_elevenlabs_key(p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_name text := 'user_elevenlabs_' || auth.uid()::text;
  v_secret_id   uuid;
  v_existing_id uuid;
begin
  -- Check if a secret already exists for this user
  select elevenlabs_api_key_id into v_existing_id
  from public.user_settings
  where user_id = auth.uid();

  if v_existing_id is not null then
    -- Update existing Vault secret in-place
    perform vault.update_secret(v_existing_id, p_key);
  else
    -- Create new Vault secret
    v_secret_id := vault.create_secret(p_key, v_secret_name);

    -- Upsert user_settings row
    insert into public.user_settings (user_id, elevenlabs_api_key_id)
    values (auth.uid(), v_secret_id)
    on conflict (user_id) do update
      set elevenlabs_api_key_id = v_secret_id,
          updated_at = now();
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────
-- User: store Anthropic API key
-- ──────────────────────────────────────────────────────────

create or replace function public.set_user_anthropic_key(p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_name text := 'user_anthropic_' || auth.uid()::text;
  v_secret_id   uuid;
  v_existing_id uuid;
begin
  select anthropic_api_key_id into v_existing_id
  from public.user_settings
  where user_id = auth.uid();

  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_key);
  else
    v_secret_id := vault.create_secret(p_key, v_secret_name);

    insert into public.user_settings (user_id, anthropic_api_key_id)
    values (auth.uid(), v_secret_id)
    on conflict (user_id) do update
      set anthropic_api_key_id = v_secret_id,
          updated_at = now();
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────
-- User: read decrypted keys (returns null if not set)
-- ──────────────────────────────────────────────────────────

create or replace function public.get_user_keys()
returns table (
  elevenlabs_api_key  text,
  elevenlabs_agent_id text,
  anthropic_api_key   text
)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where id = us.elevenlabs_api_key_id),
    us.elevenlabs_agent_id,
    (select decrypted_secret from vault.decrypted_secrets where id = us.anthropic_api_key_id)
  from public.user_settings us
  where us.user_id = auth.uid();
end;
$$;

-- ──────────────────────────────────────────────────────────
-- Org: store ElevenLabs API key (admin/owner only)
-- ──────────────────────────────────────────────────────────

create or replace function public.set_org_elevenlabs_key(p_org_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_role        public.org_role;
  v_secret_name text := 'org_elevenlabs_' || p_org_id::text;
  v_secret_id   uuid;
  v_existing_id uuid;
begin
  select role into v_role
  from public.org_members
  where org_id = p_org_id and user_id = auth.uid();

  if v_role not in ('owner', 'admin') then
    raise exception 'Only org owners and admins can set API keys';
  end if;

  select elevenlabs_api_key_id into v_existing_id
  from public.organizations
  where id = p_org_id;

  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_key);
  else
    v_secret_id := vault.create_secret(p_key, v_secret_name);

    update public.organizations
    set elevenlabs_api_key_id = v_secret_id,
        updated_at = now()
    where id = p_org_id;
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────
-- Org: store Anthropic API key (admin/owner only)
-- ──────────────────────────────────────────────────────────

create or replace function public.set_org_anthropic_key(p_org_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_role        public.org_role;
  v_secret_name text := 'org_anthropic_' || p_org_id::text;
  v_secret_id   uuid;
  v_existing_id uuid;
begin
  select role into v_role
  from public.org_members
  where org_id = p_org_id and user_id = auth.uid();

  if v_role not in ('owner', 'admin') then
    raise exception 'Only org owners and admins can set API keys';
  end if;

  select anthropic_api_key_id into v_existing_id
  from public.organizations
  where id = p_org_id;

  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_key);
  else
    v_secret_id := vault.create_secret(p_key, v_secret_name);

    update public.organizations
    set anthropic_api_key_id = v_secret_id,
        updated_at = now()
    where id = p_org_id;
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────
-- Org: read decrypted keys (any org member)
-- ──────────────────────────────────────────────────────────

create or replace function public.get_org_keys(p_org_id uuid)
returns table (
  elevenlabs_api_key  text,
  elevenlabs_agent_id text,
  anthropic_api_key   text
)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  -- Verify caller is a member of the org
  if not exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where id = o.elevenlabs_api_key_id),
    o.elevenlabs_agent_id,
    (select decrypted_secret from vault.decrypted_secrets where id = o.anthropic_api_key_id)
  from public.organizations o
  where o.id = p_org_id;
end;
$$;

-- ──────────────────────────────────────────────────────────
-- Resolved keys: returns the effective keys for the current user
-- (personal key → org key → null)
-- Used server-side before a session to know which keys to use.
-- ──────────────────────────────────────────────────────────

create or replace function public.get_resolved_keys(p_org_id uuid default null)
returns table (
  elevenlabs_api_key  text,
  elevenlabs_agent_id text,
  anthropic_api_key   text,
  source              text   -- 'personal' | 'org' | 'none'
)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_personal_el    text;
  v_personal_el_id text;
  v_personal_an    text;
  v_org_el         text;
  v_org_el_id      text;
  v_org_an         text;
begin
  -- Fetch personal keys
  select
    (select decrypted_secret from vault.decrypted_secrets where id = us.elevenlabs_api_key_id),
    us.elevenlabs_agent_id,
    (select decrypted_secret from vault.decrypted_secrets where id = us.anthropic_api_key_id)
  into v_personal_el, v_personal_el_id, v_personal_an
  from public.user_settings us
  where us.user_id = auth.uid();

  -- Fetch org keys if an org is specified and user is a member
  if p_org_id is not null and exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid()
  ) then
    select
      (select decrypted_secret from vault.decrypted_secrets where id = o.elevenlabs_api_key_id),
      o.elevenlabs_agent_id,
      (select decrypted_secret from vault.decrypted_secrets where id = o.anthropic_api_key_id)
    into v_org_el, v_org_el_id, v_org_an
    from public.organizations o
    where o.id = p_org_id;
  end if;

  return query select
    coalesce(v_personal_el,    v_org_el),
    coalesce(v_personal_el_id, v_org_el_id),
    coalesce(v_personal_an,    v_org_an),
    case
      when v_personal_el is not null or v_personal_el_id is not null then 'personal'
      when v_org_el      is not null or v_org_el_id      is not null then 'org'
      else 'none'
    end;
end;
$$;
