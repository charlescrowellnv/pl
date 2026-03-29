"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type OnboardingError = { message: string }

// ─── Solo setup ──────────────────────────────────────────────────────────────

export async function setupSolo(formData: FormData): Promise<OnboardingError | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const elKey     = (formData.get("elevenlabs_api_key") as string).trim()
  const agentId   = (formData.get("elevenlabs_agent_id") as string).trim()
  const anthropic = (formData.get("anthropic_api_key") as string | null)?.trim() || null

  if (!elKey || !agentId) {
    return { message: "ElevenLabs API key and Agent ID are required" }
  }

  // Store ElevenLabs key in Vault (also creates the user_settings row)
  const { error: elError } = await supabase.rpc("set_user_elevenlabs_key", { p_key: elKey })
  if (elError) return { message: elError.message }

  // Set agent ID (plain text — not a secret)
  const { error: agentError } = await supabase
    .from("user_settings")
    .update({ elevenlabs_agent_id: agentId })
    .eq("user_id", user.id)
  if (agentError) return { message: agentError.message }

  // Optionally store Anthropic key in Vault
  if (anthropic) {
    const { error: anError } = await supabase.rpc("set_user_anthropic_key", { p_key: anthropic })
    if (anError) return { message: anError.message }
  }

  redirect("/dashboard")
}

// ─── Create org ──────────────────────────────────────────────────────────────

export async function createOrg(formData: FormData): Promise<OnboardingError | void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const orgName   = (formData.get("org_name") as string).trim()
  const elKey     = (formData.get("elevenlabs_api_key") as string).trim()
  const agentId   = (formData.get("elevenlabs_agent_id") as string).trim()
  const anthropic = (formData.get("anthropic_api_key") as string | null)?.trim() || null

  if (!orgName)  return { message: "Organization name is required" }
  if (!elKey)    return { message: "ElevenLabs API key is required" }
  if (!agentId)  return { message: "ElevenLabs Agent ID is required" }

  // Generate slug from org name
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  // Create org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, slug, owner_id: user.id })
    .select()
    .single()

  if (orgError) {
    if (orgError.code === "23505") return { message: "An organization with that name already exists" }
    return { message: orgError.message }
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner", joined_at: new Date().toISOString() })
  if (memberError) return { message: memberError.message }

  // Store ElevenLabs key in Vault
  const { error: elError } = await supabase.rpc("set_org_elevenlabs_key", {
    p_org_id: org.id,
    p_key: elKey,
  })
  if (elError) return { message: elError.message }

  // Set agent ID (plain text)
  const { error: agentError } = await supabase
    .from("organizations")
    .update({ elevenlabs_agent_id: agentId })
    .eq("id", org.id)
  if (agentError) return { message: agentError.message }

  // Optionally store Anthropic key in Vault
  if (anthropic) {
    const { error: anError } = await supabase.rpc("set_org_anthropic_key", {
      p_org_id: org.id,
      p_key: anthropic,
    })
    if (anError) return { message: anError.message }
  }

  redirect("/dashboard")
}
