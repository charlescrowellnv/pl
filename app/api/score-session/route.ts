import { NextRequest, NextResponse } from "next/server"
import { start } from "workflow/api"
import { scoreSession } from "@/workflows/score-session"

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  const run = await start(scoreSession, [sessionId])
  return NextResponse.json({ runId: run.runId })
}
