import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { ScorecardBuilder } from "@/components/scorecards/scorecard-builder"
import type { ScorecardComponentInput } from "@/app/scorecards/actions"

export default async function NewScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const { template: templateId } = await searchParams
  const user = await getOnboardedUser()

  const orgs = user.orgs
    .filter((o) => ["owner", "admin"].includes(o.role))
    .map((o) => ({ id: o.org.id, name: o.org.name }))

  // If ?template=id, pre-populate from that template
  let initialName = ""
  let initialComponents: ScorecardComponentInput[] = []

  if (templateId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("scorecards")
      .select("name, schema")
      .eq("id", templateId)
      .eq("is_template", true)
      .single()

    if (data) {
      initialName = data.name
      const schema = data.schema as { components?: ScorecardComponentInput[] }
      initialComponents = schema.components ?? []
    }
  }

  return (
    <ScorecardBuilder
      initialName={initialName}
      initialComponents={initialComponents}
      orgs={orgs}
    />
  )
}
