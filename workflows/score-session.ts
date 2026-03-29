import { FatalError } from "workflow"
import { createClient } from "@supabase/supabase-js"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

// ── Types ────────────────────────────────────────────────────────────────────

type TranscriptTurn = { role: string; message: string }

type ScorecardComponent = {
  name: string
  rubric_checkpoints: string[]
}

type ScorecardSchema = {
  components: ScorecardComponent[]
}

// ── Steps ────────────────────────────────────────────────────────────────────

async function fetchSessionData(sessionId: string) {
  "use step"

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("sessions")
    .select("id, transcript, scorecards(name, schema), scenarios(name)")
    .eq("id", sessionId)
    .single()

  if (error || !data) throw new FatalError(`Session not found: ${sessionId}`)

  const transcript = Array.isArray(data.transcript)
    ? (data.transcript as TranscriptTurn[])
    : []
  const scorecard = (
    Array.isArray(data.scorecards) ? data.scorecards[0] : data.scorecards
  ) as { name: string; schema: ScorecardSchema } | null
  const scenario = (
    Array.isArray(data.scenarios) ? data.scenarios[0] : data.scenarios
  ) as { name: string } | null

  if (!scorecard) throw new FatalError("No scorecard linked to session")
  if (transcript.length === 0) throw new FatalError("Transcript is empty")

  return {
    transcript,
    scorecardName: scorecard.name,
    scorecardSchema: scorecard.schema,
    scenarioName: scenario?.name ?? "Unknown Scenario",
  }
}

async function scoreTranscript(params: {
  transcript: TranscriptTurn[]
  scorecardName: string
  scorecardSchema: ScorecardSchema
  scenarioName: string
}) {
  "use step"

  const { transcript, scorecardName, scorecardSchema, scenarioName } = params
  const components = scorecardSchema.components ?? []

  const transcriptText = transcript
    .map((t) => `${t.role === "user" ? "REP" : "PROSPECT"}: ${t.message}`)
    .join("\n")

  const componentDescriptions = components
    .map((c, i) => {
      const checkpoints =
        c.rubric_checkpoints.length > 0
          ? c.rubric_checkpoints.map((cp) => `  - ${cp}`).join("\n")
          : "  - (no specific checkpoints defined)"
      return `${i + 1}. ${c.name}\n${checkpoints}`
    })
    .join("\n\n")

  const ComponentResultSchema = z.object({
    name: z.string(),
    score: z.number(),
    feedback: z.string(),
  })

  const ResultSchema = z.object({
    components: z.array(ComponentResultSchema),
    overall_score: z.number(),
    summary: z.string(),
  })

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: ResultSchema,
    messages: [
      {
        role: "user",
        content: `You are an expert sales coach evaluating a roleplay session.

Scenario: ${scenarioName}
Scorecard: ${scorecardName}

## Scorecard Components
${componentDescriptions}

## Transcript
${transcriptText}

Score each component 0–10 based on the rubric checkpoints. Then give an overall score 0–100 (weighted average, or your best judgment). Be specific and actionable in feedback.`,
      },
    ],
  })

  return object
}

async function saveResults(params: {
  sessionId: string
  result: {
    components: Array<{ name: string; score: number; feedback: string }>
    overall_score: number
    summary: string
  }
}) {
  "use step"

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user_id and scorecard_id from session
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, org_id, scorecard_id")
    .eq("id", params.sessionId)
    .single()

  if (!session) throw new FatalError("Session missing for result save")

  const { error: insertError } = await supabase
    .from("scorecard_results")
    .upsert({
      session_id: params.sessionId,
      user_id: session.user_id,
      org_id: session.org_id,
      scorecard_id: session.scorecard_id,
      result: {
        components: params.result.components,
        summary: params.result.summary,
      },
      overall_score: params.result.overall_score,
    })

  if (insertError)
    throw new Error(`Failed to save results: ${insertError.message}`)

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "scored" })
    .eq("id", params.sessionId)

  if (updateError)
    throw new Error(`Failed to update session status: ${updateError.message}`)
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export async function scoreSession(sessionId: string) {
  "use workflow"

  const sessionData = await fetchSessionData(sessionId)
  const result = await scoreTranscript(sessionData)
  await saveResults({ sessionId, result })

  return { sessionId, overall_score: result.overall_score }
}
