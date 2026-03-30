import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"

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
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground font-light">Your practice history.</p>
        </div>
        <Button asChild variant="outline" className="rounded-none font-normal">
          <Link href="/sessions/new">New Session</Link>
        </Button>
      </div>

      {(sessions ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
          <p>No sessions yet.</p>
          <Button asChild variant="outline" className="rounded-none font-normal">
            <Link href="/sessions/new">Start your first session</Link>
          </Button>
        </div>
      ) : (
        <ItemGroup className="gap-0 divide-y divide-border">
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
              <Item
                key={s.id}
                asChild
                variant="default"
                className="rounded-none border-0 py-3.5 hover:bg-accent/40 transition-colors"
              >
                <Link href={`/sessions/${s.id}`}>
                  <ItemContent>
                    <ItemTitle className="font-normal">
                      {s.label ?? `Session — ${date}`}
                    </ItemTitle>
                    <ItemDescription className="font-light">
                      {[scenario?.name, scorecard?.name].filter(Boolean).join(" · ")}
                      {duration ? ` · ${duration}` : ""}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <StatusDot status={s.status} />
                  </ItemActions>
                </Link>
              </Item>
            )
          })}
        </ItemGroup>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    recording: { label: "Recording", color: "bg-blue-500" },
    ready:     { label: "Ready",     color: "bg-purple-500" },
    scoring:   { label: "Scoring…",  color: "bg-yellow-500" },
    scored:    { label: "Scored",    color: "bg-green-500" },
    error:     { label: "Error",     color: "bg-red-500" },
  }
  const config = map[status] ?? { label: status, color: "bg-muted-foreground" }
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-light text-muted-foreground">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.color}`} />
      {config.label}
    </span>
  )
}
