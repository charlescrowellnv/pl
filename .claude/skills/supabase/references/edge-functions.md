# Supabase Edge Functions — Reference

## Simple Hello World

```typescript
interface ReqPayload {
  name: string
}

Deno.serve(async (req: Request) => {
  const { name }: ReqPayload = await req.json()
  return new Response(JSON.stringify({ message: `Hello ${name}!` }), {
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
})
```

## Using Node Built-in APIs

```typescript
import { randomBytes } from 'node:crypto'
import process from 'node:process'

const generateRandomString = (length: number) => {
  return randomBytes(length).toString('hex')
}
```

## Using npm Packages

```typescript
import express from 'npm:express@4.18.2'

const app = express()

app.get(/(.*)/, (req, res) => {
  res.send('Welcome to Supabase')
})

app.listen(8000)
```

## Multi-Route Function with Hono

```typescript
import { Hono } from 'npm:hono@4'

const app = new Hono()

app.get('/my-function/health', (c) => c.json({ status: 'ok' }))
app.post('/my-function/process', async (c) => {
  const body = await c.req.json()
  return c.json({ result: body })
})

Deno.serve(app.fetch)
```

## Generate Embeddings with Supabase AI

```typescript
const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  const params = new URL(req.url).searchParams
  const input = params.get('text')
  const output = await model.run(input, { mean_pool: true, normalize: true })
  return new Response(JSON.stringify(output), {
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
})
```

## Background Tasks

```typescript
Deno.serve(async (req: Request) => {
  // Respond immediately, run task in background
  EdgeRuntime.waitUntil(longRunningTask())
  return new Response('Accepted', { status: 202 })
})
```

## Shared Utilities

Place shared code in `supabase/functions/_shared/`:

```typescript
// supabase/functions/_shared/supabase-client.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```

Import with relative path:

```typescript
import { supabase } from '../_shared/supabase-client.ts'
```

## Setting Secrets

```bash
supabase secrets set --env-file path/to/.env
```

Pre-populated variables (no setup needed):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
