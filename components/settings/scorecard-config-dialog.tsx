"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  BracesIcon,
  BracketsIcon,
  FileTextIcon,
  HashIcon,
  PlusIcon,
  SettingsIcon,
  ToggleLeftIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "string" | "boolean" | "object" | "array" | "number"

export interface SchemaField {
  id: string
  name: string
  type: FieldType
  description: string
  children: SchemaField[]
  arrayItemType: FieldType
  arrayItemDescription: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newField(overrides?: Partial<SchemaField>): SchemaField {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "string",
    description: "",
    children: [],
    arrayItemType: "string",
    arrayItemDescription: "",
    ...overrides,
  }
}

export function fieldsToJsonSchema(
  fields: SchemaField[],
  title?: string
): Record<string, unknown> {
  function fieldToSchema(f: SchemaField): Record<string, unknown> {
    const base: Record<string, unknown> = {}
    if (f.description) base.description = f.description
    if (f.type === "object") {
      base.type = "object"
      const named = f.children.filter((c) => c.name)
      const props: Record<string, unknown> = {}
      for (const child of named) props[child.name] = fieldToSchema(child)
      base.properties = props
      base.required = named.map((c) => c.name)
      base.additionalProperties = false
    } else if (f.type === "array") {
      base.type = "array"
      const items: Record<string, unknown> = { type: f.arrayItemType }
      if (f.arrayItemDescription) items.description = f.arrayItemDescription
      base.items = items
    } else {
      base.type = f.type
    }
    return base
  }

  const named = fields.filter((f) => f.name)
  const properties: Record<string, unknown> = {}
  for (const f of named) properties[f.name] = fieldToSchema(f)
  const schema: Record<string, unknown> = {
    type: "object",
    properties,
    required: named.map((f) => f.name),
    additionalProperties: false,
  }
  if (title) schema.title = title
  return schema
}

export function fieldsToAnthropicSchema(
  fields: SchemaField[],
  title?: string
): Record<string, unknown> {
  return {
    output_config: {
      format: {
        type: "json_schema",
        schema: fieldsToJsonSchema(fields, title),
      },
    },
  }
}

export function fieldsToZodString(fields: SchemaField[], indent = 0): string {
  const pad = (n: number) => " ".repeat(n * 2)

  function fieldToZod(f: SchemaField): string {
    let expr: string
    if (f.type === "object") {
      const named = f.children.filter((c) => c.name)
      if (named.length === 0) {
        expr = "z.object({})"
      } else {
        const inner = named
          .map((c) => `${pad(indent + 2)}${c.name}: ${fieldToZod(c)}`)
          .join(",\n")
        expr = `z.object({\n${inner},\n${pad(indent + 1)}})`
      }
    } else if (f.type === "array") {
      const itemExpr = f.arrayItemDescription
        ? `z.${f.arrayItemType}().describe(${JSON.stringify(f.arrayItemDescription)})`
        : `z.${f.arrayItemType}()`
      expr = `z.array(${itemExpr})`
    } else {
      expr = `z.${f.type}()`
    }
    if (f.description) {
      expr += `.describe(${JSON.stringify(f.description)})`
    }
    return expr
  }

  const named = fields.filter((f) => f.name)
  if (named.length === 0) return "z.object({})"
  const inner = named
    .map((f) => `${pad(indent + 1)}${f.name}: ${fieldToZod(f)}`)
    .join(",\n")
  return `z.object({\n${inner},\n${pad(indent)}})`
}

// ── Sub-components ───────────────────────────────────────────────────────────

const TYPE_LABEL: Record<FieldType, string> = {
  string: "STR",
  boolean: "BOOL",
  object: "OBJ",
  array: "ARR",
  number: "NUM",
}

function TypeIcon({
  type,
  className,
}: {
  type: FieldType
  className?: string
}) {
  const base = cn("size-4 shrink-0", className)
  switch (type) {
    case "string":
      return <FileTextIcon className={cn(base, "text-green-500")} />
    case "boolean":
      return <ToggleLeftIcon className={cn(base, "text-orange-500")} />
    case "object":
      return <BracesIcon className={cn(base, "text-purple-500")} />
    case "array":
      return <BracketsIcon className={cn(base, "text-pink-500")} />
    case "number":
      return <HashIcon className={cn(base, "text-blue-500")} />
  }
}

function TypeSelect({
  value,
  onChange,
  size = "default",
}: {
  value: FieldType
  onChange: (v: FieldType) => void
  size?: "sm" | "default"
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FieldType)}>
      <SelectTrigger size={size} className="w-[90px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => (
          <SelectItem key={t} value={t} className="">
            {TYPE_LABEL[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FieldRow({
  field,
  depth,
  siblingNames,
  onUpdate,
  onDelete,
}: {
  field: SchemaField
  depth: number
  siblingNames: string[]
  onUpdate: (updated: SchemaField) => void
  onDelete: () => void
}) {
  function update(patch: Partial<SchemaField>) {
    onUpdate({ ...field, ...patch })
  }

  function addChild() {
    update({ children: [...field.children, newField()] })
  }

  function updateChild(index: number, updated: SchemaField) {
    const children = field.children.map((c, i) => (i === index ? updated : c))
    update({ children })
  }

  function deleteChild(index: number) {
    update({ children: field.children.filter((_, i) => i !== index) })
  }

  const isObj = field.type === "object"
  const isArr = field.type === "array"
  const indent = depth * 20
  const isDuplicate =
    field.name.trim() !== "" &&
    siblingNames.filter((n) => n === field.name).length > 1

  return (
    <FieldGroup>
      <div className="flex items-start gap-2" style={{ paddingLeft: indent }}>
        <TypeIcon type={field.type} className="mt-2 shrink-0" />
        <div className="grid flex-1 grid-cols-[160px_90px_1fr] gap-4">
          <Field data-invalid={isDuplicate || undefined}>
            <Input
              value={field.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="field_name"
              className="text-xs"
              aria-invalid={isDuplicate}
            />
            {isDuplicate && <FieldError>Name already exists</FieldError>}
          </Field>
          <Field>
            <TypeSelect
              value={field.type}
              onChange={(type) =>
                update({ type, children: isObj || isArr ? [] : field.children })
              }
            />
          </Field>
          <Field>
            <Input
              value={field.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Add description"
              className="text-xs"
            />
          </Field>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="mt-0.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon data-icon="inline-start" />
        </Button>
      </div>

      {isArr && (
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: indent + 20 }}
        >
          <TypeIcon type={field.arrayItemType} className="shrink-0" />
          <div className="grid flex-1 grid-cols-[160px_90px_1fr] gap-4">
            <span className="flex h-8 items-center text-muted-foreground">
              Array items
            </span>
            <TypeSelect
              value={field.arrayItemType}
              onChange={(arrayItemType) => update({ arrayItemType })}
            />
            <Input
              value={field.arrayItemDescription}
              onChange={(e) => update({ arrayItemDescription: e.target.value })}
              placeholder="Add description"
              className="text-xs"
            />
          </div>
          <div className="size-[28px] shrink-0" />
        </div>
      )}

      {isObj && (
        <div className="flex flex-col gap-4">
          {field.children.map((child, i) => (
            <FieldRow
              key={child.id}
              field={child}
              depth={depth + 1}
              siblingNames={field.children.map((c) => c.name)}
              onUpdate={(updated) => updateChild(i, updated)}
              onDelete={() => deleteChild(i)}
            />
          ))}
          <div style={{ paddingLeft: indent + 20 }}>
            <Button
              variant="ghost"
              className="w-fit text-muted-foreground"
              onClick={addChild}
            >
              <PlusIcon data-icon="inline-start" />
              Add nested
            </Button>
          </div>
        </div>
      )}
    </FieldGroup>
  )
}

// ── Dialog ───────────────────────────────────────────────────────────────────

export default function ScorecardConfigDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [fields, setFields] = useState<SchemaField[]>([newField()])
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateMode, setGenerateMode] = useState<"generate" | "update">(
    "generate"
  )
  const [generateDescription, setGenerateDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function openGenerateModal(mode: "generate" | "update") {
    setGenerateMode(mode)
    setGenerateError(null)
    setGenerateDescription("")
    setGenerateOpen(true)
  }

  function updateField(index: number, updated: SchemaField) {
    setFields((prev) => prev.map((f, i) => (i === index ? updated : f)))
  }

  function deleteField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  function addField() {
    setFields((prev) => [...prev, newField()])
  }

  function handleSave() {
    console.log(
      "Scorecard schema:",
      fieldsToJsonSchema(fields, name || undefined)
    )
    setOpen(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const isUpdate = generateMode === "update"
      const res = await fetch(
        isUpdate ? "/api/update-schema" : "/api/generate-schema",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isUpdate
              ? {
                  instruction: generateDescription,
                  currentSchema: { name, fields },
                }
              : { description: generateDescription }
          ),
        }
      )
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Generation failed")
      }
      const { name: generatedName, fields: generatedFields } = await res.json()
      setName(generatedName)
      setFields(generatedFields)
      setGenerateOpen(false)
      setGenerateDescription("")
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    } finally {
      setGenerating(false)
    }
  }

  const hasFields = fields.some((f) => f.name.trim() !== "")
  const zodPreview = fieldsToZodString(fields)
  const anthropicPreview = JSON.stringify(
    fieldsToAnthropicSchema(fields, name || undefined),
    null,
    2
  )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <SettingsIcon />
          Configure Scorecard
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-4xl">
        <Tabs defaultValue="simple" className="flex min-w-0 flex-col gap-4">
          <AlertDialogHeader className="flex flex-row items-center justify-between space-y-0">
            <AlertDialogTitle>Scorecard Schema</AlertDialogTitle>
            <TabsList>
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="zod">Zod</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </AlertDialogHeader>

          <TabsContent value="simple">
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="scorecard_schema"
                  className=""
                />
              </Field>
              <Field>
                <FieldLabel className="">Properties</FieldLabel>
                <div className="mt-2 mb-2 grid grid-cols-[160px_90px_1fr] gap-4 border-b pl-6">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">
                    Name
                  </FieldLabel>
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">
                    Type
                  </FieldLabel>
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">
                    Description
                  </FieldLabel>
                </div>
                <div className="flex max-h-72 flex-col gap-4 overflow-y-auto">
                  {fields.map((field, i) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      depth={0}
                      siblingNames={fields.map((f) => f.name)}
                      onUpdate={(updated) => updateField(i, updated)}
                      onDelete={() => deleteField(i)}
                    />
                  ))}
                </div>
              </Field>
              <Button variant="outline" className="w-fit" onClick={addField}>
                <PlusIcon data-icon="inline-start" />
                Add property
              </Button>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="zod" className="min-w-0 overflow-hidden">
            <pre className="max-h-[340px] overflow-auto rounded-lg bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
              {zodPreview}
            </pre>
          </TabsContent>

          <TabsContent value="json" className="min-w-0 overflow-hidden">
            <pre className="max-h-[340px] overflow-auto rounded-lg bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
              {anthropicPreview}
            </pre>
          </TabsContent>
        </Tabs>
        <AlertDialogFooter className="border-t">
          <div className="mr-auto flex gap-2">
            {hasFields ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => openGenerateModal("update")}
                >
                  <WandSparklesIcon data-icon="inline-start" />
                  Make changes
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    setName("")
                    setFields([newField()])
                  }}
                >
                  Clear
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => openGenerateModal("generate")}
              >
                <WandSparklesIcon data-icon="inline-start" />
                Generate
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </AlertDialogFooter>
      </AlertDialogContent>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {generateMode === "update" ? "Make Changes" : "Generate Schema"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 overflow-x-auto">
            <Field>
              <FieldLabel>
                {generateMode === "update"
                  ? "Describe what to change"
                  : "Describe your schema"}
              </FieldLabel>
              <Textarea
                value={generateDescription}
                onChange={(e) => setGenerateDescription(e.target.value)}
                placeholder={
                  generateMode === "update"
                    ? "e.g. Add a sentiment score field, rename call_date to call_timestamp, and make objections an array of objects with text and response fields."
                    : "e.g. A scorecard for evaluating sales calls — capture the rep's name, call duration, whether they followed the script, and a list of objections raised with how they were handled."
                }
                className="min-h-28 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleGenerate()
                  }
                }}
              />
              {generateError && <FieldError>{generateError}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!generateDescription.trim() || generating}
              >
                {generating ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <WandSparklesIcon data-icon="inline-start" />
                )}
                {generating
                  ? generateMode === "update"
                    ? "Updating…"
                    : "Generating…"
                  : generateMode === "update"
                    ? "Make changes"
                    : "Generate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  )
}
