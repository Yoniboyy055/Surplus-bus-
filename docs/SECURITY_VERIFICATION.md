# Security Verification Checklist (Final Hardening)

This document provides a quick reference for verifying the core security and audit integrity of the Surplus Bus platform.

## Final Hardening Checklist (Max 10 Bullets)

1.  **Rate Limiting:** Deal submission is rate-limited to 1/hour/buyer.
2.  **Rate Limiting:** Referral link generation is rate-limited to 5/day/referrer.
3.  **API Validation:** All critical API payloads (criteria, status change) are validated (e.g., Zod).
4.  **Audit Guard:** Mandatory `internalNote` is enforced for all operator status changes.
5.  **Commit Atomicity:** Buyer "Commit to Bid" uses a database transaction with row-level locking.
6.  **SQL Trigger:** Critical audit log is created if a deal is stuck in `WON_PENDING_CLOSE` for > 7 days.
7.  **SQL Trigger:** Operator cannot self-approve `CLOSED_PAID` deals.
8.  **UX Constraint:** Buyer "Commit to Bid" requires a clear modal confirmation.
9.  **UX Constraint:** Referrer portal masks active deal statuses with generic terms.
10. **RLS Immutability:** `audit_logs` are immutable (no UPDATE/DELETE allowed for any role).

## Verification Commands

| Component | Test Objective | SQL Command | Expected Result |
| :--- | :--- | :--- | :--- |
| **Payouts** | Prevent Double-Dip | `INSERT INTO public.payouts (deal_id, referrer_profile_id, amount, status) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 100, 'paid');` (Run twice) | Second run fails with `unique constraint violation`. |
| **Audit Logs** | Block UPDATE | `UPDATE public.audit_logs SET action = 'TAMPERED' WHERE id = '...';` (As authenticated user) | Fails with `permission denied` or `0 rows affected`. |
| **Audit Logs** | Strict INSERT | `INSERT INTO public.audit_logs (deal_id, actor_role, action) VALUES ('...', 'system', 'TEST');` (As authenticated user, without `actor_profile_id = auth.uid()`) | Fails with RLS policy violation. |
| **Functions** | Check Search Path | `SELECT proname, proconfig FROM pg_proc WHERE proname = 'is_operator';` | `proconfig` should contain `{search_path=public}`. |
| **Fee Split** | Check Constraint | `INSERT INTO public.deals (..., referrer_fee_split_percent, operator_fee_split_percent) VALUES (..., 20, 70);` | Fails with `check constraint violation` (must sum to 100). |
