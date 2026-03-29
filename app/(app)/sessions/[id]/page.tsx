import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ScoreButton } from "@/components/sessions/score-button"

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
    .select(`
      id, label, status, duration_seconds, notes, transcript,
      elevenlabs_conversation_id, created_at,
      scenarios(name, raw_fields),
      scorecards(name),
      scorecard_results(result, overall_score)
    `)
    .eq("id", id)
    .or(`user_id.eq.${user.id}`)
    .single()

  if (!session) notFound()

  const scenario  = session.scenarios  as { name: string; raw_fields: unknown } | null
  const scorecard = session.scorecards as { name: string } | null
  const result    = (session.scorecard_results as { result: unknown; overall_score: number | null } | null)

  const date = new Date(session.created_at).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  })
  const duration = session.duration_seconds
    ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
    : null

  const transcript = Array.isArray(session.transcript)
    ? (session.transcript as Array<{ role: string; message: string; time_in_call_secs?: number }>)
    : []

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      {/* Back */}
      <Link
        href="/sessions"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Sessions
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {session.label ?? `Session — ${date}`}
          </h1>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {[scenario?.name, scorecard?.name, duration].filter(Boolean).join(" · ")}
        </p>
        {session.notes && (
          <p className="text-muted-foreground mt-2 text-sm italic">
            &ldquo;{session.notes}&rdquo;
          </p>
        )}
      </div>

      {/* Scorecard result */}
      {result && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Scorecard Results
          </h2>
          {result.overall_score != null && (
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">{result.overall_score}</span>
              <span className="text-muted-foreground text-sm">/ 100</span>
            </div>
          )}
          <ScoreComponents result={result.result} />
        </section>
      )}

      {/* Score button — show when transcript is available but not yet scored */}
      {!result && transcript.length > 0 && !["scoring", "scored"].includes(session.status) && (
        <ScoreButton sessionId={session.id} />
      )}

      {/* Pending scoring */}
      {session.status === "scoring" && !result && (
        <section className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Scoring in progress — check back in a moment.
          </p>
        </section>
      )}

      {/* Transcript */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Transcript
        </h2>
        {transcript.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {session.status === "recording"
              ? "Transcript not yet available."
              : "No transcript recorded."}
          </p>
        ) : (
          <div className="space-y-3">
            {transcript.map((turn, i) => (
              <div
                key={i}
                className={`flex gap-3 ${turn.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    turn.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {turn.message}
                </div>
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
  const components = (result as { components?: Array<{ name: string; score: number | null; feedback: string }> })
    .components
  if (!components?.length) return null

  return (
    <div className="space-y-3">
      {components.map((c, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{c.name}</p>
            {c.score != null && (
              <span className="text-sm font-mono">{c.score}/10</span>
            )}
          </div>
          {c.feedback && (
            <p className="text-muted-foreground text-xs">{c.feedback}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    recording: { label: "Recording", className: "bg-blue-500/10 text-blue-600" },
    ready:     { label: "Ready",     className: "bg-purple-500/10 text-purple-600" },
    scoring:   { label: "Scoring…",  className: "bg-yellow-500/10 text-yellow-600" },
    scored:    { label: "Scored",    className: "bg-green-500/10 text-green-600" },
    error:     { label: "Error",     className: "bg-red-500/10 text-red-600" },
  }
  const config = map[status] ?? { label: status, className: "" }
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
