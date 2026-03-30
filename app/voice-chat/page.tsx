"use client"

import dynamic from "next/dynamic"

const VoiceChatClient = dynamic(() => import("./voice-chat-client"), {
  ssr: false,
})

export default function Page() {
  return <VoiceChatClient />
}
