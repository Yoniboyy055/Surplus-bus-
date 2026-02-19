-- -----------------------------------------------------------------------------
-- MIGRATION: 035_opportunity_intelligence.sql
-- PURPOSE: Derived intelligence table for scoring
-- -----------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_intelligence (
  opportunity_id UUID PRIMARY KEY REFERENCES public.opportunities(id) ON DELETE CASCADE,

  score NUMERIC,
  score_version INT DEFAULT 1,

  estimated_value_bucket TEXT,
  urgency_level TEXT,
  days_to_close INT,

  last_computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_intelligence_score
  ON public.opportunity_intelligence(score DESC NULLS LAST);

COMMIT;
