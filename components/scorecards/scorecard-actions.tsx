"use client"

import { useTransition } from "react"
import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteScorecard } from "@/app/scorecards/actions"
import { useRouter } from "next/navigation"

export function ScorecardActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm("Delete this scorecard?")) return
    startTransition(async () => {
      await deleteScorecard(id)
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  )
}
