# 📌 Smart Bookmarks — Realtime Debugging Report

## 🧠 Project Overview

**Project:** Smart Bookmarks App  
**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Tailwind CSS  
**Live Vercel Link:** https://smart-bookmarks-app-dhanush.vercel.app/

---

## Problem run into

When a bookmark is added in one browser tab or the same, it should instantly appear in other open tabs or same tab — without refreshing the page.

---
## Honest take intitally what all ways I tried to solve it 

when realtime is not working , I researched what's the issue I need to create a publication record in table for supabase which is new to me after going through documentations, videos I created the table and added realtime publication in supabase Thought it was solved but then same error which was not solved

Then i went to debugging stage add all console log in every block payload status subscribed status and found payload was not appering after adding bookmarks Then there i found root cause used Tool and gave the problem and the apporach then i got to know users_id filters blocking it , after removing that publicaiton came to console statements after all fix the backend logs were correct but the UI was not updating after these fixes

After analysis react was not re rendering properly with Server Action revalidation overwriting Realtime state Then fix taken on Once the first Realtime event
fires, block subsequent initialBookmarks syncs from the server re-render

So i did 4 fixes to solves this one problem , it's was good experience and learning 
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
