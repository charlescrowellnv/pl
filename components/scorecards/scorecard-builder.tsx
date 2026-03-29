"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, Trash2Icon, WandSparklesIcon, GripVerticalIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  saveScorecard,
  updateScorecard,
  type ScorecardComponentInput,
  type ActionError,
} from "@/app/scorecards/actions"

type ComponentDraft = {
  id: string
  name: string
  rubric_checkpoints: string[]
}

type Org = { id: string; name: string }

type Props = {
  editId?: string
  initialName?: string
  initialComponents?: ScorecardComponentInput[]
  orgs?: Org[]
  initialOrgId?: string | null
}

function newComponent(): ComponentDraft {
  return { id: crypto.randomUUID(), name: "", rubric_checkpoints: [""] }
}

export function ScorecardBuilder({
  editId,
  initialName = "",
  initialComponents = [],
  orgs = [],
  initialOrgId = null,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<ActionError | null>(null)

  const [name, setName] = useState(initialName)
  const [orgId, setOrgId] = useState<string | null>(initialOrgId)
  const [components, setComponents] = useState<ComponentDraft[]>(
    initialComponents.length > 0
      ? initialComponents.map((c) => ({ ...c, id: crypto.randomUUID() }))
      : [newComponent()]
  )

  // AI generate
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateDesc, setGenerateDesc] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // ── Component helpers ──────────────────────────────────────────────────────

  function updateComponent(id: string, patch: Partial<ComponentDraft>) {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id))
  }

  function addCheckpoint(compId: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === compId
          ? { ...c, rubric_checkpoints: [...c.rubric_checkpoints, ""] }
          : c
      )
    )
  }

  function updateCheckpoint(compId: string, index: number, value: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === compId
          ? {
              ...c,
              rubric_checkpoints: c.rubric_checkpoints.map((cp, i) =>
                i === index ? value : cp
              ),
            }
          : c
      )
    )
  }

  function removeCheckpoint(compId: string, index: number) {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === compId
          ? { ...c, rubric_checkpoints: c.rubric_checkpoints.filter((_, i) => i !== index) }
          : c
      )
    )
  }

  // ── AI generate ────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/scorecards/generate", {
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
      setComponents(
        data.components.map((c: ScorecardComponentInput) => ({
          ...c,
          id: crypto.randomUUID(),
        }))
      )
      setGenerateOpen(false)
      setGenerateDesc("")
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    setError(null)
    const input = {
      name,
      orgId,
      components: components.map((c) => ({
        name: c.name,
        rubric_checkpoints: c.rubric_checkpoints.filter((cp) => cp.trim()),
      })),
    }
    startTransition(async () => {
      const result = editId
        ? await updateScorecard(editId, input)
        : await saveScorecard(input)
      if (result) setError(result)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {editId ? "Edit Scorecard" : "New Scorecard"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define the components and rubric checkpoints Claude will evaluate.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setGenerateOpen(true)}
        >
          <WandSparklesIcon className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="scorecard-name">Name</Label>
        <Input
          id="scorecard-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Discovery Call"
        />
      </div>

      {/* Visibility — only shown if user is in an org */}
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
            {orgId
              ? "Shared with all team members. Only admins can edit."
              : "Only visible to you."}
          </p>
        </div>
      )}

      {/* Components */}
      <div className="space-y-4">
        <Label>Components</Label>
        {components.map((comp, compIdx) => (
          <div
            key={comp.id}
            className="border-border rounded-lg border p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <GripVerticalIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              <Input
                value={comp.name}
                onChange={(e) => updateComponent(comp.id, { name: e.target.value })}
                placeholder={`Component ${compIdx + 1} name, e.g. "Opening"`}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeComponent(comp.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                disabled={components.length === 1}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>

            {/* Rubric checkpoints */}
            <div className="space-y-2 pl-6">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Rubric Checkpoints
              </p>
              {comp.rubric_checkpoints.map((cp, cpIdx) => (
                <div key={cpIdx} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-4 shrink-0 text-right">
                    {cpIdx + 1}.
                  </span>
                  <Input
                    value={cp}
                    onChange={(e) => updateCheckpoint(comp.id, cpIdx, e.target.value)}
                    placeholder='e.g. "Did the rep introduce themselves clearly?"'
                    className="flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCheckpoint(comp.id)
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCheckpoint(comp.id, cpIdx)}
                    className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                    disabled={comp.rubric_checkpoints.length === 1}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addCheckpoint(comp.id)}
                className="text-muted-foreground h-7 text-xs"
              >
                <PlusIcon className="h-3 w-3" />
                Add checkpoint
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={() => setComponents((prev) => [...prev, newComponent()])}
          className="w-full"
        >
          <PlusIcon className="h-4 w-4" />
          Add component
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-destructive text-sm">{error.message}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={() => router.push("/scorecards")} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <Spinner className="h-4 w-4" /> : null}
          {editId ? "Save changes" : "Create scorecard"}
        </Button>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Scorecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Describe the call type or skill you want to evaluate</Label>
              <Textarea
                value={generateDesc}
                onChange={(e) => setGenerateDesc(e.target.value)}
                placeholder="e.g. A scorecard for evaluating cold calls — covering the hook, value prop, objection handling, and booking a next step."
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
              <Button
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
  )
}
