# UX Hardening Verification

## 1) Auth Flow

### Magic Link Test
- User enters email at `/auth`
- Receives magic link email
- Clicks link → redirects to `/auth/callback?code=...`
- Code exchanged for session
- Auth cookies present in browser after redirect
- Session persists on page refresh

### Expected Cookies
- `sb-<project>-auth-token`
- `sb-<project>-auth-token.0` (if chunked)
- `sb-<project>-auth-token.1` (if chunked)

### Expected Redirect Behavior
- **No `next` param**: Routes by role
  - `operator` → `/operator`
  - `buyer` → `/buyer`
  - `referrer` → `/referrer`
  - No role/null role → `/onboarding/role`
- **With `next` param**: Redirects to specified path
- **Error cases**:
  - Missing code → `/auth?error=missing_code`
  - Exchange failed → `/auth?error=exchange_failed`
  - Profile init failed → `/auth?error=profile_init_failed`

---

## 2) Role Routing

### Test Cases

**Buyer**
- New buyer logs in
- Profile created with role='buyer'
- Redirected to `/buyer`
- Page shows: role + email

**Referrer**
- New referrer logs in
- Profile created with role='referrer'
- Redirected to `/referrer`
- Page shows: role + email

**Operator**
- New operator logs in
- Profile created/updated with role='operator'
- Redirected to `/operator`
- Page shows: role + email

**No Role**
- User with null/missing role
- Redirected to `/onboarding/role`
- Page shows: role selection UI placeholder

---

## 3) Buyer Actions

### Missing Criteria → 400
- Buyer attempts to submit without `property_type`
- API returns `400 Bad Request`
- Error message: "property_type required"

- Buyer attempts to submit without `max_price`
- API returns `400 Bad Request`
- Error message: "max_price required"

### Commit Without Confirmation → 400
- Buyer attempts `BUYER_COMMITTED` status change
- No confirmation text provided
- API returns `400 Bad Request`
- Error message: "Explicit confirmation required"

- Buyer attempts commit without fee acceptance
- API returns `400 Bad Request`
- Error message: "5% success fee acceptance required"

---

## 4) Operator Actions

### NEEDS_CLARIFICATION Without Message → 400
- Operator sets status = `NEEDS_CLARIFICATION`
- No message to buyer provided
- API returns `400 Bad Request`
- Error message: "Message to buyer required when status is NEEDS_CLARIFICATION"

### Payout PAID Without Note → 400
- Operator marks payout as `PAID`
- No `internal_note` provided
- API returns `400 Bad Request`
- Error message: "Internal note required for payout status change to PAID"

### Payout PAID Audit Log
- Operator marks payout as `PAID` with note
- `audit_logs` entry auto-created:
  - `action` = 'PAYOUT_PROCESSED'
  - `actor_id` = operator user ID
  - `entity_type` = 'payout'
  - `entity_id` = payout ID
  - Contains internal note in metadata

---

## 5) Referrer View

### UUID Exposure
- Referrer views their submissions
- Real deal UUID **NOT** visible
- Masked ID or short shareable ID shown instead
- Example: `REF-ABC123` instead of `550e8400-e29b-41d4-a716-446655440000`

### Status Visibility
- Referrer views submission status
- `EXCLUSIVE_WINDOW_ACTIVE` **NOT** shown
- Simplified status shown:
  - `NEW_SUBMISSION` → "Pending Review"
  - `OPERATOR_REVIEWING` → "Under Review"
  - `NEEDS_CLARIFICATION` → "Action Needed"
  - `BUYER_COMMITTED` → "In Progress"
  - `WON_PENDING_CLOSE` → "In Progress"
  - `CLOSED_WON` → "Completed"
  - `CLOSED_LOST` → "Not Pursued"

---

## 6) Operator Portal Filters

### Default Filter
- Operator opens portal
- Default filter = action-required statuses only:
  - `NEW_SUBMISSION`
  - `NEEDS_CLARIFICATION`
  - `WON_PENDING_CLOSE`
- Other statuses hidden by default
- Filter can be changed to "All" if needed

### Action Required Count
- Badge shows count of action-required items
- Updates in real-time
- Example: "Action Required (3)"
