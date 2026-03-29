import { getOnboardedUser } from "@/lib/supabase/get-user"

export default async function DashboardPage() {
  const user = await getOnboardedUser()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Welcome back, {user.email}
      </p>
    </div>
  )
}
