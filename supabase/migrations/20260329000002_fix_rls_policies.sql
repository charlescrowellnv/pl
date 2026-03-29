-- ============================================================
-- Fix RLS Policies
-- - Add TO authenticated to all policies
-- - Wrap auth.uid() in (select auth.uid()) for per-query eval
-- - Fix my_org_role: add set search_path = ''
-- - Consolidate duplicate org_invites SELECT policies
-- Affected tables: all
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Fix my_org_role helper (add set search_path = '')
-- ──────────────────────────────────────────────────────────

create or replace function public.my_org_role(p_org_id uuid)
returns public.org_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.org_members
  where org_id = p_org_id
    and user_id = (select auth.uid())
  limit 1;
$$;

-- ──────────────────────────────────────────────────────────
-- organizations
-- ──────────────────────────────────────────────────────────

drop policy if exists "org members can read their org" on public.organizations;
drop policy if exists "owner can update org" on public.organizations;
drop policy if exists "authenticated users can create orgs" on public.organizations;

create policy "org members can read their org"
  on public.organizations
  for select
  to authenticated
  using (
    id in (
      select org_id from public.org_members
      where user_id = (select auth.uid())
    )
  );

create policy "authenticated users can create orgs"
  on public.organizations
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "owner can update org"
  on public.organizations
  for update
  to authenticated
  using (owner_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────
-- org_members
-- ──────────────────────────────────────────────────────────

drop policy if exists "members can view org members" on public.org_members;
drop policy if exists "admin or owner can add members" on public.org_members;
drop policy if exists "admin or owner can update members" on public.org_members;
drop policy if exists "admin or owner can delete members" on public.org_members;

create policy "members can view org members"
  on public.org_members
  for select
  to authenticated
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = (select auth.uid())
    )
  );

create policy "admin or owner can add members"
  on public.org_members
  for insert
  to authenticated
  with check (
    public.my_org_role(org_id) in ('owner', 'admin')
    or user_id = (select auth.uid())  -- self-join via invite link
  );

create policy "admin or owner can update members"
  on public.org_members
  for update
  to authenticated
  using (public.my_org_role(org_id) in ('owner', 'admin'));

create policy "admin or owner can delete members"
  on public.org_members
  for delete
  to authenticated
  using (
    public.my_org_role(org_id) in ('owner', 'admin')
    and user_id != (select auth.uid())
  );

-- ──────────────────────────────────────────────────────────
-- org_invites
-- Drop both old SELECT policies and replace with one that
-- allows admin/owner to list, plus anyone to look up by token
-- ──────────────────────────────────────────────────────────

drop policy if exists "admin or owner can read invites" on public.org_invites;
drop policy if exists "anyone can read invite by token" on public.org_invites;
drop policy if exists "admin or owner can create invites" on public.org_invites;
drop policy if exists "admin or owner can delete invites" on public.org_invites;

-- Admins/owners can list all invites for their org;
-- any authenticated user can look up a specific invite (for accept-by-link flow)
create policy "read org invites"
  on public.org_invites
  for select
  to authenticated
  using (
    public.my_org_role(org_id) in ('owner', 'admin')
    or (select auth.uid()) is not null  -- any authed user can fetch by token in app code
  );

create policy "admin or owner can create invites"
  on public.org_invites
  for insert
  to authenticated
  with check (public.my_org_role(org_id) in ('owner', 'admin'));

create policy "admin or owner can delete invites"
  on public.org_invites
  for delete
  to authenticated
  using (public.my_org_role(org_id) in ('owner', 'admin'));

-- ──────────────────────────────────────────────────────────
-- user_settings
-- ──────────────────────────────────────────────────────────

drop policy if exists "users can read own settings" on public.user_settings;
drop policy if exists "users can insert own settings" on public.user_settings;
drop policy if exists "users can update own settings" on public.user_settings;
drop policy if exists "users can delete own settings" on public.user_settings;

create policy "users can read own settings"
  on public.user_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users can insert own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users can update own settings"
  on public.user_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()));

create policy "users can delete own settings"
  on public.user_settings
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────
-- scorecards
-- ──────────────────────────────────────────────────────────

drop policy if exists "read scorecards" on public.scorecards;
drop policy if exists "write scorecards" on public.scorecards;
drop policy if exists "update scorecards" on public.scorecards;
drop policy if exists "delete scorecards" on public.scorecards;

create policy "read scorecards"
  on public.scorecards
  for select
  to authenticated
  using (
    is_template = true
    or user_id = (select auth.uid())
    or (
      org_id is not null
      and org_id in (
        select org_id from public.org_members
        where user_id = (select auth.uid())
      )
    )
  );

create policy "insert scorecards"
  on public.scorecards
  for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "update scorecards"
  on public.scorecards
  for update
  to authenticated
  using (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "delete scorecards"
  on public.scorecards
  for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

-- ──────────────────────────────────────────────────────────
-- scenarios
-- ──────────────────────────────────────────────────────────

drop policy if exists "read scenarios" on public.scenarios;
drop policy if exists "write scenarios" on public.scenarios;
drop policy if exists "update scenarios" on public.scenarios;
drop policy if exists "delete scenarios" on public.scenarios;

create policy "read scenarios"
  on public.scenarios
  for select
  to authenticated
  using (
    is_template = true
    or user_id = (select auth.uid())
    or (
      org_id is not null
      and org_id in (
        select org_id from public.org_members
        where user_id = (select auth.uid())
      )
    )
  );

create policy "insert scenarios"
  on public.scenarios
  for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "update scenarios"
  on public.scenarios
  for update
  to authenticated
  using (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "delete scenarios"
  on public.scenarios
  for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and org_id is null)
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

-- ──────────────────────────────────────────────────────────
-- sessions
-- ──────────────────────────────────────────────────────────

drop policy if exists "read sessions" on public.sessions;
drop policy if exists "insert sessions" on public.sessions;
drop policy if exists "update sessions" on public.sessions;
drop policy if exists "delete sessions" on public.sessions;

create policy "read sessions"
  on public.sessions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or is_public = true
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );

create policy "insert sessions"
  on public.sessions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "update sessions"
  on public.sessions
  for update
  to authenticated
  using (user_id = (select auth.uid()));

create policy "delete sessions"
  on public.sessions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────
-- scorecard_results
-- ──────────────────────────────────────────────────────────

drop policy if exists "read scorecard_results" on public.scorecard_results;
drop policy if exists "insert scorecard_results" on public.scorecard_results;

create policy "read scorecard_results"
  on public.scorecard_results
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      org_id is not null
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.is_public = true
    )
  );

create policy "insert scorecard_results"
  on public.scorecard_results
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────
-- session_tags
-- ──────────────────────────────────────────────────────────

drop policy if exists "read session_tags" on public.session_tags;
drop policy if exists "write session_tags" on public.session_tags;
drop policy if exists "delete session_tags" on public.session_tags;

create policy "read session_tags"
  on public.session_tags
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "insert session_tags"
  on public.session_tags
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "delete session_tags"
  on public.session_tags
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
