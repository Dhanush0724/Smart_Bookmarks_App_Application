# 📌 Smart Bookmarks — Realtime Debugging Report

## 🧠 Project Overview

**Project:** Smart Bookmarks App  
**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Tailwind CSS  
**Feature:** Real-time bookmark synchronization across browser tabs  
**Status:** ✅ Resolved  

---

## 🎯 Requirement

When a bookmark is added in one browser tab, it should instantly appear in other open tabs — without refreshing the page.

---

# 🚨 Problem Statement

After implementing Supabase Realtime (Postgres Changes), the subscription showed `SUBSCRIBED` status — but:

- New bookmarks only appeared after a full page refresh  
- No Realtime payloads were received in the console  
- Two-tab sync did not work  

### Expected vs Actual Behavior

| Scenario | Expected | Actual |
|-----------|----------|--------|
| Add bookmark in Tab A | Appears instantly in Tab B | Required refresh |
| Realtime event | INSERT event received | No payload received |
| Sync behavior | Live update | Stale UI |

---

# 🔍 Root Causes Identified

After systematic debugging, three separate issues were discovered.

---

## 1️⃣ Realtime Publication Not Configured

The `bookmarks` table was not added to the `supabase_realtime` publication.

Even though Realtime was enabled in the dashboard, no events were broadcast.

### ✅ Fix

```sql
alter publication supabase_realtime add table public.bookmarks;
### Verification

Run the following query to confirm the table has been added to the `supabase_realtime` publication:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
```

---

## 2. Row-Level Filter Silently Rejected (RLS Enabled)

### Initial Subscription

```ts
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'bookmarks',
  filter: `user_id=eq.${userId}`,
})
```

### Problem

When Row Level Security (RLS) is enabled, Supabase silently ignores channel-level filters.

The subscription appears successful (`SUBSCRIBED`) but delivers no events.

### Fix

Remove the filter from the channel and filter manually inside the callback:

```ts
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'bookmarks',
}, (payload) => {
  if (payload.eventType === 'INSERT') {
    const newBookmark = payload.new
    if (newBookmark.user_id !== userId) return
    // update state
  }
})
```

---

## 3. JWT Not Passed to Realtime Connection

The browser Supabase client does not automatically attach the session token to Realtime WebSocket connections.

Without explicitly setting authentication, authenticated `postgres_changes` events are not delivered.

### Fix

```ts
const { data: { session } } = await supabase.auth.getSession()

if (session) {
  supabase.realtime.setAuth(session.access_token)
}
```

---

## 4. Next.js Server Action Revalidation Overwriting State

After adding a bookmark using a Server Action:

- Next.js automatically revalidated the route
- The Server Component re-rendered
- `initialBookmarks` was passed again as props
- Client state was reset
- The Realtime update was overwritten

This was a React state synchronization issue.

### Fix — Lock Realtime State with `useRef`

```ts
const realtimeUpdated = useRef(false)

useEffect(() => {
  if (!realtimeUpdated.current) {
    setBookmarks(initialBookmarks)
  }
}, [initialBookmarks])
```

Inside the Realtime handler:

```ts
realtimeUpdated.current = true
```

This prevents server re-renders from overwriting client-side Realtime state once Realtime takes control.
