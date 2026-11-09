
-- ============================================================
-- Migration 042: surplus_intake_v1 â Staging Intake Table
-- Contract: surplus_intake_v1
-- Purpose: Receive raw structured intake from manual collectors,
--          semi-manual agents, and future API mappers before
--          normalization and promotion into source_records.
-- ============================================================

CREATE TABLE IF NOT EXISTS surplus_intake_v1 (

  -- ââ Identity âââââââââââââââââââââââââââââââââââââââââââââ
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_run_id         uuid,                          -- optional session grouping

  -- ââ A. Source Identity âââââââââââââââââââââââââââââââââââ
  source_name           text,                          -- e.g. city_toronto_surplus
  source_type           text,                          -- municipal | crown | utility | federal
  source_url            text,                          -- root domain of source
  listing_url           text NOT NULL,                 -- direct URL to this listing
  external_id           text,                          -- source-assigned unique ID
  agency_name           text,                          -- full name of issuing agency

  -- ââ B. Listing Core ââââââââââââââââââââââââââââââââââââââ
  title                 text NOT NULL,
  description           text,
  category              text,
  subcategory           text,
  condition_text        text,
  quantity              integer,
  status                text                           -- active | upcoming | closed | awarded
    CHECK (status IS NULL OR status IN ('active','upcoming','closed','awarded','unknown')),

  -- ââ C. Price / Value âââââââââââââââââââââââââââââââââââââ
  current_price         numeric(14,2),
  starting_price        numeric(14,2),
  reserve_price         numeric(14,2),
  estimated_value       numeric(14,2),
  currency              text DEFAULT 'CAD',
  bid_count             integer,

  -- ââ D. Time Fields âââââââââââââââââââââââââââââââââââââââ
  posted_at             timestamptz,
  closes_at             timestamptz,
  collected_at          timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz,

  -- ââ E. Geography âââââââââââââââââââââââââââââââââââââââââ
  country               text DEFAULT 'Canada',
  province_state        text,
  city                  text,
  region_text           text,
  postal_code           text,
  address_text          text,

  -- ââ F. Asset / Opportunity Features âââââââââââââââââââââ
  asset_type            text,
  brand                 text,
  model                 text,
  year                  integer,
  mileage_hours         text,
  size_spec             text,
  serial_or_vin         text,
  documents_available   boolean,
  inspection_available  boolean,
  pickup_terms          text,

  -- ââ G. Media / Evidence ââââââââââââââââââââââââââââââââââ
  image_urls            text[],
  document_urls         text[],
  thumbnail_url         text,

  -- ââ H. Operational Metadata ââââââââââââââââââââââââââââââ
  collector_name        text,
  collection_method     text DEFAULT 'manual'
    CHECK (collection_method IN ('manual','semi-manual','api','agent')),
  confidence_score      numeric(4,3)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  raw_payload_excerpt   text,
  notes                 text,

  -- ââ System / Quality Gate Fields âââââââââââââââââââââââââ
  quality_gate_score    integer,                       -- count of gates passed (0â7)
  gate_failures         text[],                        -- which gates failed
  promoted              boolean DEFAULT false,
  promoted_at           timestamptz,
  promoted_to_id        uuid,                          -- FK to source_records.id after promotion
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ââ Indexes ââââââââââââââââââââââââââââââââââââââââââââââââââ
CREATE INDEX IF NOT EXISTS idx_intake_v1_source_name    ON surplus_intake_v1 (source_name);
CREATE INDEX IF NOT EXISTS idx_intake_v1_status         ON surplus_intake_v1 (status);
CREATE INDEX IF NOT EXISTS idx_intake_v1_closes_at      ON surplus_intake_v1 (closes_at);
CREATE INDEX IF NOT EXISTS idx_intake_v1_promoted       ON surplus_intake_v1 (promoted);
CREATE INDEX IF NOT EXISTS idx_intake_v1_intake_run_id  ON surplus_intake_v1 (intake_run_id);
CREATE INDEX IF NOT EXISTS idx_intake_v1_external_id    ON surplus_intake_v1 (external_id);

-- ââ Comment ââââââââââââââââââââââââââââââââââââââââââââââââââ
COMMENT ON TABLE surplus_intake_v1 IS
  'Staging intake table for Surplus Bus. Receives raw structured records from collectors and agents under the surplus_intake_v1 contract. Records are quality-gated here before promotion into source_records.';

