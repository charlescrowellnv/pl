-- ============================================================
-- Practice Lab — Initial Schema
-- ============================================================
-- Supabase auth.users is managed by Supabase; we extend it via
-- user_settings and org_members tables.
-- ============================================================

-- Enable pgcrypto for gen_random_uuid() (already available in Supabase)
-- Enable pgsodium for encryption (available via Supabase Vault)

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table public.organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  owner_id              uuid not null references auth.users(id) on delete restrict,
  elevenlabs_api_key    text,       -- store encrypted; use Supabase Vault in prod
  elevenlabs_agent_id   text,
  anthropic_api_key     text,       -- store encrypted; use Supabase Vault in prod
  allow_member_key_override boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- ORG MEMBERS
-- ============================================================

create type public.org_role as enum ('owner', 'admin', 'member');

create table public.org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.org_role not null default 'member',
  invited_by  uuid references auth.users(id) on delete set null,
  joined_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- ORG INVITES
-- ============================================================

create table public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  invited_by  uuid not null references auth.users(id) on delete cascade,
  email       text,                 -- null = link-based invite (any email)
  role        public.org_role not null default 'member',
  token       uuid not null unique default gen_random_uuid(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- USER SETTINGS  (BYOK — solo users)
-- ============================================================

create table public.user_settings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  elevenlabs_api_key    text,       -- store encrypted; use Supabase Vault in prod
  elevenlabs_agent_id   text,
  anthropic_api_key     text,       -- store encrypted; use Supabase Vault in prod
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- SCORECARDS
-- ============================================================

create table public.scorecards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- null = org-owned
  org_id      uuid references public.organizations(id) on delete cascade, -- null = personal
  name        text not null,
  schema      jsonb not null default '{}',
  is_default  boolean not null default false,
  is_template boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- exactly one of user_id or org_id must be set
  constraint scorecard_owner_check check (
    (user_id is not null and org_id is null) or
    (user_id is null and org_id is not null) or
    (is_template = true)  -- templates have neither
  )
);

-- ============================================================
-- SCENARIOS
-- ============================================================

create table public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade,
  name            text not null,
  compiled_prompt text not null default '',
  raw_fields      jsonb not null default '{}',
  is_template     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint scenario_owner_check check (
    (user_id is not null and org_id is null) or
    (user_id is null and org_id is not null) or
    (is_template = true)
  )
);

-- ============================================================
-- SESSIONS
-- ============================================================

create type public.session_status as enum ('recording', 'scoring', 'scored', 'error');

create table public.sessions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  org_id                      uuid references public.organizations(id) on delete set null,
  scorecard_id                uuid references public.scorecards(id) on delete set null,
  scenario_id                 uuid references public.scenarios(id) on delete set null,
  elevenlabs_conversation_id  text,
  transcript                  text,
  status                      public.session_status not null default 'recording',
  duration_seconds            int,
  notes                       text,
  label                       text,
  is_public                   boolean not null default false,
  public_token                uuid unique default gen_random_uuid(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ============================================================
-- SCORECARD RESULTS
-- ============================================================

create table public.scorecard_results (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references public.sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  org_id        uuid references public.organizations(id) on delete set null,
  scorecard_id  uuid references public.scorecards(id) on delete set null,
  result        jsonb not null default '{}',
  overall_score int check (overall_score >= 0 and overall_score <= 100),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- SESSION TAGS
-- ============================================================

create table public.session_tags (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tag_name    text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, tag_name)
);

-- ============================================================
-- UPDATED_AT TRIGGER (shared)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.scorecards
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.scenarios
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.org_members (user_id);
create index on public.org_members (org_id);
create index on public.org_invites (token);
create index on public.org_invites (org_id);
create index on public.scorecards (user_id);
create index on public.scorecards (org_id);
create index on public.scenarios (user_id);
create index on public.scenarios (org_id);
create index on public.sessions (user_id);
create index on public.sessions (org_id);
create index on public.sessions (public_token);
create index on public.scorecard_results (session_id);
create index on public.session_tags (session_id);

-- ============================================================
-- HELPER FUNCTION: get current user's role in an org
-- ============================================================

create or replace function public.my_org_role(p_org_id uuid)
returns public.org_role language sql security definer stable as $$
  select role from public.org_members
  where org_id = p_org_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations      enable row level security;
alter table public.org_members        enable row level security;
alter table public.org_invites        enable row level security;
alter table public.user_settings      enable row level security;
alter table public.scorecards         enable row level security;
alter table public.scenarios          enable row level security;
alter table public.sessions           enable row level security;
alter table public.scorecard_results  enable row level security;
alter table public.session_tags       enable row level security;

-- ──────────────────────────────────────────────────────────
-- organizations
-- ──────────────────────────────────────────────────────────

-- Any member can read their org
create policy "org members can read their org"
  on public.organizations for select
  using (
    id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

-- Only owner can update org settings
create policy "owner can update org"
  on public.organizations for update
  using (owner_id = auth.uid());

-- Authenticated users can create orgs
create policy "authenticated users can create orgs"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- ──────────────────────────────────────────────────────────
-- org_members
-- ──────────────────────────────────────────────────────────

-- Members can see other members in their org
create policy "members can view org members"
  on public.org_members for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

-- Admin/owner can insert members (invite acceptance also inserts)
create policy "admin or owner can add members"
  on public.org_members for insert
  with check (
    public.my_org_role(org_id) in ('owner', 'admin')
    or user_id = auth.uid()  -- self-join via invite link
  );

-- Admin/owner can update member roles
create policy "admin or owner can update members"
  on public.org_members for update
  using (public.my_org_role(org_id) in ('owner', 'admin'));

-- Admin/owner can remove members (not the owner themselves)
create policy "admin or owner can delete members"
  on public.org_members for delete
  using (
    public.my_org_role(org_id) in ('owner', 'admin')
    and user_id != auth.uid()  -- can't remove yourself if you're the owner
  );

-- ──────────────────────────────────────────────────────────
-- org_invites
-- ──────────────────────────────────────────────────────────

-- Admin/owner can read invites for their org
create policy "admin or owner can read invites"
  on public.org_invites for select
  using (public.my_org_role(org_id) in ('owner', 'admin'));

-- Admin/owner can create invites
create policy "admin or owner can create invites"
  on public.org_invites for insert
  with check (public.my_org_role(org_id) in ('owner', 'admin'));

-- Admin/owner can delete/revoke invites
create policy "admin or owner can delete invites"
  on public.org_invites for delete
  using (public.my_org_role(org_id) in ('owner', 'admin'));

-- Anyone can read an invite by token (for accepting invite links — handled in app layer)
create policy "anyone can read invite by token"
  on public.org_invites for select
  using (true);  -- filtered by token in app code; low risk (token is a uuid secret)

-- ──────────────────────────────────────────────────────────
-- user_settings
-- ──────────────────────────────────────────────────────────

create policy "users can read own settings"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "users can insert own settings"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "users can update own settings"
  on public.user_settings for update
  using (user_id = auth.uid());

create policy "users can delete own settings"
  on public.user_settings for delete
  using (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- scorecards
-- ──────────────────────────────────────────────────────────

-- Personal: owner only; Org: all org members can read; templates: everyone
create policy "read scorecards"
  on public.scorecards for select
  using (
    is_template = true
    or user_id = auth.uid()
    or (
      org_id is not null
      and org_id in (
        select org_id from public.org_members where user_id = auth.uid()
      )
    )
  );

-- Personal: owner can write; Org: admin/owner only
create policy "write scorecards"
  on public.scorecards for insert
  with check (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "update scorecards"
  on public.scorecards for update
  using (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "delete scorecards"
  on public.scorecards for delete
  using (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

-- ──────────────────────────────────────────────────────────
-- scenarios (same pattern as scorecards)
-- ──────────────────────────────────────────────────────────

create policy "read scenarios"
  on public.scenarios for select
  using (
    is_template = true
    or user_id = auth.uid()
    or (
      org_id is not null
      and org_id in (
        select org_id from public.org_members where user_id = auth.uid()
      )
    )
  );

create policy "write scenarios"
  on public.scenarios for insert
  with check (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "update scenarios"
  on public.scenarios for update
  using (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "delete scenarios"
  on public.scenarios for delete
  using (
    (user_id = auth.uid() and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

-- ──────────────────────────────────────────────────────────
-- sessions
-- ──────────────────────────────────────────────────────────

-- Rep sees own; admin/owner sees all in their org; public token = anyone
create policy "read sessions"
  on public.sessions for select
  using (
    user_id = auth.uid()
    or (is_public = true)  -- public shared sessions
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "insert sessions"
  on public.sessions for insert
  with check (user_id = auth.uid());

create policy "update sessions"
  on public.sessions for update
  using (user_id = auth.uid());

create policy "delete sessions"
  on public.sessions for delete
  using (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- scorecard_results
-- ──────────────────────────────────────────────────────────

-- Same access pattern as sessions
create policy "read scorecard_results"
  on public.scorecard_results for select
  using (
    user_id = auth.uid()
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.is_public = true
    )
  );

-- Scoring workflow inserts results (uses service role key server-side)
create policy "insert scorecard_results"
  on public.scorecard_results for insert
  with check (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- session_tags
-- ──────────────────────────────────────────────────────────

create policy "read session_tags"
  on public.session_tags for select
  using (user_id = auth.uid());

create policy "write session_tags"
  on public.session_tags for insert
  with check (user_id = auth.uid());

create policy "delete session_tags"
  on public.session_tags for delete
  using (user_id = auth.uid());

-- ============================================================
-- SEED: Built-in scorecard templates
-- ============================================================

insert into public.scorecards (user_id, org_id, name, is_template, schema) values
(null, null, 'Discovery Call', true, '{
  "components": [
    {"name": "Opening", "component_present": null, "rubric_checkpoints": ["Introduced themselves clearly", "Set call agenda", "Asked permission to take notes"]},
    {"name": "Discovery Questions", "component_present": null, "rubric_checkpoints": ["Asked open-ended questions", "Uncovered pain points", "Quantified business impact"]},
    {"name": "Active Listening", "component_present": null, "rubric_checkpoints": ["Repeated back key points", "Asked follow-up questions", "Avoided interrupting"]},
    {"name": "Next Steps", "component_present": null, "rubric_checkpoints": ["Proposed clear next step", "Got verbal commitment", "Confirmed date/time"]}
  ]
}'::jsonb),

(null, null, 'Cold Call Opener', true, '{
  "components": [
    {"name": "Hook", "component_present": null, "rubric_checkpoints": ["Got past the first 10 seconds", "Used a pattern interrupt", "Referenced relevant context"]},
    {"name": "Value Prop", "component_present": null, "rubric_checkpoints": ["Stated value in one sentence", "Tied to prospect outcome", "Avoided feature dumping"]},
    {"name": "Permission Ask", "component_present": null, "rubric_checkpoints": ["Asked for 30 seconds", "Handled initial brush-off", "Secured next step or callback"]}
  ]
}'::jsonb),

(null, null, 'Objection Handling', true, '{
  "components": [
    {"name": "Acknowledge", "component_present": null, "rubric_checkpoints": ["Did not argue or deflect", "Validated the concern", "Paused before responding"]},
    {"name": "Clarify", "component_present": null, "rubric_checkpoints": ["Asked clarifying question", "Identified root objection", "Did not assume"]},
    {"name": "Respond", "component_present": null, "rubric_checkpoints": ["Addressed the specific concern", "Used social proof or data", "Checked if resolved"]}
  ]
}'::jsonb);

-- ============================================================
-- SEED: Built-in scenario templates
-- ============================================================

insert into public.scenarios (user_id, org_id, name, is_template, compiled_prompt, raw_fields) values
(null, null, 'The Skeptic', true,
$$You are a skeptical VP of Sales at a mid-size B2B SaaS company. You have been burned by vendors before and are resistant to new tools. Challenge every claim with "prove it" energy. Ask for data, references, and ROI. Do not make it easy for the rep. Your goal is NOT to buy — your goal is to poke holes. Raise at least 2 objections. Only warm up slightly if the rep directly addresses your specific concerns with evidence.$$,
'{"buyer_role": "VP of Sales", "company_context": "Mid-size B2B SaaS, 50-person sales team", "personality": "skeptical", "objections": ["We already tried something like this", "I don''t believe your ROI numbers"], "goal": "Stress-test the rep''s objection handling"}'::jsonb),

(null, null, 'The Friendly Champion', true,
$$You are a Sales Enablement Manager who is genuinely excited about improving your team's performance. You are warm, collaborative, and already sold on the concept. Your job in this roleplay is to help the rep practice discovery — ask them good questions back, share context about your org freely, and help them understand your buying process. You have a champion's energy but remind them they will need to convince your VP of Sales.$$,
'{"buyer_role": "Sales Enablement Manager", "company_context": "Enterprise SaaS, 200-person sales org", "personality": "friendly", "objections": ["You''ll need to get my VP on board"], "goal": "Practice discovery and multi-threading"}'::jsonb),

(null, null, 'The Budget Objector', true,
$$You are a Director of Revenue Operations at a startup. You are interested in what the rep is selling but budget is genuinely tight — you are in a spending freeze. You are not dismissive, just constrained. Raise the budget objection early and hold it firmly. You are open to creative solutions (pilot, phased rollout, deferred payment) if the rep thinks to propose them. Do not volunteer that you are open to alternatives — make them work for it.$$,
'{"buyer_role": "Director of Revenue Operations", "company_context": "Series B startup, 30-person sales team, spending freeze", "personality": "budget-constrained", "objections": ["We don''t have budget right now", "Can we revisit next quarter?"], "goal": "Practice budget objection handling and creative deal structuring"}'::jsonb);
