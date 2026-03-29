"use client"

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import BigText from "@/components/big-text"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function TestPage() {
  const { resolvedTheme } = useTheme()
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="h-16 border-b px-4">
        <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-end">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm text-muted-foreground">v0.1</span>
            <Separator orientation="vertical" />
            <Button asChild variant="outline" className="font-normal">
              <Link href="/auth/login">dev login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex h-full flex-1 flex-col">
        <div className="mx-auto grid h-full w-full max-w-4xl grid-cols-1 border-r border-l md:grid-cols-2">
          <div className="flex items-center justify-center border-b p-2 shadow-lg md:border-r md:border-b-0">
            <span className="text-muted-foreground">Coming Soon</span>
          </div>
          <div className="flex items-center justify-center p-2">
            <div className="flex items-center justify-center rounded-4xl border bg-white shadow-2xl dark:bg-black">
              <AgentAudioVisualizerAura
                size="lg"
                color="#1FD5F9"
                colorShift={2}
                state="speaking"
                themeMode={resolvedTheme === "dark" ? "dark" : "light"}
                className="rounded-full"
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="flex flex-1 flex-col justify-end border-t md:col-span-2">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-end justify-end border-r border-l">
          <div className="mx-auto w-full max-w-4xl pr-4 pl-2 opacity-10">
            <BigText text="practiceLab" />
          </div>
        </div>
      </footer>
    </div>
  )
}
