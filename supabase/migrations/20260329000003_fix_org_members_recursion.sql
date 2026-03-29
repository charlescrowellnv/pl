-- ============================================================
-- Fix infinite recursion in org_members RLS policy.
-- The SELECT policy on org_members was querying org_members
-- itself, causing infinite recursion. Same issue affected
-- scorecards, scenarios, and sessions policies that use
-- inline subqueries against org_members.
--
-- Fix: introduce my_org_ids() SECURITY DEFINER function so
-- RLS subqueries bypass the org_members SELECT policy.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Helper: returns the org IDs the current user belongs to
-- SECURITY DEFINER = bypasses RLS on org_members
-- ──────────────────────────────────────────────────────────

create or replace function public.my_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select org_id from public.org_members
  where user_id = (select auth.uid())
$$;

-- ──────────────────────────────────────────────────────────
-- org_members: fix self-referential SELECT policy
-- ──────────────────────────────────────────────────────────

drop policy if exists "members can view org members" on public.org_members;

create policy "members can view org members"
  on public.org_members
  for select
  to authenticated
  using (
    org_id in (select public.my_org_ids())
  );

-- ──────────────────────────────────────────────────────────
-- organizations: fix inline org_members subquery
-- ──────────────────────────────────────────────────────────

drop policy if exists "org members can read their org" on public.organizations;

create policy "org members can read their org"
  on public.organizations
  for select
  to authenticated
  using (
    id in (select public.my_org_ids())
  );

-- ──────────────────────────────────────────────────────────
-- scorecards: fix inline org_members subquery
-- ──────────────────────────────────────────────────────────

drop policy if exists "read scorecards" on public.scorecards;

create policy "read scorecards"
  on public.scorecards
  for select
  to authenticated
  using (
    is_template = true
    or user_id = (select auth.uid())
    or (
      org_id is not null
      and org_id in (select public.my_org_ids())
    )
  );

-- ──────────────────────────────────────────────────────────
-- scenarios: fix inline org_members subquery
-- ──────────────────────────────────────────────────────────

drop policy if exists "read scenarios" on public.scenarios;

create policy "read scenarios"
  on public.scenarios
  for select
  to authenticated
  using (
    is_template = true
    or user_id = (select auth.uid())
    or (
      org_id is not null
      and org_id in (select public.my_org_ids())
    )
  );

-- ──────────────────────────────────────────────────────────
-- sessions: fix inline my_org_role call (it queries org_members
-- via SECURITY DEFINER so is fine, but make consistent)
-- ──────────────────────────────────────────────────────────

drop policy if exists "read sessions" on public.sessions;

create policy "read sessions"
  on public.sessions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or is_public = true
    or (
      org_id is not null
      and org_id in (select public.my_org_ids())
      and public.my_org_role(org_id) in ('owner', 'admin')
    )
  );
