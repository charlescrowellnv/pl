import { generateText, Output } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const scorecardSchema = z.object({
  name: z.string().describe("Short, descriptive scorecard name"),
  components: z.array(
    z.object({
      name: z.string().describe("Component name, e.g. 'Opening', 'Discovery Questions'"),
      rubric_checkpoints: z
        .array(z.string())
        .describe("Specific yes/no questions Claude will evaluate, e.g. 'Did the rep introduce themselves clearly?'"),
    })
  ),
})

export async function POST(req: NextRequest) {
  const { description } = await req.json()
  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  }

  const { output } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    output: Output.object({ schema: scorecardSchema }),
    prompt: `You are a sales coaching expert. Generate a scorecard for evaluating a sales roleplay session.

A scorecard has named components (phases or skills to evaluate) each with rubric checkpoints — specific yes/no questions that a coach would use to evaluate the rep.

Rules:
- 3–6 components per scorecard
- 2–5 rubric checkpoints per component
- Checkpoints should be phrased as yes/no questions or observable behaviors
- Be specific, not vague ("Did the rep ask an open-ended question about budget?" not "Was discovery good?")

Description: ${description}`,
  })

  return NextResponse.json(output)
}
