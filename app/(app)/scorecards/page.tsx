import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScorecardActions } from "@/components/scorecards/scorecard-actions"

export default async function ScorecardsPage() {
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const orgIds = user.orgs.map((o) => o.org.id)

  // Fetch all scorecards visible to this user in one query
  const { data: scorecards = [] } = await supabase
    .from("scorecards")
    .select("id, name, schema, is_template, user_id, org_id, created_at")
    .or(
      [
        "is_template.eq.true",
        `user_id.eq.${user.id}`,
        orgIds.length > 0 ? `org_id.in.(${orgIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .order("created_at", { ascending: false })


  const templates = (scorecards ?? []).filter((s) => s.is_template)
  const personal  = (scorecards ?? []).filter((s) => s.user_id === user.id && !s.is_template)
  const org       = (scorecards ?? []).filter((s) => s.org_id && !s.is_template)

  const componentCount = (s: { schema: unknown }) => {
    const schema = s.schema as { components?: unknown[] } | null
    return schema?.components?.length ?? 0
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scorecards</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define what Claude evaluates in each session.
          </p>
        </div>
        <Button asChild>
          <Link href="/scorecards/new">
            <PlusIcon className="h-4 w-4" />
            New Scorecard
          </Link>
        </Button>
      </div>

      {/* Personal */}
      <Section
        title="My Scorecards"
        empty="No personal scorecards yet."
        items={personal}
        userId={user.id}
        componentCount={componentCount}
      />

      {/* Org */}
      {org.length > 0 && (
        <Section
          title="Team Scorecards"
          items={org}
          userId={user.id}
          componentCount={componentCount}
          orgNames={Object.fromEntries(user.orgs.map((o) => [o.org.id, o.org.name]))}
        />
      )}

      {/* Templates */}
      <Section
        title="Templates"
        items={templates}
        userId={user.id}
        componentCount={componentCount}
        readOnly
      />
    </div>
  )
}

function Section({
  title,
  empty,
  items,
  userId,
  componentCount,
  orgNames,
  readOnly,
}: {
  title: string
  empty?: string
  items: Array<{ id: string; name: string; schema: unknown; user_id: string | null; org_id: string | null; is_template: boolean }>
  userId: string
  componentCount: (s: { schema: unknown }) => number
  orgNames?: Record<string, string>
  readOnly?: boolean
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {items.length === 0 && empty ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div
              key={s.id}
              className="border-border rounded-lg border p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {componentCount(s)} component{componentCount(s) !== 1 ? "s" : ""}
                  </p>
                </div>
                {s.org_id && orgNames?.[s.org_id] && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {orgNames[s.org_id]}
                  </Badge>
                )}
              </div>
              {!readOnly && (
                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/scorecards/${s.id}/edit`}>Edit</Link>
                  </Button>
                  <ScorecardActions id={s.id} />
                </div>
              )}
              {readOnly && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/scorecards/new?template=${s.id}`}>Use template</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
