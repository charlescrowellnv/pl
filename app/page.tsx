"use client"

import { useTheme } from "next-themes"

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import BigText from "@/components/big-text"

export default function Page() {
  const { resolvedTheme } = useTheme()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end border-b px-6 py-5 md:px-10">
        <span className="font-jetbrains-mono text-xs tracking-widest text-muted-foreground uppercase">
          V0
        </span>
      </header>

      <main className="grid flex-1 grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-start border-b px-6 py-6 font-light md:justify-center md:border-r md:pt-0">
          <BigText text="Coming Soon" />
        </div>
        <div className="flex items-center justify-center px-6">
          <AgentAudioVisualizerAura
            size="xl"
            color="#1FD5F9"
            colorShift={1}
            state="listening"
            themeMode={resolvedTheme === "dark" ? "dark" : "light"}
            className="rounded-full"
          />
        </div>
      </main>

      <footer className="flex flex-1 flex-col justify-end border-t px-3">
        <div className="w-full overflow-hidden text-center font-light opacity-10">
          <BigText text="practiceLab" />
        </div>
      </footer>
    </div>
  )
}
