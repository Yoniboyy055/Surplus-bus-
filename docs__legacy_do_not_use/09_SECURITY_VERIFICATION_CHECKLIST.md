# Security Verification Checklist

This checklist provides the necessary SQL commands to verify the successful implementation of the final two critical security fixes (`008_security_hardening.sql`).

**Note:** These commands should be executed in your Supabase SQL Editor or a Postgres client connected to your database. For the `audit_logs` tests, you must be authenticated as a non-superuser role (e.g., `authenticated` user role) to properly test the Row Level Security (RLS) policies.

## CRITICAL FIX #1: Payout Double-Dip Prevention

| Check | SQL Command | Expected Result |
| :--- | :--- | :--- |
| **1. Verify Unique Constraint** | `\d payouts` | The output should show a `UNIQUE` constraint on the `deal_id` column (e.g., `payouts_deal_id_unique`). |
| **2. Test Duplicate Insertion** | **Prerequisite:** Find an existing `deal_id` (e.g., `12345678-1234-1234-1234-123456789012`) and a `referrer_profile_id` to use in the test. <br><br> `INSERT INTO public.payouts (deal_id, referrer_profile_id, amount, status) VALUES ('12345678-1234-1234-1234-123456789012', '98765432-4321-4321-4321-210987654321', 100.00, 'pending');` <br><br> Run the command a second time. | **First run:** `INSERT 0 1` (Success). <br>**Second run:** Should fail with a `duplicate key value violates unique constraint "payouts_deal_id_unique"`. |

## CRITICAL FIX #2: Audit Log Immutability

| Check | SQL Command | Expected Result |
| :--- | :--- | :--- |
| **3. Test UPDATE Block** | **Prerequisite:** Find an existing `audit_logs.id` (e.g., `a1b2c3d4-a1b2-a1b2-a1b2-a1b2c3d4e5f6`). <br><br> `UPDATE public.audit_logs SET action = 'TAMPERED' WHERE id = 'a1b2c3d4-a1b2-a1b2-a1b2-a1b2c3d4e5f6';` | Should fail with a `permission denied for relation audit_logs` or `0 rows affected` (if RLS is applied correctly to deny all updates). |
| **4. Test DELETE Block** | **Prerequisite:** Find an existing `audit_logs.id` (e.g., `a1b2c3d4-a1b2-a1b2-a1b2-a1b2c3d4e5f6`). <br><br> `DELETE FROM public.audit_logs WHERE id = 'a1b2c3d4-a1b2-a1b2-a1b2-a1b2c3d4e5f6';` | Should fail with a `permission denied for relation audit_logs` or `0 rows affected` (if RLS is applied correctly to deny all deletes). |
| **5. Test INSERT Still Works** | **Prerequisite:** Find an existing `deal_id` and `actor_profile_id`. <br><br> `INSERT INTO public.audit_logs (deal_id, actor_role, action) VALUES ('12345678-1234-1234-1234-123456789012', 'system', 'TEST_IMMUTABILITY_INSERT');` | Should succeed with `INSERT 0 1`. |
