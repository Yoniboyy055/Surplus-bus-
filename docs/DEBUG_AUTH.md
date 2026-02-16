# Auth Debug Checklist

Use this when Google OAuth or post-login routing fails.

---

## 1. Environment Variables

### Required (local + Vercel)

| Variable | Purpose | Where |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, for agents/profile bootstrap | Same (keep secret) |
| `CRON_SECRET` | Bearer auth for cron routes | Generate a random string |

### Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | App base URL (defaults to localhost:3000) |
| `OWNER_EMAIL` | Email that gets operator role |

### Vercel

1. Project → **Settings** → **Environment Variables**
2. Add all required vars for **Production** (and Preview if needed)
3. Redeploy after changing env vars

---

## 2. Supabase Redirect URLs

The OAuth callback URL must be allowlisted.

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://surplus-bus.vercel.app` (or your production URL)
3. **Redirect URLs** — add exactly:
   - `https://surplus-bus.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

If the URL is wrong or missing, Supabase will redirect to a default and the app will not receive the `code` parameter.

---

## 3. Google OAuth (Supabase Provider)

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable Google
3. Use Client ID and Client Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. In Google Cloud Console → OAuth 2.0 Client → **Authorized redirect URIs**:
   - Add: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - (Supabase shows this in the provider config)

---

## 4. Verify Callback Receives Code

1. Open DevTools → Network
2. Click "Continue with Google"
3. Complete Google sign-in
4. After redirect, check the final URL:
   - **Good**: `https://yoursite.com/auth/callback?code=...&next=...`
   - **Bad**: `https://yoursite.com/auth?error=missing_code` → redirect URL not allowlisted
   - **Bad**: `https://yoursite.com/auth?error=exchange_failed` → check Vercel logs

---

## 5. Vercel Logs

1. Vercel Dashboard → Project → **Deployments** → select deployment → **Functions**
2. Or: **Logs** tab for real-time output
3. Look for `[Auth]` prefixed messages:
   - `Callback invoked` — callback was hit
   - `Exchange failed` — code exchange failed (see error message)
   - `Session exchanged for user` — success

---

## 6. Client-Side Checks

- **Auth not configured**: `env` parse failed → check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **OAuth error**: Shown in red on auth page; also in browser console
- **Hydration**: AuthClient uses `useSearchParams` wrapped in `Suspense` — OK

---

## 7. Post-Login Routing

- Middleware redirects unauthenticated users from protected routes to `/auth?callbackUrl=<path>`
- After login, `/auth/callback` redirects to `next` (sanitized)
- Owner email → `/ops`
- Operator → `/ops`
- Others → `/dashboard`
