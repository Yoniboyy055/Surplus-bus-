# Auth QA Checklist

Run these scenarios after any auth-related changes. Use an incognito/private window for clean tests.

---

## 1. Confirm cookies are written

**After Google OAuth completes and you land on /dashboard:**

### DevTools → Application → Cookies
- You should see Supabase auth cookies (names like `sb-<project>-auth-token`, etc.).
- If cookies are missing, the redirect loop will occur.

### Network tab
- Find the `/auth/callback` request.
- **Response:** 302/303 redirect to `/dashboard` (or `next` param).
- **Response headers:** Must include `Set-Cookie` headers.
- If `Set-Cookie` is missing, the user will bounce.

---

## 2. Scenario A: Clean login

1. Open an incognito window.
2. Go to `/auth`.
3. Sign in with Google.
4. **Expect:** Land on `/dashboard` (or role-specific portal: `/operator`, `/buyer`, `/referrer`).

---

## 3. Scenario B: Protected route callbackUrl round-trip

1. Open an incognito window.
2. Go to `/buyer` (while logged out).
3. **Expect:** Redirected to `/auth?callbackUrl=%2Fbuyer`.
4. Sign in with Google.
5. **Expect:** Land on `/buyer`.

---

## 4. Scenario C: Auth-page lockout

1. Ensure you are logged in.
2. Go to `/auth`.
3. **Expect:** Redirected to `/dashboard`.

---

## 5. Open-redirect check

1. Visit `/auth?callbackUrl=https://evil.com`.
2. Sign in.
3. **Expect:** Land on `/dashboard` (or default), not evil.com.

---

## 6. Supabase URL configuration

In Supabase Dashboard → Auth → URL Configuration:

- **Site URL:** Your base URL (e.g. `http://localhost:3000`).
- **Redirect URLs:** Must include:
  - `http://localhost:3000/auth/callback`
  - Your production callback URL (e.g. `https://yourdomain.com/auth/callback`).
  - For Vercel previews, add the preview callback or use a stable auth domain.

---

## 7. Manual test script (optional)

```bash
# 1. Start dev server
npm run dev

# 2. In incognito:
# - Visit http://localhost:3000/auth
# - Sign in
# - Verify redirect to /dashboard or role portal

# 3. Log out, visit http://localhost:3000/buyer
# - Verify redirect to /auth?callbackUrl=%2Fbuyer
# - Sign in
# - Verify redirect to /buyer

# 4. While logged in, visit http://localhost:3000/auth
# - Verify redirect to /dashboard
```
