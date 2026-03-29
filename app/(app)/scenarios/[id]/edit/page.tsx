import { notFound } from "next/navigation"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { ScenarioBuilder } from "@/components/scenarios/scenario-builder"
import type { ScenarioRawFields } from "@/lib/scenarios"

export default async function EditScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("id, name, raw_fields, user_id, org_id")
    .eq("id", id)
    .eq("is_template", false)
    .single()

  if (!scenario) notFound()

  const isPersonal = scenario.user_id === user.id
  const isOrgAdmin =
    scenario.org_id &&
    user.orgs.some(
      (o) => o.org.id === scenario.org_id && ["owner", "admin"].includes(o.role)
    )

  if (!isPersonal && !isOrgAdmin) notFound()

  const orgs = user.orgs
    .filter((o) => ["owner", "admin"].includes(o.role))
    .map((o) => ({ id: o.org.id, name: o.org.name }))

  return (
    <ScenarioBuilder
      editId={scenario.id}
      initialName={scenario.name}
      initialFields={scenario.raw_fields as ScenarioRawFields}
      orgs={orgs}
      initialOrgId={scenario.org_id}
    />
  )
}
