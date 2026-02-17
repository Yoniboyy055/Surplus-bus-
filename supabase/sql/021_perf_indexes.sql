-- -----------------------------------------------------------------------------
-- MIGRATION: 021_perf_indexes.sql
-- PURPOSE: Add indexes for feed joins and stable pagination
-- -----------------------------------------------------------------------------

-- Stable pagination: opportunities list ordered by created_at desc, id desc
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at_id ON public.opportunities(created_at DESC, id DESC);
