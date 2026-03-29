export type ScenarioRawFields = {
  buyer_role: string
  company_context: string
  personality: string
  objections: string[]
  goal: string
  information_to_withhold?: string
  additional_notes?: string
}

/**
 * Compiles raw scenario fields into a system prompt string
 * injected into the ElevenLabs agent before a session starts.
 */
export function compileScenarioPrompt(fields: ScenarioRawFields): string {
  const parts: string[] = []

  parts.push(
    `You are a ${fields.buyer_role}${fields.company_context ? ` at ${fields.company_context}` : ""}.`
  )

  if (fields.personality) {
    parts.push(`\nPersonality: ${fields.personality}.`)
  }

  if (fields.objections.length > 0) {
    parts.push(
      `\nObjections to raise during the conversation:\n${fields.objections.map((o) => `- ${o}`).join("\n")}`
    )
  }

  if (fields.goal) {
    parts.push(`\nThe rep's goal is to: ${fields.goal}. Make them work for it.`)
  }

  if (fields.information_to_withhold?.trim()) {
    parts.push(
      `\nDo not volunteer the following unless the rep asks directly:\n${fields.information_to_withhold}`
    )
  }

  if (fields.additional_notes?.trim()) {
    parts.push(`\n${fields.additional_notes}`)
  }

  return parts.join("").trim()
}
