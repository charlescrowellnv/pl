import { generateText, Output } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { outputSchema, addIds, schemaRules } from "../_schema-shared"

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  if (!description?.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    )
  }

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: outputSchema }),
    prompt: `You are a JSON schema designer. Given a description of what data needs to be captured, generate a structured schema with appropriate field names, types, and descriptions.

${schemaRules}

Description: ${description}`,
  })

  return NextResponse.json({
    name: output.name,
    fields: addIds(output.fields),
  })
}
