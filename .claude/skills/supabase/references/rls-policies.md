# RLS Policies — Reference

## Authenticated and Unauthenticated Roles

Supabase maps every request to one of:
- `anon`: unauthenticated request
- `authenticated`: authenticated request

```sql
create policy "Profiles are viewable by everyone"
on profiles
for select
to authenticated, anon
using ( true );
```

Note: `for ...` must come before `to ...`.

## Correct Clause Order

```sql
-- Correct
create policy "Public profiles are viewable only by authenticated users"
on profiles
for select
to authenticated
using ( true );

-- Incorrect (to before for)
create policy "..."
on profiles
to authenticated
for select
using ( true );
```

## Multiple Operations — Use Separate Policies

```sql
-- Correct: one policy per operation
create policy "Profiles can be created by any user"
on profiles
for insert
to authenticated
with check ( true );

create policy "Profiles can be deleted by any user"
on profiles
for delete
to authenticated
using ( true );
```

## Helper Functions

### `auth.uid()`
Returns the ID of the user making the request.

### `auth.jwt()`
Returns the JWT. Access `raw_app_meta_data` for authorization data (cannot be modified by users). Access `raw_user_meta_data` for user-editable data.

```sql
create policy "User is in team"
on my_table
to authenticated
using ( team_id in (select auth.jwt() -> 'app_metadata' -> 'teams'));
```

### MFA Check

```sql
create policy "Restrict updates."
on profiles
as restrictive
for update
to authenticated using (
  (select auth.jwt()->>'aal') = 'aal2'
);
```

## Performance Recommendations

### Add Indexes

```sql
create index userid
on test_table
using btree (user_id);
```

### Wrap Functions with `select` to Cache per Statement

```sql
-- Better performance
create policy "Users can access their own records" on test_table
to authenticated
using ( (select auth.uid()) = user_id );
```

### Minimize Joins — Use `IN` or `ANY` Instead

```sql
-- Slow (join on source table)
create policy "Users can access records belonging to their teams" on test_table
to authenticated
using (
  (select auth.uid()) in (
    select user_id from team_user
    where team_user.team_id = team_id
  )
);

-- Fast (no join)
create policy "Users can access records belonging to their teams" on test_table
to authenticated
using (
  team_id in (
    select team_id from team_user
    where user_id = (select auth.uid())
  )
);
```

### Always Specify Role with `TO`

```sql
-- Always include TO clause to prevent policy running for anon users
create policy "Users can access their own records" on rls_test
to authenticated
using ( (select auth.uid()) = user_id );
```
