import ScorecardConfigDialog from "@/components/settings/scorecard-config-dialog"

export default function SettingsPage() {
  return (
    <div className="h-full w-full">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <ScorecardConfigDialog />
      </div>
    </div>
  )
}
