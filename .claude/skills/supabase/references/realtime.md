# Supabase Realtime — Reference

## Function Selection

| Use Case | Recommended | Why Not postgres_changes |
|----------|-------------|--------------------------|
| Custom payloads with business logic | `broadcast` | More flexible, better performance |
| Database change notifications | `broadcast` via triggers | More scalable, customizable payloads |
| High-frequency updates | `broadcast` with minimal payload | Better throughput |
| User presence/status | `presence` (sparingly) | Specialized for state sync |
| Client-to-client communication | `broadcast` (websockets only) | More flexible |

## React Pattern

```javascript
const channelRef = useRef(null)

useEffect(() => {
  if (channelRef.current?.state === 'subscribed') return

  const channel = supabase.channel(`room:${roomId}:messages`, {
    config: { private: true }
  })
  channelRef.current = channel

  await supabase.realtime.setAuth()

  channel
    .on('broadcast', { event: 'message_created' }, handleMessage)
    .on('broadcast', { event: 'user_joined' }, handleUserJoined)
    .subscribe()

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }
}, [roomId])
```

## Database Trigger Functions

### Using `realtime.broadcast_changes` (Recommended)

```sql
CREATE OR REPLACE FUNCTION notify_table_changes()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    TG_TABLE_NAME || ':' || COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

Table-specific trigger:

```sql
CREATE OR REPLACE FUNCTION room_messages_broadcast_trigger()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'room:' || COALESCE(NEW.room_id, OLD.room_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### Conditional Broadcasting

```sql
IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
  PERFORM realtime.broadcast_changes(
    'room:' || NEW.room_id::text,
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
END IF;
```

### Using `realtime.send` (Custom messages / public channels)

```sql
CREATE OR REPLACE FUNCTION notify_custom_event()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.send(
    'room:' || NEW.room_id::text,
    'status_changed',
    jsonb_build_object('id', NEW.id, 'status', NEW.status),
    false
  );
  RETURN NEW;
END;
$$;
```

## Authorization Setup

### RLS for Private Channels

```sql
-- Read access
CREATE POLICY "room_members_can_read" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'room:%' AND
  EXISTS (
    SELECT 1 FROM room_members
    WHERE user_id = auth.uid()
    AND room_id = SPLIT_PART(topic, ':', 2)::uuid
  )
);

-- Write access
CREATE POLICY "room_members_can_write" ON realtime.messages
FOR INSERT TO authenticated
USING (
  topic LIKE 'room:%' AND
  EXISTS (
    SELECT 1 FROM room_members
    WHERE user_id = auth.uid()
    AND room_id = SPLIT_PART(topic, ':', 2)::uuid
  )
);

-- Required index
CREATE INDEX idx_room_members_user_room
ON room_members(user_id, room_id);
```

### Client Authorization

```javascript
const channel = supabase.channel('room:123:messages', {
  config: { private: true }
})
  .on('broadcast', { event: 'message_created' }, handleMessage)

await supabase.realtime.setAuth()
await channel.subscribe()
```

## Migration from `postgres_changes`

```javascript
// Remove
const old = supabase.channel('changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, cb)

// Replace with
const newChannel = supabase.channel(`messages:${room_id}:changes`, {
  config: { private: true }
})
.on('broadcast', { event: 'INSERT' }, cb)
.on('broadcast', { event: 'UPDATE' }, cb)
.on('broadcast', { event: 'DELETE' }, cb)
```

Then add the database trigger and authorization policy (see above).

## Error Handling & Reconnection

Supabase Realtime handles reconnection automatically (exponential backoff, channel rejoining). Monitor state:

```javascript
channel.subscribe((status, err) => {
  switch (status) {
    case 'SUBSCRIBED': console.log('Connected'); break
    case 'CHANNEL_ERROR': console.error('Error:', err); break
    case 'CLOSED': console.log('Closed'); break
  }
})
```

Custom reconnection timing:

```javascript
const supabase = createClient('URL', 'ANON_KEY', {
  realtime: { params: { reconnectAfterMs: 1000 } }
})
```
