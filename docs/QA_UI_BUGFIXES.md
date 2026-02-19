# QA: Bugfix Verification Steps

Covers fixes for: CTAs, auth redirect, View Source 404, footer, parser URLs.

---

## 1. Logged out: protected routes redirect to /auth

```
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://surplus-bus.vercel.app/dashboard
# Expected: 307 → /auth?callbackUrl=%2Fdashboard
```

---

## 2. Login returns to /dashboard + nav shows Logout

1. Open `/auth` in incognito
2. Click "Continue with Google"
3. Complete OAuth
4. **Expected:** Land on `/dashboard`
5. **Expected:** Sidebar shows Dashboard, Feed, Opportunities, etc.
6. **Expected:** Header shows user email + Logout icon (no "Login" link)

---

## 3. Logout clears session, returns to /

1. Click the Logout icon (top-right)
2. **Expected:** Redirected to `/` (home page)
3. **Expected:** Public nav with Login link shown
4. Visit `/dashboard`
5. **Expected:** Redirect to `/auth`

---

## 4. Home page CTAs clickable

1. Navigate to `/`
2. Hover "Join Beta" — cursor should be pointer
3. Click — **Expected:** Navigate to `/landing`
4. Go back to `/`
5. Hover "View Product Flow" — cursor should be pointer
6. Click — **Expected:** Navigate to `/product`

---

## 5. View Source opens external URL (no 404)

1. Navigate to `/opportunities` (logged in)
2. Click any opportunity to open detail
3. Look for "View source →" link
4. **Expected:** It's an `<a target="_blank">` (NOT a Next.js Link)
5. Click it — **Expected:** Opens the real government page in a new tab
6. If source URL is invalid: **Expected:** Shows "View source (unavailable)" greyed out

---

## 6. Footer shows clean content

1. Log out (or open incognito)
2. Check footer at bottom of any public page
3. **Expected:** Links: Terms | Privacy | Anti-Spam | FAQ
4. **Expected:** Copyright: "© 2026 Surplus Bus. Information service only. Not a broker."
5. **Expected:** No garbage text ("Extreme weather alerts", "Main navigation", etc.)

---

## 7. Opportunities list loads

1. Navigate to `/opportunities`
2. **Expected:** List of opportunities with title, province, category
3. Filter by province (e.g. AB)
4. **Expected:** List updates
5. Search for a keyword
6. **Expected:** List updates after ~400ms debounce

---

## 8. Opportunity detail + events

1. Click an opportunity title
2. **Expected:** Detail page loads with title, details, description
3. **Expected:** Activity section shows events (if any)
4. **Expected:** "← Back to opportunities" works

---

## 9. API smoke tests

```bash
# Ping (no auth)
curl https://surplus-bus.vercel.app/api/ping
# Expected: 200 { ok: true, ts: "..." }

# Health (no auth)
curl https://surplus-bus.vercel.app/api/health
# Expected: 200 { ok: true }

# Opportunities API returns source_url
curl -s https://surplus-bus.vercel.app/api/opportunities?page=1&pageSize=1
# Expected: 401 (requires auth) — verify in browser network tab that
# response includes source_url field for each opportunity
```

---

## 10. Parser source_url integrity

Run in Supabase SQL editor:

```sql
SELECT source, source_url
FROM public.opportunities
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:** Every `source_url` starts with `https://`.
If any are relative paths or missing protocol, the parser needs fixing.
