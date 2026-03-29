import { generateText, Output } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const scenarioSchema = z.object({
  name: z.string().describe("Short scenario name, e.g. 'The Skeptic'"),
  buyer_role: z.string().describe("Buyer's job title, e.g. 'VP of Sales'"),
  company_context: z
    .string()
    .describe("Company description: industry, size, relevant context"),
  personality: z
    .string()
    .describe("One or two words describing the buyer's personality, e.g. 'skeptical', 'friendly but busy'"),
  objections: z
    .array(z.string())
    .describe("2–4 specific objections the buyer will raise"),
  goal: z
    .string()
    .describe("What the rep should achieve, e.g. 'Book a 30-minute discovery call'"),
  information_to_withhold: z
    .string()
    .describe("Information the buyer won't volunteer unless directly asked. Empty string if none."),
  additional_notes: z
    .string()
    .describe("Any extra roleplay instructions for the buyer. Empty string if none."),
})

export type GeneratedScenario = z.infer<typeof scenarioSchema>

export async function POST(req: NextRequest) {
  const { description } = await req.json()
  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  }

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: scenarioSchema }),
    prompt: `You are a sales training expert. Create a detailed buyer persona for a sales roleplay scenario.

The persona will be used as a system prompt for an AI voice agent that a sales rep will practice against.

Make the scenario realistic and challenging — enough detail to make the roleplay feel authentic, but not so complex that it's impossible.
Objections should be natural and specific to the context.

Description: ${description}`,
  })

  return NextResponse.json(output)
}
