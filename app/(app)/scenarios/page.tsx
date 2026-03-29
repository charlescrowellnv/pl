import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

  const personality = (s: { raw_fields: unknown }) => {
    const f = s.raw_fields as { personality?: string } | null
    return f?.personality ?? null
  }

  const buyerRole = (s: { raw_fields: unknown }) => {
    const f = s.raw_fields as { buyer_role?: string } | null
    return f?.buyer_role ?? null
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scenarios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Buyer personas injected into the voice agent before each session.
          </p>
        </div>
        <Button asChild>
          <Link href="/scenarios/new">
            <PlusIcon className="h-4 w-4" />
            New Scenario
          </Link>
        </Button>
      </div>

      <Section title="My Scenarios" empty="No personal scenarios yet." items={personal} userId={user.id} orgNames={orgNames} personality={personality} buyerRole={buyerRole} />
      {org.length > 0 && <Section title="Team Scenarios" items={org} userId={user.id} orgNames={orgNames} personality={personality} buyerRole={buyerRole} />}
      <Section title="Templates" items={templates} userId={user.id} orgNames={orgNames} personality={personality} buyerRole={buyerRole} readOnly />
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
  userId,
  orgNames,
  personality,
  buyerRole,
  readOnly,
}: {
  title: string
  empty?: string
  items: ScenarioRow[]
  userId: string
  orgNames: Record<string, string>
  personality: (s: ScenarioRow) => string | null
  buyerRole: (s: ScenarioRow) => string | null
  readOnly?: boolean
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
        {title}
      </h2>
      {items.length === 0 && empty ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="border-border rounded-lg border p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-muted-foreground text-xs truncate">
                    {buyerRole(s)}
                    {personality(s) ? ` · ${personality(s)}` : ""}
                  </p>
                </div>
                {s.org_id && orgNames[s.org_id] && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {orgNames[s.org_id]}
                  </Badge>
                )}
              </div>
              {!readOnly && (
                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/scenarios/${s.id}/edit`}>Edit</Link>
                  </Button>
                  <ScenarioActions id={s.id} />
                </div>
              )}
              {readOnly && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/scenarios/new?template=${s.id}`}>Use template</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
