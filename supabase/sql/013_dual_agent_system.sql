-- -----------------------------------------------------------------------------
-- MIGRATION: 013_dual_agent_system.sql
-- PURPOSE: Implement tables for Listing Agents and Buyer Agents (Phase 1 & 2)
-- -----------------------------------------------------------------------------

-- Table 1: property_candidates
-- Used by Listing Agents to queue scraped properties for operator review
CREATE TABLE IF NOT EXISTS public.property_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Source
  source_platform TEXT NOT NULL CHECK (source_platform IN (
    'gc_surplus', 'alberta_auction', 'bc_auction', 'sasksurplus', 'manual'
  )),
  source_url TEXT NOT NULL,
  source_id TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Property Data (JSONB)
  -- Expected keys: title, description, category, location, photos[], price, closing_date
  property_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scoring
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_breakdown JSONB,
  bucket TEXT NOT NULL DEFAULT 'approve' CHECK (bucket IN ('approve', 'junk')),
  
  -- Operator Review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  operator_decision TEXT CHECK (operator_decision IN ('approved', 'rejected')),
  operator_notes TEXT,
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'approved', 'rejected', 'expired'
  )),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  
  -- Deduplication
  CONSTRAINT unique_source_candidate UNIQUE (source_platform, source_id)
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.property_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_bucket ON public.property_candidates(bucket);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON public.property_candidates(quality_score);
CREATE INDEX IF NOT EXISTS idx_candidates_expires ON public.property_candidates(expires_at);


-- Table 2: buyer_leads
-- Used by Buyer Agents (or manual import) to queue leads for outreach
CREATE TABLE IF NOT EXISTS public.buyer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Lead Data
  full_name TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  location JSONB, -- {city, province, country}
  source_url TEXT, -- Where lead was found (company website, directory)
  
  -- Scoring
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  score_breakdown JSONB,
  bucket TEXT NOT NULL DEFAULT 'warm' CHECK (bucket IN ('hot', 'warm')),
  
  -- Operator Outreach
  contacted_by UUID REFERENCES public.profiles(id),
  contacted_at TIMESTAMPTZ,
  outreach_method TEXT CHECK (outreach_method IN ('email', 'linkedin', 'phone', 'other')),
  outreach_notes TEXT,
  response_received BOOLEAN DEFAULT false,
  
  -- Conversion
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'contacted', 'responded', 'converted', 'rejected', 'expired'
  )),
  converted_buyer_id UUID REFERENCES public.buyers(profile_id),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  
  -- Deduplication
  CONSTRAINT unique_lead_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.buyer_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_bucket ON public.buyer_leads(bucket);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.buyer_leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_expires ON public.buyer_leads(expires_at);


-- Table 3: agent_health_log
-- Monitoring table for agent performance
CREATE TABLE IF NOT EXISTS public.agent_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  agent_type TEXT NOT NULL CHECK (agent_type IN ('listing', 'buyer')),
  agent_name TEXT NOT NULL, -- 'scrape_alberta', 'scrape_gc_surplus', 'scrape_crunchbase'
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'timeout')),
  
  -- Metrics
  items_found INTEGER DEFAULT 0,
  items_queued INTEGER DEFAULT 0,
  items_rejected INTEGER DEFAULT 0, -- Failed validation
  execution_time_ms INTEGER,
  
  -- Error Details
  error_message TEXT,
  error_stack TEXT,
  
  -- Context
  source_url TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_health_type ON public.agent_health_log(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_health_name ON public.agent_health_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_health_created ON public.agent_health_log(created_at);


-- RLS Policies

-- property_candidates: Operators only
ALTER TABLE public.property_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_all_candidates ON public.property_candidates;
CREATE POLICY operator_all_candidates ON public.property_candidates
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);

-- buyer_leads: Operators only
ALTER TABLE public.buyer_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_all_leads ON public.buyer_leads;
CREATE POLICY operator_all_leads ON public.buyer_leads
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);

-- agent_health_log: Operators read-only and insert
ALTER TABLE public.agent_health_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_view_agent_health ON public.agent_health_log;
CREATE POLICY operator_view_agent_health ON public.agent_health_log
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);

DROP POLICY IF EXISTS agent_insert_health ON public.agent_health_log;
CREATE POLICY agent_insert_health ON public.agent_health_log
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);
