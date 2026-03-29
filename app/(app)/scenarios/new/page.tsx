import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { ScenarioBuilder } from "@/components/scenarios/scenario-builder"
import type { ScenarioRawFields } from "@/lib/scenarios"

export default async function NewScenarioPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const { template: templateId } = await searchParams
  const user = await getOnboardedUser()

  const orgs = user.orgs
    .filter((o) => ["owner", "admin"].includes(o.role))
    .map((o) => ({ id: o.org.id, name: o.org.name }))

  let initialName = ""
  let initialFields: ScenarioRawFields | undefined

  if (templateId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("scenarios")
      .select("name, raw_fields")
      .eq("id", templateId)
      .eq("is_template", true)
      .single()

    if (data) {
      initialName = data.name
      initialFields = data.raw_fields as ScenarioRawFields
    }
  }

  return (
    <ScenarioBuilder
      initialName={initialName}
      initialFields={initialFields}
      orgs={orgs}
    />
  )
}
