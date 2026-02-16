# QA: UI Manual Test Steps

## Prerequisites

- App deployed (e.g. https://surplus-bus.vercel.app)
- At least one successful agent run (so `opportunities` and `opportunity_events` have data)

---

## 1. Logged out: redirect to auth

1. Open app in incognito/private window
2. Navigate to `/dashboard`
3. **Expected:** Redirect to `/auth`
4. Navigate to `/feed`
5. **Expected:** Redirect to `/auth`
6. Navigate to `/opportunities`
7. **Expected:** Redirect to `/auth`

---

## 2. Logged in: Dashboard loads

1. Sign in (Google OAuth)
2. **Expected:** Land on `/dashboard`
3. **Expected:** Dashboard shows:
   - "Data fresh" or "Data stale" pill (top-right in header)
   - Alerts section
   - Ingestion section
   - Recent opportunities (if any)
   - Browse opportunities, Feed, Saved, Inbox buttons
4. **Expected:** No infinite redirect loops

---

## 3. Feed loads

1. Click "Feed" in nav or "View feed →" on dashboard
2. **Expected:** `/feed` loads
3. **Expected:** Either list of events (with opportunity links) or "No new activity yet" empty state
4. Click an event’s opportunity link (if any)
5. **Expected:** Navigate to `/opportunities/[id]`

---

## 4. Opportunities list + filters

1. Click "Opportunities" in nav or "Browse opportunities"
2. **Expected:** `/opportunities` loads
3. **Expected:** Province dropdown, Category dropdown, Search input
4. Change province (e.g. ON)
5. **Expected:** List updates (or empty state)
6. Type in Search
7. **Expected:** List updates after debounce
8. Click an opportunity
9. **Expected:** Navigate to `/opportunities/[id]`

---

## 5. Opportunity detail

1. On `/opportunities/[id]`
2. **Expected:** Title, province, category, source
3. **Expected:** Details (value, closing date, issuing entity if present)
4. **Expected:** Description (if present)
5. **Expected:** Activity section (last 20 events, if any)
6. **Expected:** "View source" link (if source_url present)
7. **Expected:** Save button works
8. Click "← Back to opportunities"
9. **Expected:** Return to `/opportunities`

---

## 6. API smoke tests

```powershell
# Ping (no auth)
Invoke-WebRequest -Uri "https://surplus-bus.vercel.app/api/_ping"
# Expected: 200, JSON with ok: true

# Dashboard (requires auth cookie - use browser)
# Or run agent to populate data first
```

---

## 7. No redirect loops

1. Log in
2. Navigate: Dashboard → Feed → Opportunities → [detail] → Back
3. **Expected:** No redirect loops, no blank screens
4. Log out
5. **Expected:** Redirect to `/auth`
