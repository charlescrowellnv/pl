"use client"

import { useState, useTransition } from "react"
import { Users, User, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setupSolo, createOrg, type OnboardingError } from "@/app/onboarding/actions"

type Path = "solo" | "org" | null

function ApiKeyInput({
  id,
  name,
  label,
  placeholder,
  required,
  hint,
}: {
  id: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  hint?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {!required && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
        </Label>
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder ?? "sk-..."}
          required={required}
          className="pr-10 font-mono text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

function ErrorMessage({ error }: { error: OnboardingError | null }) {
  if (!error) return null
  return <p className="text-destructive text-sm">{error.message}</p>
}

// ─── Step 1: Path selection ───────────────────────────────────────────────────

function PathSelection({ onSelect }: { onSelect: (path: Path) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to PracticeLab</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          How would you like to get started?
        </p>
      </div>

      <div className="grid gap-3">
        <button
          onClick={() => onSelect("solo")}
          className="border-border hover:border-primary hover:bg-accent flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
        >
          <div className="bg-muted mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">Practice Solo</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Use your own ElevenLabs agent and API keys. Just you.
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelect("org")}
          className="border-border hover:border-primary hover:bg-accent flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
        >
          <div className="bg-muted mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">Create a Team</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Set up a shared workspace. Invite reps, share scorecards and scenarios.
            </p>
          </div>
        </button>
      </div>

      <p className="text-muted-foreground text-xs">
        Joining an existing team?{" "}
        <span className="text-foreground">
          Ask your admin for an invite link.
        </span>
      </p>
    </div>
  )
}

// ─── Step 2a: Solo setup ──────────────────────────────────────────────────────

function SoloSetup({ onBack }: { onBack: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<OnboardingError | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await setupSolo(formData)
      if (result) setError(result)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h1 className="text-2xl font-semibold">Connect your ElevenLabs agent</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          You&apos;ll need an ElevenLabs account with a Conversational AI agent set up.
        </p>
      </div>

      <div className="space-y-4">
        <ApiKeyInput
          id="elevenlabs_api_key"
          name="elevenlabs_api_key"
          label="ElevenLabs API Key"
          required
          hint="Found in your ElevenLabs dashboard under API Keys."
        />

        <div className="grid gap-1.5">
          <Label htmlFor="elevenlabs_agent_id">ElevenLabs Agent ID</Label>
          <Input
            id="elevenlabs_agent_id"
            name="elevenlabs_agent_id"
            type="text"
            placeholder="agent_..."
            required
            className="font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            Found in your agent&apos;s settings page on ElevenLabs.
          </p>
        </div>

        <ApiKeyInput
          id="anthropic_api_key"
          name="anthropic_api_key"
          label="Anthropic API Key"
          hint="Optional — if omitted, Practice Lab's key is used for session scoring."
        />
      </div>

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Start practicing"}
      </Button>
    </form>
  )
}

// ─── Step 2b: Org creation ────────────────────────────────────────────────────

function OrgSetup({ onBack }: { onBack: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<OnboardingError | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createOrg(formData)
      if (result) setError(result)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h1 className="text-2xl font-semibold">Create your team</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your team&apos;s ElevenLabs agent will be shared with all members.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="org_name">Team name</Label>
          <Input
            id="org_name"
            name="org_name"
            type="text"
            placeholder="Acme Sales Team"
            required
          />
        </div>

        <ApiKeyInput
          id="elevenlabs_api_key"
          name="elevenlabs_api_key"
          label="ElevenLabs API Key"
          required
          hint="This key will be used for all team members' sessions."
        />

        <div className="grid gap-1.5">
          <Label htmlFor="elevenlabs_agent_id">ElevenLabs Agent ID</Label>
          <Input
            id="elevenlabs_agent_id"
            name="elevenlabs_agent_id"
            type="text"
            placeholder="agent_..."
            required
            className="font-mono text-sm"
            autoComplete="off"
          />
        </div>

        <ApiKeyInput
          id="anthropic_api_key"
          name="anthropic_api_key"
          label="Anthropic API Key"
          hint="Optional — if omitted, Practice Lab's key is used for session scoring."
        />
      </div>

      <ErrorMessage error={error} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating team..." : "Create team"}
      </Button>
    </form>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const [path, setPath] = useState<Path>(null)

  if (path === "solo") return <SoloSetup onBack={() => setPath(null)} />
  if (path === "org")  return <OrgSetup  onBack={() => setPath(null)} />
  return <PathSelection onSelect={setPath} />
}
