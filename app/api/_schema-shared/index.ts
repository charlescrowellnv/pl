import { z } from "zod"

export const fieldTypes = [
  "string",
  "boolean",
  "object",
  "array",
  "number",
] as const

export const childFieldSchema = z.object({
  name: z.string().describe("snake_case field name"),
  type: z.enum(fieldTypes),
  description: z.string(),
  arrayItemType: z.enum(fieldTypes),
})

export const leafFieldSchema = z.object({
  name: z.string().describe("snake_case field name"),
  type: z.enum(fieldTypes),
  description: z.string(),
  arrayItemType: z.enum(fieldTypes),
  children: z.array(childFieldSchema).default([]),
})

export const outputSchema = z.object({
  name: z.string().describe("A snake_case identifier for the schema"),
  fields: z.array(leafFieldSchema),
})

export type AnyField = {
  name: string
  type: string
  description: string
  arrayItemType: string
  children?: AnyField[]
}

export function addIds(fields: AnyField[]): (AnyField & { id: string })[] {
  return fields.map((f) => ({
    ...f,
    id: crypto.randomUUID(),
    children: addIds(f.children ?? []),
  }))
}

export const schemaRules = `Rules:
- Field names must be snake_case
- Use "string" for text, dates, and IDs
- Use "number" for numeric values
- Use "boolean" for true/false flags
- Use "object" for nested structures (populate children)
- Use "array" for lists (set arrayItemType appropriately)
- Write clear, concise descriptions for each field
- Keep nesting to 2 levels max unless clearly necessary`
