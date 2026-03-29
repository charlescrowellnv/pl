import { getOnboardedUser } from "@/lib/supabase/get-user"
import { createClient } from "@/lib/supabase/server"
import { SessionSetup } from "@/components/sessions/session-setup"
import { ConversationWrapper } from "@/components/sessions/conversation-wrapper"

export default async function NewSessionPage() {
  const user = await getOnboardedUser()
  const supabase = await createClient()

  const orgIds = user.orgs.map((o) => o.org.id)
  const orgId  = user.orgs[0]?.org.id ?? null

  // Fetch scorecards (personal + org, no templates)
  const { data: scorecards = [] } = await supabase
    .from("scorecards")
    .select("id, name, schema")
    .or(
      [
        `user_id.eq.${user.id}`,
        orgIds.length > 0 ? `org_id.in.(${orgIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .eq("is_template", false)
    .order("created_at", { ascending: false })

  // Fetch scenarios (personal + org, no templates)
  const { data: scenarios = [] } = await supabase
    .from("scenarios")
    .select("id, name, raw_fields")
    .or(
      [
        `user_id.eq.${user.id}`,
        orgIds.length > 0 ? `org_id.in.(${orgIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .eq("is_template", false)
    .order("created_at", { ascending: false })

  return (
    <ConversationWrapper>
      <SessionSetup
        scorecards={scorecards ?? []}
        scenarios={scenarios ?? []}
        orgId={orgId}
        userId={user.id}
      />
    </ConversationWrapper>
  )
}
