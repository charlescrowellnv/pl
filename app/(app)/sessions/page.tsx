import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"

export default async function SessionsPage() {
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const orgIds = user.orgs.map((o) => o.org.id)

  const { data: sessions = [] } = await supabase
    .from("sessions")
    .select("id, label, status, duration_seconds, created_at, scenario_id, scorecard_id, scenarios(name), scorecards(name)")
    .or(
      [
        `user_id.eq.${user.id}`,
        orgIds.length > 0 ? `org_id.in.(${orgIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your practice history.</p>
        </div>
        <Button asChild>
          <Link href="/sessions/new">
            <PlusIcon className="h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {(sessions ?? []).length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-24 text-sm">
          <p>No sessions yet.</p>
          <Button asChild variant="outline">
            <Link href="/sessions/new">Start your first session</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(sessions ?? []).map((s) => {
            const scenario  = s.scenarios as { name: string } | null
            const scorecard = s.scorecards as { name: string } | null
            const duration  = s.duration_seconds
              ? `${Math.floor(s.duration_seconds / 60)}m ${s.duration_seconds % 60}s`
              : null
            const date = new Date(s.created_at).toLocaleDateString(undefined, {
              month: "short", day: "numeric", year: "numeric",
            })

            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="border-border hover:bg-accent flex items-center justify-between rounded-lg border p-4 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-medium truncate">
                    {s.label ?? `Session — ${date}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[scenario?.name, scorecard?.name].filter(Boolean).join(" · ")}
                    {duration ? ` · ${duration}` : ""}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            )
          })}
        </div>
      )}
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
