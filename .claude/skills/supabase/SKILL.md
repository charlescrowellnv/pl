---
name: supabase
description: Expert guidance for Supabase development — database functions, migrations, RLS policies, Postgres SQL style, Realtime, and Edge Functions. Use when writing Supabase database functions, creating migrations, defining row level security policies, writing Postgres SQL, implementing Supabase Realtime (channels, broadcast, presence), or building Supabase Edge Functions with Deno. Triggers on mentions of "Supabase", "RLS", "row level security", "edge function", "realtime", "postgres migration", "database function", "supabase/migrations", or any Supabase-specific task.
---

# Supabase

Expert guidance across all Supabase development areas. Reference the appropriate section below based on the task.

## Database Functions

Write PostgreSQL functions with these rules:

- Default to `SECURITY INVOKER`; use `SECURITY DEFINER` only when explicitly required
- Always set `set search_path = ''` to prevent schema resolution issues
- Use fully qualified names (`schema_name.table_name`) for all objects
- Prefer `IMMUTABLE` or `STABLE` over `VOLATILE` where possible
- Clearly specify input/output types

```sql
create or replace function public.my_function(param bigint)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return (select name from public.my_table where id = param);
end;
$$;
```

For trigger functions, always include the `CREATE TRIGGER` statement. See [db-functions.md](references/db-functions.md) for full examples.

## Migrations

- Place files in `supabase/migrations/`
- Name format: `YYYYMMDDHHmmss_short_description.sql` (UTC time)
- Write all SQL in lowercase
- Include a header comment describing purpose and affected tables
- Always enable RLS on new tables, even for public access
- Add copious comments on destructive operations (drop, truncate, alter column)
- RLS policies must be granular: one policy per operation (`select`, `insert`, `update`, `delete`) per role (`anon`, `authenticated`)

## RLS Policies

- Only use `CREATE POLICY` or `ALTER POLICY`
- Use `auth.uid()` wrapped in `(select auth.uid())` for performance
- Use `TO authenticated` / `TO anon` — never omit the role
- `SELECT` → `USING` only; `INSERT` → `WITH CHECK` only; `UPDATE` → both; `DELETE` → `USING` only
- Never use `FOR ALL` — create 4 separate policies
- Policy names should be descriptive, in double quotes
- Prefer `PERMISSIVE` over `RESTRICTIVE`
- Add indexes on columns used in policy conditions

```sql
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ( (select auth.uid()) = user_id );
```

See [rls-policies.md](references/rls-policies.md) for advanced patterns (JWT, MFA, joins, performance).

## Postgres SQL Style

- Lowercase SQL keywords
- `snake_case` for tables (plural) and columns (singular)
- Always add schema prefix in queries
- `id bigint generated always as identity primary key` on every table
- Add a `comment on table` for every new table
- Use CTEs for complex queries; add comments to each CTE block
- Use `as` keyword for all aliases

See [sql-style.md](references/sql-style.md) for query formatting examples.

## Supabase Realtime

**Always use `broadcast` — never `postgres_changes`.**

- Use `private: true` for channels using database triggers or RLS
- Topic naming: `scope:entity:id` (e.g., `room:123:messages`)
- Event naming: `entity_action` snake_case (e.g., `message_created`)
- Always include cleanup/unsubscribe logic
- Use `realtime.broadcast_changes` in database triggers (not `realtime.send`) for table change notifications
- Add indexes on columns used in RLS policies for `realtime.messages`

```javascript
const channel = supabase.channel(`room:${roomId}:messages`, {
  config: { private: true }
})
channel
  .on('broadcast', { event: 'message_created' }, handleMessage)
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
```

See [realtime.md](references/realtime.md) for trigger functions, authorization setup, React patterns, and migration from `postgres_changes`.

## Edge Functions

- Use `Deno.serve` — never `import { serve } from "https://deno.land/std/.../server.ts"`
- Prefer Web APIs and Deno core APIs over external dependencies
- Import external packages with `npm:` or `jsr:` specifiers and pin versions (e.g., `npm:express@4.18.2`)
- Use `node:` specifier for Node built-ins (e.g., `import process from "node:process"`)
- Shared utilities go in `supabase/functions/_shared/` — no cross-dependencies between functions
- File writes only permitted in `/tmp`
- Use `EdgeRuntime.waitUntil(promise)` for background tasks
- These env vars are pre-populated: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`

```typescript
Deno.serve(async (req: Request) => {
  const { name } = await req.json()
  return new Response(JSON.stringify({ message: `Hello ${name}` }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

See [edge-functions.md](references/edge-functions.md) for multi-route and embedding examples.
