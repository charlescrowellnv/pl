import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get("orgId") ?? undefined

  // Resolve keys from Vault (personal → org fallback)
  const { data: keys } = await supabase
    .rpc("get_resolved_keys", { p_org_id: orgId ?? undefined })
    .single()

  const apiKey   = keys?.elevenlabs_api_key
  const agentId  = keys?.elevenlabs_agent_id

  if (!agentId) {
    return NextResponse.json(
      { error: "No ElevenLabs Agent ID configured. Visit Settings to add one." },
      { status: 400 }
    )
  }

  // No API key → return agentId so client can use public mode
  if (!apiKey) {
    return NextResponse.json({ agentId })
  }

  // Fetch signed URL from ElevenLabs
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } }
  )

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json(
      { error: `ElevenLabs error: ${res.status} ${body}` },
      { status: 502 }
    )
  }

  const { signed_url } = await res.json()
  return NextResponse.json({ signedUrl: signed_url })
}
