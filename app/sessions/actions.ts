"use server"

import { createClient } from "@/lib/supabase/server"

export type CreateSessionInput = {
  scorecardId: string
  scenarioId: string
  notes: string
  orgId: string | null
}

export type SessionActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createSession(
  input: CreateSessionInput
): Promise<SessionActionResult<{ sessionId: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      org_id: input.orgId ?? null,
      scorecard_id: input.scorecardId,
      scenario_id: input.scenarioId,
      notes: input.notes || null,
      status: "recording",
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create session" }
  return { ok: true, data: { sessionId: data.id } }
}

export async function completeSession(
  sessionId: string,
  conversationId: string,
  durationSeconds: number
): Promise<SessionActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("sessions")
    .update({
      elevenlabs_conversation_id: conversationId,
      duration_seconds: durationSeconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}
