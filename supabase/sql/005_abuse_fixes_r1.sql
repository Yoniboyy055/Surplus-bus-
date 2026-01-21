-- Round 1 Fixes

-- Fix 1: Self-Referral Gaming (Prevent referrer from being the buyer on their own deal)
-- Add RLS policy to the 'deals' table
-- This policy should be applied to the 'insert' operation for 'authenticated' users.
-- Assuming RLS is managed externally, here is the SQL for the policy condition:
-- (referrer_profile_id <> buyer_profile_id)

-- Fix 2: Buyer Stalling/Window Manipulation (Policy/UI only - requires property ID)
-- No SQL fix possible without a unique property ID or complex trigger logic.
-- Minimal fix is a server-side guard (Next.js API route) or a policy.
-- Stating as Policy/UI for now.

-- Fix 3: Commission Leakage on CLOSED_PAID (Ensure fee split is 100%)
alter table public.deals
add constraint check_fee_split_sum
check (referrer_fee_split_percent + operator_fee_split_percent = 100);

-- Fix 4: Operator Bypass (Prevent non-operators from setting critical statuses)
-- This requires RLS policies on the 'deals' table for 'update' operations.
-- Assuming RLS is managed externally, here is the SQL for the policy condition:
-- (auth.role() = 'operator') OR (old.status = new.status)
-- The RLS policy should be:
-- CREATE POLICY "Operators can set critical statuses" ON public.deals
-- FOR UPDATE TO authenticated
-- USING (auth.role() = 'operator' OR (old.status NOT IN ('WON_PENDING_CLOSE', 'CLOSED_PAID') AND new.status NOT IN ('WON_PENDING_CLOSE', 'CLOSED_PAID')));
-- Since I cannot directly modify RLS policies, I will state the required RLS change.

-- Fix 5: Identity Misuse (Prevent role spoofing on profile creation)
-- This requires RLS policy on the 'profiles' table for 'insert' operation.
-- Assuming RLS is managed externally, here is the SQL for the policy condition:
-- (new.role = 'buyer')
-- This forces all new users to be 'buyer' by default, as per the blueprint.
-- CREATE POLICY "New users are buyers by default" ON public.profiles
-- FOR INSERT TO authenticated
-- WITH CHECK (new.role = 'buyer');

-- Since I cannot directly modify RLS policies, I will state the required RLS change.
-- The only direct SQL fix I can apply is the CHECK constraint.
