# QA: UI Manual Test Steps

## Prerequisites

- App deployed (e.g. https://surplus-bus.vercel.app)
- At least one successful agent run (so `opportunities` and `opportunity_events` have data)

---

## 1. Logged out: redirect to auth

1. Open app in incognito/private window
2. Navigate to `/dashboard`
3. **Expected:** Redirect to `/auth?callbackUrl=%2Fdashboard`
4. Navigate to `/feed`
5. **Expected:** Redirect to `/auth?callbackUrl=%2Ffeed`
6. Navigate to `/opportunities`
7. **Expected:** Redirect to `/auth?callbackUrl=%2Fopportunities`
8. Navigate to `/ops`
9. **Expected:** Redirect to `/auth?callbackUrl=%2Fops`

---

## 2. Login → redirect to dashboard (or callbackUrl)

1. From `/auth?callbackUrl=%2Fdashboard`, click "Continue with Google"
2. Complete Google OAuth
3. **Expected:** Land on `/dashboard` (or the `callbackUrl` if different)
4. **Expected:** Nav shows sidebar with Dashboard, Feed, Opportunities, etc.
5. **Expected:** Header shows user email + role badge + Logout button
6. **Expected:** No "Login" link visible in nav
7. **Expected:** No infinite redirect loops

---

## 3. Nav shows Logout when authenticated

1. After login, check the header (top-right)
2. **Expected:** User email displayed, role badge, Logout icon button
3. Click Logout
4. **Expected:** Redirected to `/` (home page)
5. **Expected:** Public nav shown with Home, Beta, Pricing, FAQ, Login links

---

## 4. Dashboard loads

1. Navigate to `/dashboard`
2. **Expected:** Dashboard shows:
   - "Data fresh" or "Data stale" pill (top-right in header)
   - Alerts section
   - Recent opportunities (if any)
   - Quick action buttons
3. **Expected:** No blank screens or errors

---

## 5. Feed loads

1. Click "Feed" in nav
2. **Expected:** `/feed` loads
3. **Expected:** Either list of events (with opportunity links) or empty state
4. Click an event's opportunity link (if any)
5. **Expected:** Navigate to `/opportunities/[id]`

---

## 6. Opportunities list + filters

1. Click "Opportunities" in nav
2. **Expected:** `/opportunities` loads
3. **Expected:** Province dropdown, Category dropdown, Search input
4. Change province (e.g. ON)
5. **Expected:** List updates (or empty state)
6. Type in Search
7. **Expected:** List updates after ~400ms debounce
8. Click an opportunity title
9. **Expected:** Navigate to `/opportunities/[id]`

---

## 7. Opportunity detail + View Source

1. On `/opportunities/[id]`
2. **Expected:** Title, province, category, source
3. **Expected:** Details (value, closing date, issuing entity if present)
4. **Expected:** Description (if present)
5. **Expected:** Activity section (last 20 events, if any)
6. **Expected:** "View source →" link if source_url is a valid HTTP URL
7. Click "View source →"
8. **Expected:** Opens external URL in new tab (NOT internal routing, NOT 404)
9. **Expected:** Save button works
10. Click "← Back to opportunities"
11. **Expected:** Return to `/opportunities`

---

## 8. Home page CTAs clickable

1. Navigate to `/` (home)
2. **Expected:** "Join Beta" button is a real link to `/landing`
3. **Expected:** "View Product Flow" button is a real link to `/product`
4. Click each
5. **Expected:** Navigation occurs, cursor shows pointer on hover

---

## 9. Footer shows correct content

1. On any public page (logged out)
2. **Expected:** Footer shows: Terms | Privacy | Anti-Spam | FAQ
3. **Expected:** Copyright line: "© 2026 Surplus Bus. Information service only. Not a broker."
4. **Expected:** No stray text like "Extreme weather alerts" or "Main navigation"

---

## 10. API smoke tests

```bash
# Ping (no auth)
curl https://surplus-bus.vercel.app/api/ping
# Expected: 200, { ok: true, ts: "...", commit: "..." }

# Health (no auth)
curl https://surplus-bus.vercel.app/api/health
# Expected: 200, { ok: true }

# Protected route without auth
curl -s -o /dev/null -w "%{http_code}" https://surplus-bus.vercel.app/api/status
# Expected: 401
```

---

## 11. No redirect loops

1. Log in
2. Navigate: Dashboard → Feed → Opportunities → [detail] → Back
3. **Expected:** No redirect loops, no blank screens
4. Log out
5. **Expected:** Redirect to `/` (home page)
6. Navigate to `/dashboard`
7. **Expected:** Redirect to `/auth?callbackUrl=%2Fdashboard`
