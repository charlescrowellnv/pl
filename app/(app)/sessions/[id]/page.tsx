import { notFound } from "next/navigation"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { ScoreButton } from "@/components/sessions/score-button"
import { SessionLabel } from "@/components/sessions/session-label"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select(
      `
      id, label, status, duration_seconds, notes, transcript,
      elevenlabs_conversation_id, created_at,
      scenarios(name, raw_fields),
      scorecards(name),
      scorecard_results(result, overall_score)
    `
    )
    .eq("id", id)
    .or(`user_id.eq.${user.id}`)
    .single()

  if (!session) notFound()

  const scenario = session.scenarios as {
    name: string
    raw_fields: unknown
  } | null
  const scorecard = session.scorecards as { name: string } | null
  const result = session.scorecard_results as {
    result: unknown
    overall_score: number | null
  } | null

  const date = new Date(session.created_at).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const duration = session.duration_seconds
    ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
    : null

  const transcript = Array.isArray(session.transcript)
    ? (session.transcript as Array<{
        role: string
        message: string
        time_in_call_secs?: number
      }>)
    : []

  return (
    <div className="mx-auto space-y-8 p-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <SessionLabel
            sessionId={session.id}
            label={session.label}
            fallback={`Session — ${date}`}
          />
          <StatusDot status={session.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {[scenario?.name, scorecard?.name, duration]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {session.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            &ldquo;{session.notes}&rdquo;
          </p>
        )}
      </div>

      {/* Scorecard result */}
      {result && (
        <section className="space-y-3">
          <h2 className="text-xs font-light tracking-[0.2em] text-muted-foreground uppercase">
            Scorecard Results
          </h2>
          <div className="border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-6 border-b px-4 py-3">
              <span className="text-sm font-normal">
                {scorecard?.name ?? "Scorecard"}
              </span>
              {result.overall_score != null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-light">
                    {result.overall_score}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              )}
            </div>
            <ScoreComponents result={result.result} />
          </div>
        </section>
      )}

      {/* Score button — show when transcript is available but not yet scored */}
      {!result &&
        transcript.length > 0 &&
        !["scoring", "scored"].includes(session.status) && (
          <ScoreButton sessionId={session.id} />
        )}

      {/* Pending scoring */}
      {session.status === "scoring" && !result && (
        <section className="rounded-none border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Scoring in progress — check back in a moment.
          </p>
        </section>
      )}

      {/* Transcript */}
      <section className="space-y-4">
        <h2 className="text-xs font-light tracking-[0.2em] text-muted-foreground uppercase">
          Transcript
        </h2>
        {transcript.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {session.status === "recording"
              ? "Transcript not yet available."
              : "No transcript recorded."}
          </p>
        ) : (
          <div className="divide-y border">
            {transcript.map((turn, i) => (
              <div key={i} className="grid grid-cols-[56px_1fr]">
                <div className="border-r px-4 py-3">
                  <span className="text-xs font-light tracking-[0.15em] text-muted-foreground uppercase">
                    {turn.role === "user" ? "Rep" : "AI"}
                  </span>
                </div>
                <p className="px-4 py-3 text-sm font-light">{turn.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ScoreComponents({ result }: { result: unknown }) {
  if (!result || typeof result !== "object") return null
  const components = (
    result as {
      components?: Array<{
        name: string
        score: number | null
        feedback: string
      }>
    }
  ).components
  if (!components?.length) return null

  return (
    <div className="divide-y">
      {components.map((c, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-start gap-6 px-4 py-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-normal">{c.name}</p>
            {c.feedback && (
              <p className="text-xs leading-relaxed font-light text-muted-foreground">
                {c.feedback}
              </p>
            )}
          </div>
          {c.score != null && (
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs font-light">{c.score}</span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    recording: { label: "Recording", color: "bg-blue-500" },
    ready: { label: "Ready", color: "bg-purple-500" },
    scoring: { label: "Scoring…", color: "bg-yellow-500" },
    scored: { label: "Scored", color: "bg-green-500" },
    error: { label: "Error", color: "bg-red-500" },
  }
  const config = map[status] ?? { label: status, color: "bg-muted-foreground" }
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-light text-muted-foreground">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.color}`} />
      {config.label}
    </span>
  )
}
