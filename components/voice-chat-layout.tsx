import { useTheme } from "next-themes"
import { AgentAudioVisualizerAura } from "./agents-ui/agent-audio-visualizer-aura"
import { Button } from "./ui/button"
import { PhoneIcon } from "lucide-react"
import { Input } from "./ui/input"

export default function VoiceChatLayout({}: {
  resolvedTheme: "dark" | "light"
}) {
  const { resolvedTheme } = useTheme()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-between gap-8 rounded-4xl border p-8">
      <div className="flex w-full flex-col items-start">
        <AgentAudioVisualizerAura
          size="sm"
          color="#1FD5F9"
          colorShift={2}
          state="listening"
          themeMode={resolvedTheme as "dark" | "light"}
          className="aspect-square rounded-full"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="">
          PracticeLab helps you sharpen your ability to{" "}
          <span className="font-bold">think on your feet</span> and{" "}
          <span className="font-bold">speak with confidence</span> — so
          you&apos;re never fumbling for words, whether that&apos;s with
          clients, colleagues, or in public.
        </p>
        <p className="">
          Available hosted or self-hosted (BYOK: ElevenLabs + Anthropic). Every
          session generates a <span className="font-bold">scorecard</span> so
          you can track your progress.
        </p>
      </div>
      <div className="mt-8 flex w-full flex-row items-center justify-center gap-4">
        <Button
          disabled
          variant="outline"
          size="icon"
          className="size-12 rounded-full"
        >
          <PhoneIcon />
        </Button>
        <Input
          disabled
          placeholder="Or type your message..."
          className="h-12 w-full rounded-full"
        />
      </div>
    </div>
  )
}
