"use client"

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import BigText from "@/components/big-text"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function TestPage() {
  const { resolvedTheme } = useTheme()
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="border-b">
        <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between border-l border-r px-4">
          <span className="text-sm font-normal tracking-tight">practiceLab</span>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <span className="font-light">v0.1</span>
            <a
              href="https://github.com/charlescrowellnv/pl"
              target="_blank"
              rel="noopener noreferrer"
              className="font-light transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link
              href="/auth/login"
              className="font-normal text-foreground transition-colors hover:text-muted-foreground"
            >
              Login →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto grid h-full w-full max-w-5xl flex-1 grid-cols-1 border-l border-r md:grid-cols-2">
          <div className="flex flex-col justify-between border-b p-8 md:border-b-0 md:border-r">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
                Sales Training / AI Roleplay
              </p>
              <h1 className="text-4xl font-light leading-tight tracking-tight">
                Practice the<br />hard conversations.
              </h1>
              <p className="max-w-[28ch] text-sm font-light leading-relaxed text-muted-foreground">
                AI-powered roleplay sessions that help sales teams get better — rep by rep, call by call.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-light text-muted-foreground">
              <span>Early access</span>
              <span className="opacity-40">—</span>
              <Link
                href="/auth/login"
                className="font-normal text-foreground underline underline-offset-2 transition-colors hover:text-muted-foreground"
              >
                Request access
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center justify-center rounded-3xl border bg-white shadow-lg dark:bg-black">
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

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl overflow-hidden border-l border-r">
          <div className="select-none opacity-[0.07]">
            <BigText text="practiceLab" />
          </div>
        </div>
      </footer>
    </div>
  )
}
