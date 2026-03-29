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
            <Button asChild variant="ghost" size="icon">
              <a href="https://github.com/charlescrowellnv/pl" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </Button>
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
