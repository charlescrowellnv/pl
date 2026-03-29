import { getOnboardedUser } from "@/lib/supabase/get-user"
import { AppSidebar } from "@/components/app-sidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getOnboardedUser()
  const isAdmin = user.orgs.some((o) =>
    ["owner", "admin"].includes(o.role)
  )

  return (
    <div className="flex h-svh">
      <AppSidebar isAdmin={isAdmin} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  )
}
