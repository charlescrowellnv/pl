import Link from "next/link"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ScorecardActions } from "@/components/scorecards/scorecard-actions"

export default async function ScorecardsPage() {
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const orgIds = user.orgs.map((o) => o.org.id)

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
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">Scorecards</h1>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Define what Claude evaluates in each session.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-none font-normal">
          <Link href="/scorecards/new">New Scorecard</Link>
        </Button>
      </div>

      <Section
        title="My Scorecards"
        empty="No personal scorecards yet."
        items={personal}
        componentCount={componentCount}
      />

      {org.length > 0 && (
        <Section
          title="Team Scorecards"
          items={org}
          componentCount={componentCount}
          orgNames={Object.fromEntries(user.orgs.map((o) => [o.org.id, o.org.name]))}
        />
      )}

      <Section
        title="Templates"
        items={templates}
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
  componentCount,
  orgNames,
  readOnly,
}: {
  title: string
  empty?: string
  items: Array<{ id: string; name: string; schema: unknown; user_id: string | null; org_id: string | null; is_template: boolean }>
  componentCount: (s: { schema: unknown }) => number
  orgNames?: Record<string, string>
  readOnly?: boolean
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      {items.length === 0 && empty ? (
        <p className="text-sm font-light text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y border">
          {items.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-6 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-normal text-sm">{s.name}</p>
                <p className="text-xs font-light text-muted-foreground">
                  {componentCount(s)} component{componentCount(s) !== 1 ? "s" : ""}
                  {s.org_id && orgNames?.[s.org_id] ? ` · ${orgNames[s.org_id]}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {readOnly ? (
                  <Button variant="outline" size="sm" asChild className="rounded-none font-normal">
                    <Link href={`/scorecards/new?template=${s.id}`}>Use template</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="rounded-none font-normal">
                      <Link href={`/scorecards/${s.id}/edit`}>Edit</Link>
                    </Button>
                    <ScorecardActions id={s.id} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
