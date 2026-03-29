"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ScorecardComponentInput = {
  name: string
  rubric_checkpoints: string[]
}

export type SaveScorecardInput = {
  name: string
  orgId: string | null
  components: ScorecardComponentInput[]
}

export type ActionError = { message: string }

export async function saveScorecard(
  input: SaveScorecardInput
): Promise<ActionError | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const { name, orgId, components } = input

  if (!name.trim()) return { message: "Scorecard name is required" }
  if (components.length === 0) return { message: "Add at least one component" }

  const schema = { components }

  const { error } = await supabase.from("scorecards").insert({
    name: name.trim(),
    user_id: orgId ? null : user.id,
    org_id: orgId ?? null,
    schema,
  })

  if (error) return { message: error.message }
  revalidatePath("/scorecards")
  redirect("/scorecards")
}

export async function updateScorecard(
  id: string,
  input: SaveScorecardInput
): Promise<ActionError | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const { name, components } = input
  if (!name.trim()) return { message: "Scorecard name is required" }

  const { error } = await supabase
    .from("scorecards")
    .update({ name: name.trim(), schema: { components }, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { message: error.message }
  revalidatePath("/scorecards")
  redirect("/scorecards")
}

export async function deleteScorecard(id: string): Promise<ActionError | void> {
  const supabase = await createClient()
  const { error } = await supabase.from("scorecards").delete().eq("id", id)
  if (error) return { message: error.message }
}
