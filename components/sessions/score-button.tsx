"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function ScoreButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function handleScore() {
    setState("loading")
    try {
      const res = await fetch("/api/score-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error("Failed to start scoring")
      setState("done")
      // Poll by refreshing until status changes
      const interval = setInterval(() => router.refresh(), 3000)
      setTimeout(() => clearInterval(interval), 60_000)
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <p className="text-muted-foreground text-sm">
        Scoring in progress — this page will update automatically.
      </p>
    )
  }

  return (
    <Button onClick={handleScore} disabled={state === "loading"} variant="outline">
      {state === "loading" ? (
        <><Spinner className="h-4 w-4" /> Scoring…</>
      ) : (
        <><SparklesIcon className="h-4 w-4" /> Score Session</>
      )}
      {state === "error" && <span className="text-destructive ml-2">Error — try again</span>}
    </Button>
  )
}
