import { getOnboardedUser } from "@/lib/supabase/get-user"
import { AppSidebar } from "@/components/app-sidebar"
import Link from "next/link"

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
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0 border-b">
        <div className="flex h-11 items-center justify-between px-6">
          <Link href="/dashboard" className="text-sm font-normal tracking-tight">
            practiceLab
          </Link>
          <span className="text-sm font-light text-muted-foreground">{user.email}</span>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
