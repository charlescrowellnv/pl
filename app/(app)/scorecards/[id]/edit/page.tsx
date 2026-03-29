import { notFound } from "next/navigation"
import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { ScorecardBuilder } from "@/components/scorecards/scorecard-builder"
import type { ScorecardComponentInput } from "@/app/scorecards/actions"

export default async function EditScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const { data: scorecard } = await supabase
    .from("scorecards")
    .select("id, name, schema, user_id, org_id")
    .eq("id", id)
    .eq("is_template", false)
    .single()

  if (!scorecard) notFound()

  // Only the owner (personal) or admin/owner (org) can edit
  const isPersonal = scorecard.user_id === user.id
  const isOrgAdmin =
    scorecard.org_id &&
    user.orgs.some(
      (o) => o.org.id === scorecard.org_id && ["owner", "admin"].includes(o.role)
    )

  if (!isPersonal && !isOrgAdmin) notFound()

  const orgs = user.orgs
    .filter((o) => ["owner", "admin"].includes(o.role))
    .map((o) => ({ id: o.org.id, name: o.org.name }))

  const schema = scorecard.schema as { components?: ScorecardComponentInput[] }

  return (
    <ScorecardBuilder
      editId={scorecard.id}
      initialName={scorecard.name}
      initialComponents={schema.components ?? []}
      orgs={orgs}
      initialOrgId={scorecard.org_id}
    />
  )
}
