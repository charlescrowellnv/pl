import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS so we can update from a webhook
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase service role env vars")
  return createClient(url, key)
}

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) return false

  const signature = req.headers.get("elevenlabs-signature") ?? ""
  const [tPart, vPart] = signature.split(",")
  if (!tPart || !vPart) return false

  const t = tPart.replace("t=", "")
  const v = vPart.replace("v0=", "")

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const payload = `${t}.${rawBody}`
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return hex === v
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const valid = await verifySignature(req, rawBody)
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ElevenLabs post-call webhook shape
  const type = payload.type as string | undefined
  if (type !== "post_call_transcription") {
    // Acknowledge but ignore other event types
    return NextResponse.json({ ok: true })
  }

  const data = payload.data as Record<string, unknown> | undefined
  if (!data) return NextResponse.json({ error: "No data" }, { status: 400 })

  const conversationId  = data.conversation_id as string | undefined
  const durationSeconds = (data.metadata as Record<string, unknown> | undefined)?.call_duration_secs as number | undefined
  const transcript      = data.transcript as unknown[] | undefined

  const clientData  = data.conversation_initiation_client_data as Record<string, unknown> | undefined
  const dynamicVars = clientData?.dynamic_variables as Record<string, string> | undefined
  const sessionId   = dynamicVars?.session_id
  const userId      = dynamicVars?.user_id

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id in dynamic_variables" }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from("sessions")
    .update({
      elevenlabs_conversation_id: conversationId ?? null,
      duration_seconds:           durationSeconds ?? null,
      transcript:                 transcript ?? null,
      status:                     "scoring",
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Webhook: failed to update session", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
