import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type OrgRole = Database["public"]["Enums"]["org_role"]

export type UserOrg = {
  org: Database["public"]["Tables"]["organizations"]["Row"]
  role: OrgRole
}

export type AppUser = {
  id: string
  email: string
  settings: Database["public"]["Tables"]["user_settings"]["Row"] | null
  orgs: UserOrg[]
}

/**
 * Server-only helper. Returns the current authenticated user with their
 * settings and org memberships. Redirects to /auth/login if unauthenticated.
 */
export async function getUser(): Promise<AppUser> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect("/auth/login")
  }

  const claims = data.claims as unknown as { id: string; email: string; sub: string }
  const id = claims.sub ?? claims.id
  const email = claims.email

  const [settingsResult, membersResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("role, organizations(*)")
      .eq("user_id", id),
  ])

  const orgs: UserOrg[] = (membersResult.data ?? []).flatMap((m) => {
    if (!m.organizations) return []
    return [{ org: m.organizations as Database["public"]["Tables"]["organizations"]["Row"], role: m.role }]
  })

  return {
    id,
    email,
    settings: settingsResult.data ?? null,
    orgs,
  }
}

/**
 * Like getUser(), but also redirects to /onboarding if the user has no
 * settings and no org membership. Use this in all (app) layouts/pages.
 */
export async function getOnboardedUser(): Promise<AppUser> {
  const user = await getUser()
  if (!user.settings && user.orgs.length === 0) {
    redirect("/onboarding")
  }
  return user
}

/**
 * Returns the user's role in a specific org, or null if not a member.
 */
export function getOrgRole(user: AppUser, orgId: string): OrgRole | null {
  return user.orgs.find((o) => o.org.id === orgId)?.role ?? null
}

/**
 * Fetches resolved (decrypted) keys for the current user from Vault via RPC.
 * Resolution order: personal key → org key → null.
 * Must be called server-side with the user's session client.
 */
export async function resolveKeys(orgId?: string | null | undefined) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("get_resolved_keys", { p_org_id: orgId ?? undefined })
    .single()

  if (error || !data) {
    return { elevenLabsApiKey: null, elevenLabsAgentId: null, anthropicApiKey: null, source: "none" as const }
  }

  return {
    elevenLabsApiKey: data.elevenlabs_api_key ?? null,
    elevenLabsAgentId: data.elevenlabs_agent_id ?? null,
    anthropicApiKey: data.anthropic_api_key ?? null,
    source: (data.source ?? "none") as "personal" | "org" | "none",
  }
}
