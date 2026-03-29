import { generateText, Output } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { outputSchema, addIds, schemaRules } from "../_schema-shared"

export async function POST(req: NextRequest) {
  const { instruction, currentSchema } = await req.json()

  if (!instruction?.trim()) {
    return NextResponse.json(
      { error: "Instruction is required" },
      { status: 400 }
    )
  }

  if (!currentSchema) {
    return NextResponse.json(
      { error: "Current schema is required" },
      { status: 400 }
    )
  }

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: outputSchema }),
    prompt: `You are a JSON schema designer. You will be given an existing schema and an instruction describing changes to make. Return the full updated schema incorporating those changes.

${schemaRules}
- Preserve existing fields unless the instruction explicitly removes or renames them
- Only modify what the instruction asks for

Current schema (JSON):
${JSON.stringify(currentSchema, null, 2)}

Instruction: ${instruction}`,
  })

  return NextResponse.json({
    name: output.name,
    fields: addIds(output.fields),
  })
}
