-- Round 3 Fixes

-- Fix 5: Query Performance Degradation
-- Add a composite index on the most frequently queried fields for the Operator Dashboard.
create index if not exists idx_deals_status_created_at on public.deals (status, created_at desc);
