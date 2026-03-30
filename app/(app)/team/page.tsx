import { getOnboardedUser } from "@/lib/supabase/get-user"
import { redirect } from "next/navigation"

export default async function TeamPage() {
  const user = await getOnboardedUser()
  const isAdmin = user.orgs.some((o) =>
    ["owner", "admin"].includes(o.role)
  )

  if (!isAdmin) redirect("/dashboard")

  return (
    <div className="p-8">
      <h1 className="text-2xl font-normal">Team</h1>
      <p className="text-muted-foreground mt-1 text-sm font-light">
        Manage members, roles, and org-level settings.
      </p>
    </div>
  )
}
