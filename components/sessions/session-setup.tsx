"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useConversation } from "@elevenlabs/react"
import type { AgentState as LiveKitAgentState } from "@livekit/components-react"
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura"
import { createSession } from "@/app/sessions/actions"
import type { ScenarioRawFields } from "@/lib/scenarios"

type Scorecard = { id: string; name: string; schema: unknown }
type Scenario  = { id: string; name: string; raw_fields: unknown }

type Props = {
  scorecards: Scorecard[]
  scenarios:  Scenario[]
  orgId:      string | null
  userId:     string
}

type Phase = "pre" | "starting" | "active" | "ending"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function ScenarioPreview({ scenario }: { scenario: Scenario }) {
  const f = scenario.raw_fields as {
    buyer_role?: string
    personality?: string
    company_context?: string
  } | null
  return (
    <p className="text-muted-foreground mt-1 text-xs">
      {[f?.buyer_role, f?.personality].filter(Boolean).join(" · ")}
      {f?.company_context ? ` — ${f.company_context}` : ""}
    </p>
  )
}

export function SessionSetup({ scorecards, scenarios, orgId, userId }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("pre")
  const [error, setError] = useState<string | null>(null)

  // Pre-session selections
  const [scorecardId, setScorecardId] = useState(scorecards[0]?.id ?? "")
  const [scenarioId,  setScenarioId]  = useState(scenarios[0]?.id  ?? "")
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
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Start session ────────────────────────────────────────────────────────

  async function handleStart() {
    setError(null)
    setPhase("starting")

    // 1. Create session record in DB
    const result = await createSession({ scorecardId, scenarioId, notes, orgId })
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
      setError("Microphone permission denied. Please allow access and try again.")
      setPhase("pre")
      return
    }

    // 3. Fetch signed URL (or agentId for public agents)
    const urlRes = await fetch(`/api/elevenlabs/signed-url${orgId ? `?orgId=${orgId}` : ""}`)
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
          buyer_role:              fields?.buyer_role ?? "",
          company_context:         fields?.company_context ? `at ${fields.company_context}` : "",
          personality:             fields?.personality ?? "",
          objections:              (fields?.objections ?? []).map((o) => `- ${o}`).join("\n"),
          goal:                    fields?.goal ?? "",
          information_to_withhold: fields?.information_to_withhold
            ? `Do not volunteer the following unless the rep asks directly:\n${fields.information_to_withhold}`
            : "",
          additional_notes:        fields?.additional_notes ?? "",
          session_id:              sessionIdRef.current ?? "",
          user_id:                 userId,
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
    router.push(sessionIdRef.current ? `/sessions/${sessionIdRef.current}` : "/sessions")
  }, [conversation, router])

  // ── Visualizer state mapping ─────────────────────────────────────────────

  const visualizerState = ((): LiveKitAgentState => {
    if (phase === "starting") return "connecting"
    if (phase === "active") return conversation.isSpeaking ? "speaking" : "listening"
    return "disconnected"
  })()

  // ── Selected items ───────────────────────────────────────────────────────

  const selectedScorecard = scorecards.find((s) => s.id === scorecardId)
  const selectedScenario  = scenarios.find((s) => s.id === scenarioId)

  // ── Render ───────────────────────────────────────────────────────────────

  if (phase === "active" || phase === "ending") {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-8 p-8">
        {/* Visualizer */}
        <AgentAudioVisualizerAura size="xl" state={visualizerState} />

        {/* Status */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono text-2xl tabular-nums">{formatDuration(elapsed)}</p>
          <p className="text-muted-foreground text-sm capitalize">
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
            <Badge variant="secondary">{selectedScorecard.name}</Badge>
          )}
          {selectedScenario && (
            <Badge variant="outline">{selectedScenario.name}</Badge>
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
            {conversation.isMuted
              ? <MicOffIcon className="h-5 w-5 text-destructive" />
              : <MicIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleEnd}
            disabled={phase === "ending"}
          >
            {phase === "ending"
              ? <Spinner className="h-5 w-5" />
              : <PhoneOffIcon className="h-5 w-5" />}
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    )
  }

  // ── Pre-session ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">New Session</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose your scorecard and scenario, then start practicing.
        </p>
      </div>

      {/* Scorecard */}
      <div className="space-y-2">
        <Label>Scorecard</Label>
        {scorecards.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No scorecards yet.{" "}
            <a href="/scorecards/new" className="underline">Create one</a>.
          </p>
        ) : (
          <div className="space-y-2">
            {scorecards.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScorecardId(s.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  scorecardId === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-muted-foreground text-xs">
                  {((s.schema as { components?: unknown[] })?.components?.length ?? 0)} components
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scenario */}
      <div className="space-y-2">
        <Label>Scenario</Label>
        {scenarios.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No scenarios yet.{" "}
            <a href="/scenarios/new" className="underline">Create one</a>.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  scenarioId === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <p className="text-sm font-medium">{s.name}</p>
                <ScenarioPreview scenario={s} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notes
          <span className="text-muted-foreground ml-1 text-xs">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What are you focusing on this session?"
          className="min-h-16 resize-none text-sm"
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        onClick={handleStart}
        disabled={phase === "starting" || !scorecardId || !scenarioId}
      >
        {phase === "starting" ? (
          <><Spinner className="h-4 w-4" /> Starting…</>
        ) : (
          "Start Session"
        )}
      </Button>
    </div>
  )
}
