import Link from "next/link"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ScenarioActions } from "@/components/scenarios/scenario-actions"

export default async function ScenariosPage() {
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const orgIds = user.orgs.map((o) => o.org.id)

  const { data: scenarios = [] } = await supabase
    .from("scenarios")
    .select("id, name, raw_fields, is_template, user_id, org_id, created_at")
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

  const templates = (scenarios ?? []).filter((s) => s.is_template)
  const personal  = (scenarios ?? []).filter((s) => s.user_id === user.id && !s.is_template)
  const org       = (scenarios ?? []).filter((s) => s.org_id && !s.is_template)

  const orgNames = Object.fromEntries(user.orgs.map((o) => [o.org.id, o.org.name]))

  const meta = (s: { raw_fields: unknown }) => {
    const f = s.raw_fields as { buyer_role?: string; personality?: string } | null
    return [f?.buyer_role, f?.personality].filter(Boolean).join(" · ") || null
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">Scenarios</h1>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Buyer personas injected into the voice agent before each session.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-none font-normal">
          <Link href="/scenarios/new">New Scenario</Link>
        </Button>
      </div>

      <Section title="My Scenarios" empty="No personal scenarios yet." items={personal} orgNames={orgNames} meta={meta} />
      {org.length > 0 && <Section title="Team Scenarios" items={org} orgNames={orgNames} meta={meta} />}
      <Section title="Templates" items={templates} orgNames={orgNames} meta={meta} readOnly />
    </div>
  )
}

type ScenarioRow = {
  id: string
  name: string
  raw_fields: unknown
  user_id: string | null
  org_id: string | null
  is_template: boolean
}

function Section({
  title,
  empty,
  items,
  orgNames,
  meta,
  readOnly,
}: {
  title: string
  empty?: string
  items: ScenarioRow[]
  orgNames: Record<string, string>
  meta: (s: ScenarioRow) => string | null
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
                  {meta(s)}
                  {s.org_id && orgNames[s.org_id] ? ` · ${orgNames[s.org_id]}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {readOnly ? (
                  <Button variant="outline" size="sm" asChild className="rounded-none font-normal">
                    <Link href={`/scenarios/new?template=${s.id}`}>Use template</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="rounded-none font-normal">
                      <Link href={`/scenarios/${s.id}/edit`}>Edit</Link>
                    </Button>
                    <ScenarioActions id={s.id} />
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
