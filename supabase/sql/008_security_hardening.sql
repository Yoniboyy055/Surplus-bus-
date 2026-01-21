-- -----------------------------------------------------------------------------
-- MIGRATION: 008_security_hardening.sql
-- PURPOSE: Apply final two critical security fixes: Payout Double-Dip Prevention
--          and Audit Log Immutability.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- CRITICAL FIX #1: Payout Double-Dip Prevention
-- Enforce that each deal_id can appear ONLY ONCE in the payouts table.
-- -----------------------------------------------------------------------------

-- 1. Detect and Delete Duplicates (Safely)
-- This CTE identifies all duplicate deal_id entries and assigns a row number
-- based on the creation time (newest gets rank 1). We delete all records
-- where the rank is greater than 1 (i.e., the older duplicates).
WITH duplicate_payouts AS (
    SELECT
        id,
        deal_id,
        ROW_NUMBER() OVER (PARTITION BY deal_id ORDER BY created_at DESC) as rn
    FROM
        public.payouts
)
DELETE FROM public.payouts
WHERE id IN (
    SELECT id FROM duplicate_payouts WHERE rn > 1
);

-- 2. Add UNIQUE Constraint
-- This prevents any future insertion of a duplicate deal_id, enforcing the
-- business rule that a deal can only have one payout record.
ALTER TABLE public.payouts
ADD CONSTRAINT payouts_deal_id_unique UNIQUE (deal_id);


-- -----------------------------------------------------------------------------
-- CRITICAL FIX #2: Audit Log Immutability
-- Enforce that audit_logs are WRITE-ONCE (INSERT only).
-- -----------------------------------------------------------------------------

-- 1. Revoke all existing RLS policies on audit_logs
-- This ensures a clean slate before applying the new, strict policies.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow read access" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow update" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow delete" ON public.audit_logs;

-- 2. Policy to allow INSERT (Write-Once)
-- This policy allows any authenticated user (operator, buyer, referrer) to
-- insert a new audit log record. This is required for the system to function.
CREATE POLICY "Allow authenticated insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policy to block UPDATE (Immutability)
-- This policy uses a FALSE condition to explicitly deny all UPDATE operations
-- for all roles, ensuring the log content cannot be altered.
CREATE POLICY "Deny all updates"
ON public.audit_logs
FOR UPDATE
TO authenticated, anon
USING (false);

-- 4. Policy to block DELETE (Immutability)
-- This policy uses a FALSE condition to explicitly deny all DELETE operations
-- for all roles, ensuring the log history cannot be removed.
CREATE POLICY "Deny all deletes"
ON public.audit_logs
FOR DELETE
TO authenticated, anon
USING (false);

-- 5. Policy to allow SELECT (Read access)
-- This policy allows all authenticated users to read the audit logs.
CREATE POLICY "Allow authenticated select"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);
