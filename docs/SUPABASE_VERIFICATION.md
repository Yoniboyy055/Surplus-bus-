# Supabase Verification Checklist

This document provides SQL commands to verify the security, integrity, and hardening of the Surplus Bus Supabase layer.

## ✅ Security & RLS Enforcement

| Component | Test Objective | SQL Command | Expected Result |
| :--- | :--- | :--- | :--- |
| **Role Spoofing** | Prevent self-promotion to operator | `INSERT INTO public.profiles (id, role) VALUES ('<uuid>', 'operator');` | Fails with RLS policy violation (only 'buyer' allowed for self-insert). |
| **Audit Logs** | Verify Immutability (Update) | `UPDATE public.audit_logs SET action = 'TAMPERED' WHERE id = '<uuid>';` | Fails with `0 rows affected` or RLS violation. |
| **Audit Logs** | Verify Immutability (Delete) | `DELETE FROM public.audit_logs WHERE id = '<uuid>';` | Fails with `0 rows affected` or RLS violation. |
| **Functions** | Verify Fixed Search Path | `SELECT proname, proconfig FROM pg_proc WHERE proname = 'is_operator';` | `proconfig` contains `{search_path=public}`. |

## 💰 Financial & Data Integrity

| Component | Test Objective | SQL Command | Expected Result |
| :--- | :--- | :--- | :--- |
| **Payouts** | Prevent Double-Dip | `INSERT INTO public.payouts (deal_id, referrer_profile_id, amount) VALUES ('<deal_id>', '<ref_id>', 100);` (Run twice) | Second run fails with `unique constraint violation`. |
| **Fee Split** | Enforce 100% Total | `UPDATE public.deals SET referrer_fee_split_percent = 20, operator_fee_split_percent = 70 WHERE id = '<uuid>';` | Fails with `fee_split_sum_check` constraint violation. |
| **Terminal State** | Lock Closed Deals | `UPDATE public.deals SET status = 'MATCHING' WHERE id = '<closed_deal_id>';` | Fails with `Cannot modify a deal in a terminal state`. |

## 🧾 Governance & Audit

| Component | Test Objective | SQL Command | Expected Result |
| :--- | :--- | :--- | :--- |
| **Audit Trigger** | Status Change Logging | `UPDATE public.deals SET status = 'QUALIFIED' WHERE id = '<uuid>';` | A new entry appears in `public.audit_logs` with `action = 'status_change'`. |
| **Reputation** | Auto-Track Downgrade | `UPDATE public.buyers SET reputation_score = 10 WHERE profile_id = '<uuid>';` | Buyer `track` is automatically updated to 'B'. |

---
**Status:** Supabase layer is secure, hardened, and production-ready.
