"use client"

import { useTheme } from "next-themes"

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import BigText from "@/components/big-text"

export default function Page() {
  const { resolvedTheme } = useTheme()

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="border-b px-6 py-5 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl justify-end">
          <span className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
            V0
          </span>
        </div>
      </header>

      <main className="flex flex-col">
        <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col md:border-r">
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-6">
              <div className="w-1/2">
                <BigText text="coming soon" />
              </div>
            </div>
            <div className="border-t md:hidden" />
          </div>
          <div className="flex items-center justify-center px-6">
            <AgentAudioVisualizerAura
              size="lg"
              color="#1FD5F9"
              colorShift={1}
              state="listening"
              themeMode={resolvedTheme === "dark" ? "dark" : "light"}
              className="rounded-full"
            />
          </div>
        </div>
      </main>

      <footer className="flex flex-1 flex-col justify-end border-t px-3">
        <div className="mx-auto w-full max-w-7xl opacity-10">
          <BigText text="practiceLab" />
        </div>
      </footer>
    </div>
  )
}
