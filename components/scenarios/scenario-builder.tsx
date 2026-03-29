"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, XIcon, WandSparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { compileScenarioPrompt, type ScenarioRawFields } from "@/lib/scenarios"
import { saveScenario, updateScenario, type ActionError } from "@/app/scenarios/actions"

type Org = { id: string; name: string }

const PERSONALITY_PRESETS = [
  "Skeptical",
  "Friendly",
  "Busy / distracted",
  "Budget-constrained",
  "Already has a vendor",
  "Decision-maker",
  "Gatekeeper",
]

const defaultFields = (): ScenarioRawFields => ({
  buyer_role: "",
  company_context: "",
  personality: "",
  objections: [""],
  goal: "",
  information_to_withhold: "",
  additional_notes: "",
})

type Props = {
  editId?: string
  initialName?: string
  initialFields?: ScenarioRawFields
  orgs?: Org[]
  initialOrgId?: string | null
}

export function ScenarioBuilder({
  editId,
  initialName = "",
  initialFields,
  orgs = [],
  initialOrgId = null,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<ActionError | null>(null)

  const [name, setName] = useState(initialName)
  const [orgId, setOrgId] = useState<string | null>(initialOrgId)
  const [fields, setFields] = useState<ScenarioRawFields>(
    initialFields ?? defaultFields()
  )
  const [showPrompt, setShowPrompt] = useState(false)

  // AI generate
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateDesc, setGenerateDesc] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function update(patch: Partial<ScenarioRawFields>) {
    setFields((prev) => ({ ...prev, ...patch }))
  }

  function addObjection() {
    update({ objections: [...fields.objections, ""] })
  }

  function updateObjection(index: number, value: string) {
    update({ objections: fields.objections.map((o, i) => (i === index ? value : o)) })
  }

  function removeObjection(index: number) {
    update({ objections: fields.objections.filter((_, i) => i !== index) })
  }

  const compiledPrompt = useMemo(() => compileScenarioPrompt(fields), [fields])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: generateDesc }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Generation failed")
      }
      const data = await res.json()
      setName(data.name)
      setFields({
        buyer_role: data.buyer_role ?? "",
        company_context: data.company_context ?? "",
        personality: data.personality ?? "",
        objections: data.objections ?? [""],
        goal: data.goal ?? "",
        information_to_withhold: data.information_to_withhold ?? "",
        additional_notes: data.additional_notes ?? "",
      })
      setGenerateOpen(false)
      setGenerateDesc("")
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    setError(null)
    const input = { name, orgId, rawFields: fields }
    startTransition(async () => {
      const result = editId
        ? await updateScenario(editId, input)
        : await saveScenario(input)
      if (result) setError(result)
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {editId ? "Edit Scenario" : "New Scenario"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define a buyer persona that gets injected into the voice agent.
          </p>
        </div>
        <Button variant="outline" onClick={() => setGenerateOpen(true)}>
          <WandSparklesIcon className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="scenario-name">Scenario name</Label>
        <Input
          id="scenario-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "The Skeptic"'
        />
      </div>

      {/* Visibility */}
      {orgs.length > 0 && (
        <div className="space-y-1.5">
          <Label>Visibility</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrgId(null)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                orgId === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              )}
            >
              Personal
            </button>
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => setOrgId(org.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  orgId === org.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                )}
              >
                {org.name}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {orgId ? "Shared with all team members." : "Only visible to you."}
          </p>
        </div>
      )}

      {/* Buyer details */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="buyer-role">Buyer role / title</Label>
            <Input
              id="buyer-role"
              value={fields.buyer_role}
              onChange={(e) => update({ buyer_role: e.target.value })}
              placeholder='e.g. "VP of Sales"'
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal">
              Rep&apos;s goal
            </Label>
            <Input
              id="goal"
              value={fields.goal}
              onChange={(e) => update({ goal: e.target.value })}
              placeholder='e.g. "Book a discovery call"'
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-context">Company context</Label>
          <Input
            id="company-context"
            value={fields.company_context}
            onChange={(e) => update({ company_context: e.target.value })}
            placeholder='e.g. "Series B SaaS startup, 50-person sales team, recently missed quota"'
          />
        </div>

        {/* Personality */}
        <div className="space-y-1.5">
          <Label>Buyer personality</Label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ personality: fields.personality === p.toLowerCase() ? "" : p.toLowerCase() })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  fields.personality.toLowerCase() === p.toLowerCase()
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Input
            value={fields.personality}
            onChange={(e) => update({ personality: e.target.value })}
            placeholder="Or type a custom personality…"
            className="mt-2 text-sm"
          />
        </div>

        {/* Objections */}
        <div className="space-y-2">
          <Label>Objections to raise</Label>
          {fields.objections.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground w-4 shrink-0 text-right text-xs">
                {i + 1}.
              </span>
              <Input
                value={obj}
                onChange={(e) => updateObjection(i, e.target.value)}
                placeholder='e.g. "We already have a tool for this"'
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addObjection() }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeObjection(i)}
                disabled={fields.objections.length === 1}
                className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={addObjection}
            className="text-muted-foreground h-7 text-xs"
          >
            <PlusIcon className="h-3 w-3" />
            Add objection
          </Button>
        </div>

        {/* Optional fields */}
        <div className="space-y-1.5">
          <Label htmlFor="withhold">
            Information to withhold
            <span className="text-muted-foreground ml-1 text-xs">(optional)</span>
          </Label>
          <Textarea
            id="withhold"
            value={fields.information_to_withhold}
            onChange={(e) => update({ information_to_withhold: e.target.value })}
            placeholder="Info the buyer won't share unless the rep asks directly…"
            className="min-h-16 resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Additional notes
            <span className="text-muted-foreground ml-1 text-xs">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            value={fields.additional_notes}
            onChange={(e) => update({ additional_notes: e.target.value })}
            placeholder="Any extra roleplay instructions for the agent…"
            className="min-h-16 resize-none text-sm"
          />
        </div>
      </div>

      {/* Compiled prompt preview */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline transition-colors"
        >
          {showPrompt ? "Hide" : "Preview"} compiled system prompt
        </button>
        {showPrompt && (
          <pre className="bg-muted text-muted-foreground rounded-lg px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {compiledPrompt || "(Fill in fields above to see the compiled prompt)"}
          </pre>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={() => router.push("/scenarios")} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <Spinner className="h-4 w-4" /> : null}
          {editId ? "Save changes" : "Create scenario"}
        </Button>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Describe the buyer persona you want to practice against</Label>
              <Textarea
                value={generateDesc}
                onChange={(e) => setGenerateDesc(e.target.value)}
                placeholder='e.g. A skeptical VP of Sales at a mid-size company who has been burned by vendors before and will push back hard on pricing and ROI.'
                className="min-h-28 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate()
                }}
              />
              {generateError && (
                <p className="text-destructive text-sm">{generateError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!generateDesc.trim() || generating}>
                {generating ? <Spinner className="h-4 w-4" /> : <WandSparklesIcon className="h-4 w-4" />}
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
