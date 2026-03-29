import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/get-user"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

export default async function OnboardingPage() {
  const user = await getUser()

  if (user.settings || user.orgs.length > 0) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <OnboardingFlow />
      </div>
    </div>
  )
}
