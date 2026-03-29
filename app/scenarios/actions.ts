"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { compileScenarioPrompt, type ScenarioRawFields } from "@/lib/scenarios"

export type SaveScenarioInput = {
  name: string
  orgId: string | null
  rawFields: ScenarioRawFields
}

export type ActionError = { message: string }

export async function saveScenario(
  input: SaveScenarioInput
): Promise<ActionError | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const { name, orgId, rawFields } = input
  if (!name.trim()) return { message: "Scenario name is required" }
  if (!rawFields.buyer_role.trim()) return { message: "Buyer role is required" }

  const compiled_prompt = compileScenarioPrompt(rawFields)

  const { error } = await supabase.from("scenarios").insert({
    name: name.trim(),
    user_id: orgId ? null : user.id,
    org_id: orgId ?? null,
    compiled_prompt,
    raw_fields: rawFields,
  })

  if (error) return { message: error.message }
  revalidatePath("/scenarios")
  redirect("/scenarios")
}

export async function updateScenario(
  id: string,
  input: SaveScenarioInput
): Promise<ActionError | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: "Not authenticated" }

  const { name, rawFields } = input
  if (!name.trim()) return { message: "Scenario name is required" }

  const compiled_prompt = compileScenarioPrompt(rawFields)

  const { error } = await supabase
    .from("scenarios")
    .update({
      name: name.trim(),
      compiled_prompt,
      raw_fields: rawFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { message: error.message }
  revalidatePath("/scenarios")
  redirect("/scenarios")
}

export async function deleteScenario(id: string): Promise<ActionError | void> {
  const supabase = await createClient()
  const { error } = await supabase.from("scenarios").delete().eq("id", id)
  if (error) return { message: error.message }
}
