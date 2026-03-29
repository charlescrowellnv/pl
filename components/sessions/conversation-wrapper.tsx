"use client"

import { ConversationProvider } from "@elevenlabs/react"

export function ConversationWrapper({ children }: { children: React.ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>
}
