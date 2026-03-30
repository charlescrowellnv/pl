"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useConversation } from "@elevenlabs/react"
import type { AgentState as LiveKitAgentState } from "@livekit/components-react"
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import { createSession } from "@/app/sessions/actions"
import type { ScenarioRawFields } from "@/lib/scenarios"

type Scorecard = { id: string; name: string; schema: unknown }
type Scenario = { id: string; name: string; raw_fields: unknown }

type Props = {
  scorecards: Scorecard[]
  scenarios: Scenario[]
  orgId: string | null
  userId: string
}

type Phase = "pre" | "starting" | "active" | "ending"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function ScenarioPreview({ scenario }: { scenario: Scenario }) {
  const f = scenario.raw_fields as ScenarioRawFields | null
  if (!f) return null

  const rows = [
    f.buyer_role && {
      label: "Buyer",
      value:
        f.buyer_role + (f.company_context ? ` at ${f.company_context}` : ""),
    },
    f.personality && { label: "Personality", value: f.personality },
    f.goal && { label: "Goal", value: f.goal },
    f.objections?.length > 0 && {
      label: "Objections",
      value: `${f.objections.length} prepared`,
    },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="mt-3 space-y-1.5 border px-4 py-3">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-3 text-xs">
          <span className="w-20 shrink-0 text-muted-foreground">{r.label}</span>
          <span className="text-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function ScorecardPreview({ scorecard }: { scorecard: Scorecard }) {
  const components =
    (scorecard.schema as { components?: { name: string }[] })?.components ?? []
  if (components.length === 0) return null

  return (
    <div className="mt-3 space-y-1 border px-4 py-3">
      {components.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{i + 1}.</span>
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  )
}

export function SessionSetup({ scorecards, scenarios, orgId, userId }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("pre")
  const [error, setError] = useState<string | null>(null)

  // Pre-session selections
  const [scorecardId, setScorecardId] = useState(scorecards[0]?.id ?? "")
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "")
  const [notes, setNotes] = useState("")

  // Active session state
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const conversation = useConversation({
    onError: (err) => {
      console.error("ElevenLabs error:", err)
      setError(typeof err === "string" ? err : "Connection error")
      setPhase("pre")
    },
  })

  // Timer
  useEffect(() => {
    if (phase === "active") {
      startTimeRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  // ── Start session ────────────────────────────────────────────────────────

  async function handleStart() {
    setError(null)
    setPhase("starting")

    // 1. Create session record in DB
    const result = await createSession({
      scorecardId,
      scenarioId,
      notes,
      orgId,
    })
    if (!result.ok) {
      setError(result.error)
      setPhase("pre")
      return
    }
    sessionIdRef.current = result.data.sessionId

    // 2. Request mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError(
        "Microphone permission denied. Please allow access and try again."
      )
      setPhase("pre")
      return
    }

    // 3. Fetch signed URL (or agentId for public agents)
    const urlRes = await fetch(
      `/api/elevenlabs/signed-url${orgId ? `?orgId=${orgId}` : ""}`
    )
    if (!urlRes.ok) {
      const body = await urlRes.json()
      setError(body.error ?? "Failed to get session credentials")
      setPhase("pre")
      return
    }
    const creds = await urlRes.json()

    // 4. Build dynamic variables from the selected scenario
    const scenario = scenarios.find((s) => s.id === scenarioId)
    const fields = scenario?.raw_fields as ScenarioRawFields | null

    // 5. Start ElevenLabs session
    try {
      await conversation.startSession({
        ...(creds.signedUrl
          ? { signedUrl: creds.signedUrl }
          : { agentId: creds.agentId }),
        dynamicVariables: {
          buyer_role: fields?.buyer_role ?? "",
          company_context: fields?.company_context
            ? `at ${fields.company_context}`
            : "",
          personality: fields?.personality ?? "",
          objections: (fields?.objections ?? [])
            .map((o) => `- ${o}`)
            .join("\n"),
          goal: fields?.goal ?? "",
          information_to_withhold: fields?.information_to_withhold
            ? `Do not volunteer the following unless the rep asks directly:\n${fields.information_to_withhold}`
            : "",
          additional_notes: fields?.additional_notes ?? "",
          session_id: sessionIdRef.current ?? "",
          user_id: userId,
        },
      } as Parameters<typeof conversation.startSession>[0])

      setElapsed(0)
      setPhase("active")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session")
      setPhase("pre")
    }
  }

  // ── End session ──────────────────────────────────────────────────────────

  const handleEnd = useCallback(() => {
    setPhase("ending")
    conversation.endSession()
    router.push(
      sessionIdRef.current ? `/sessions/${sessionIdRef.current}` : "/sessions"
    )
  }, [conversation, router])

  // ── Visualizer state mapping ─────────────────────────────────────────────

  const visualizerState = ((): LiveKitAgentState => {
    if (phase === "starting") return "connecting"
    if (phase === "active")
      return conversation.isSpeaking ? "speaking" : "listening"
    return "disconnected"
  })()

  // ── Selected items ───────────────────────────────────────────────────────

  const selectedScorecard = scorecards.find((s) => s.id === scorecardId)
  const selectedScenario = scenarios.find((s) => s.id === scenarioId)

  // ── Render ───────────────────────────────────────────────────────────────

  if (phase === "active" || phase === "ending") {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-8 p-8">
        {/* Visualizer */}
        <AgentAudioVisualizerAura size="xl" state={visualizerState} />

        {/* Status */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono text-2xl tabular-nums">
            {formatDuration(elapsed)}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {phase === "ending"
              ? "Saving session…"
              : conversation.isSpeaking
                ? "Speaking…"
                : "Listening…"}
          </p>
        </div>

        {/* Context badges */}
        <div className="flex gap-2">
          {selectedScorecard && (
            <span className="text-xs font-light text-muted-foreground">
              {selectedScorecard.name}
            </span>
          )}
          {selectedScenario && (
            <span className="text-xs font-light text-muted-foreground">
              {selectedScenario.name}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => conversation.setMuted(!conversation.isMuted)}
            disabled={phase === "ending"}
          >
            {conversation.isMuted ? (
              <MicOffIcon className="h-5 w-5 text-destructive" />
            ) : (
              <MicIcon className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleEnd}
            disabled={phase === "ending"}
          >
            {phase === "ending" ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <PhoneOffIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  // ── Pre-session ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-normal">New Session</h1>
        <p className="mt-1 text-sm font-light text-muted-foreground">
          Choose your scorecard and scenario, then start practicing.
        </p>
      </div>

      {/* Scorecard */}
      <div className="space-y-2">
        <Label className="font-normal">Scorecard</Label>
        {scorecards.length === 0 ? (
          <div className="space-y-1 border border-dashed p-4">
            <p className="text-sm text-muted-foreground">No scorecards yet.</p>
            <div className="flex gap-3 text-sm">
              <a
                href="/scorecards"
                className="text-primary underline-offset-4 hover:underline"
              >
                Browse templates
              </a>
              <span className="text-muted-foreground">·</span>
              <a
                href="/scorecards/new"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create from scratch
              </a>
            </div>
          </div>
        ) : (
          <>
            <Select value={scorecardId} onValueChange={setScorecardId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a scorecard" />
              </SelectTrigger>
              <SelectContent>
                {scorecards.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedScorecard && (
              <ScorecardPreview scorecard={selectedScorecard} />
            )}
          </>
        )}
      </div>

      {/* Scenario */}
      <div className="space-y-2">
        <Label className="font-normal">Scenario</Label>
        {scenarios.length === 0 ? (
          <div className="space-y-1 border border-dashed p-4">
            <p className="text-sm text-muted-foreground">No scenarios yet.</p>
            <div className="flex gap-3 text-sm">
              <a
                href="/scenarios"
                className="text-primary underline-offset-4 hover:underline"
              >
                Browse templates
              </a>
              <span className="text-muted-foreground">·</span>
              <a
                href="/scenarios/new"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create from scratch
              </a>
            </div>
          </div>
        ) : (
          <>
            <Select value={scenarioId} onValueChange={setScenarioId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a scenario" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedScenario && (
              <ScenarioPreview scenario={selectedScenario} />
            )}
          </>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="font-normal">
          Notes
          <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What are you focusing on this session?"
          className="min-h-16 resize-none text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full rounded-none font-normal"
        size="lg"
        onClick={handleStart}
        disabled={phase === "starting" || !scorecardId || !scenarioId}
      >
        {phase === "starting" ? (
          <>
            <Spinner className="h-4 w-4" /> Starting…
          </>
        ) : (
          "Start Session"
        )}
      </Button>
    </div>
  )
}
