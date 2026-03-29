"use client"

import { useTransition } from "react"
import { Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteScenario } from "@/app/scenarios/actions"

export function ScenarioActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm("Delete this scenario?")) return
    startTransition(async () => {
      await deleteScenario(id)
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
