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
    <div className="flex flex-col">
      <div className="mx-auto w-full space-y-8 p-8 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal">
              {editId ? "Edit Scenario" : "New Scenario"}
            </h1>
            <p className="mt-1 text-sm font-light text-muted-foreground">
              Define a buyer persona that gets injected into the voice agent.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-none font-normal"
            onClick={() => setGenerateOpen(true)}
          >
            <WandSparklesIcon className="h-4 w-4" />
            Generate with AI
          </Button>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="scenario-name" className="font-normal">Scenario name</Label>
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
            <Label className="font-normal">Visibility</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrgId(null)}
                className={cn(
                  "rounded-none border px-3 py-1.5 text-sm font-light transition-colors",
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
                    "rounded-none border px-3 py-1.5 text-sm font-light transition-colors",
                    orgId === org.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  )}
                >
                  {org.name}
                </button>
              ))}
            </div>
            <p className="text-xs font-light text-muted-foreground">
              {orgId ? "Shared with all team members." : "Only visible to you."}
            </p>
          </div>
        )}

        {/* Buyer details */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="buyer-role" className="font-normal">Buyer role / title</Label>
              <Input
                id="buyer-role"
                value={fields.buyer_role}
                onChange={(e) => update({ buyer_role: e.target.value })}
                placeholder='e.g. "VP of Sales"'
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal" className="font-normal">Rep&apos;s goal</Label>
              <Input
                id="goal"
                value={fields.goal}
                onChange={(e) => update({ goal: e.target.value })}
                placeholder='e.g. "Book a discovery call"'
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-context" className="font-normal">Company context</Label>
            <Input
              id="company-context"
              value={fields.company_context}
              onChange={(e) => update({ company_context: e.target.value })}
              placeholder='e.g. "Series B SaaS startup, 50-person sales team, recently missed quota"'
            />
          </div>

          {/* Personality */}
          <div className="space-y-1.5">
            <Label className="font-normal">Buyer personality</Label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ personality: fields.personality === p.toLowerCase() ? "" : p.toLowerCase() })}
                  className={cn(
                    "rounded-none border px-3 py-1 text-xs font-light transition-colors",
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
            <Label className="font-normal">Objections to raise</Label>
            {fields.objections.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">
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
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addObjection}
              className="h-7 text-xs text-muted-foreground"
            >
              <PlusIcon className="h-3 w-3" />
              Add objection
            </Button>
          </div>

          {/* Optional fields */}
          <div className="space-y-1.5">
            <Label htmlFor="withhold" className="font-normal">
              Information to withhold
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
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
            <Label htmlFor="notes" className="font-normal">
              Additional notes
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
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
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
          >
            {showPrompt ? "Hide" : "Preview"} compiled system prompt
          </button>
          {showPrompt && (
            <pre className="rounded-none border bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {compiledPrompt || "(Fill in fields above to see the compiled prompt)"}
            </pre>
          )}
        </div>

        {/* AI Generate Dialog */}
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-normal">Describe the buyer persona you want to practice against</Label>
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
                  <p className="text-sm text-destructive">{generateError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-none font-normal"
                  onClick={() => setGenerateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-none font-normal"
                  onClick={handleGenerate}
                  disabled={!generateDesc.trim() || generating}
                >
                  {generating ? <Spinner className="h-4 w-4" /> : <WandSparklesIcon className="h-4 w-4" />}
                  {generating ? "Generating…" : "Generate"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t bg-background">
        <div className="mx-auto w-full px-8 h-14 flex items-center justify-between gap-2">
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-none font-normal"
              onClick={() => router.push("/scenarios")}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none font-normal"
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? <Spinner className="h-4 w-4" /> : null}
              {editId ? "Save changes" : "Create scenario"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
