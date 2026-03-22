"use client"

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

export default function Page() {
  const { resolvedTheme } = useTheme()
  return (
    <div className="relative flex min-h-dvh w-full flex-row items-center justify-center gap-4">
      <AgentAudioVisualizerAura
        size="xl"
        color="#1FD5F9"
        colorShift={2}
        state="listening"
        themeMode={resolvedTheme as "dark" | "light"}
        className="aspect-square size-32"
      />
      {/* <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 1 }}
      > */}
      <div className="flex flex-col items-start justify-center gap-2">
        <p className="font-jetbrains-mono text-4xl font-extrabold tracking-tighter">
          pl
        </p>
        <p className="text-sm text-muted-foreground">coming soon</p>
      </div>
      {/* </motion.div> */}
    </div>
  )
}
