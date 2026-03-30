"use client"

import { useRef, useState, useTransition } from "react"
import { PencilIcon, CheckIcon, XIcon } from "lucide-react"
import { renameSession } from "@/app/sessions/actions"
import { useRouter } from "next/navigation"

interface Props {
  sessionId: string
  label: string | null
  fallback: string
}

export function SessionLabel({ sessionId, label, fallback }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label ?? "")
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function startEditing() {
    setValue(label ?? "")
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancel() {
    setEditing(false)
    setValue(label ?? "")
  }

  function save() {
    const trimmed = value.trim()
    setEditing(false)
    startTransition(async () => {
      await renameSession(sessionId, trimmed)
      router.refresh()
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") cancel()
  }

  function onBlur() {
    cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={fallback}
          className="text-2xl font-normal bg-transparent border-b border-border focus:border-foreground outline-none w-full"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); save() }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Save"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel() }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Cancel"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startEditing}
      disabled={isPending}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-2xl font-normal">
        {label ?? fallback}
      </h1>
      <PencilIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}
