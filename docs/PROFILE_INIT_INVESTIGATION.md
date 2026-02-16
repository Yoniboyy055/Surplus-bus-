# Profile Initialization Investigation

## 1. Exact Logic of ensureProfile

```
ensureProfile(userClient, user):
  1. SELECT from profiles WHERE id = user.id (using userClient = anon with session)
  2. If found:
     - If isOwnerEmail && role !== 'operator': UPDATE role='operator' via adminClient
     - Else: return existing
  3. If not found:
     - role = isOwnerEmail ? 'operator' : 'referrer'
     - UPSERT into profiles (id, email, role, created_at) via adminClient, onConflict: 'id'
  4. Return profile
```

**Writes:** Uses `getAdminClient()` (service_role) for both UPDATE and INSERT. ✅ Not anon.

**Schema:** Inserts `id`, `email`, `role`, `created_at`. All exist in `profiles`. ✅

**Role columns:** Assumes `role` in `profiles`. Schema has `profiles_role_check`: `role IN ('buyer','operator','referrer','admin')`. ✅

---

## 2. DB Context

- **handle_new_user trigger** on `auth.users` INSERT: creates profile with `role='buyer'` (ON CONFLICT DO NOTHING)
- **profiles_create_role_record trigger** on `profiles` INSERT/UPDATE: when role='buyer' or 'referrer', inserts into `buyers` or `referrers`
- **ensureProfile** runs after `exchangeCodeForSession`; profile usually already exists from trigger

---

## 3. Root Cause Hypothesis

**Most likely cause:** `SUPABASE_SERVICE_ROLE_KEY` missing or empty on Vercel.

- `getAdminClient()` throws when `!url || !key`
- Error thrown before any DB call
- Vercel deploy log showed: "SUPABASE_SERVICE_ROLE_KEY" was removed

**Root cause line:** `lib/auth/ensureProfile.ts:84-84` — `throw new Error("ensureProfile: Missing SUPABASE_SERVICE_ROLE_KEY or URL for admin operations")`

**Secondary:** If service role key exists but trigger fails, the UPSERT could hit a constraint (e.g. `profiles_email_key` UNIQUE if email already exists elsewhere). Less likely for new users.

---

## 4. Required Fix

### 4.1 Vercel (immediate)

**Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel project settings.**

- Project → Settings → Environment Variables
- Add `SUPABASE_SERVICE_ROLE_KEY` with the Supabase service role key
- Redeploy

### 4.2 Schema (optional)

If you want to avoid `buyers`/`referrers` for intelligence-only users:

- Add `subscriber` to `profiles_role_check`
- Change `profiles_create_role_record` to not fire for `subscriber`
- Change ensureProfile default role from `referrer` to `subscriber`

---

## 5. Logging Added

- `[ensureProfile] user.id`, `user.email`
- `[ensureProfile] SELECT error` (if any)
- `[ensureProfile] INSERT payload`
- `[ensureProfile] getAdminClient failed` (if thrown)
- `[ensureProfile] Admin UPSERT failed` + full error object
- `[Auth] Profile bootstrap failed` + code, details, full error

Check Vercel → Logs for these after a failed sign-in.
