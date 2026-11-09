
-- ============================================================
-- MIGRATION: Source Recovery Operating Sequence Tracker
-- Phases A through E â full pipeline tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.source_recon_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid        NOT NULL REFERENCES public.sources(id),
  phase               text        NOT NULL
    CHECK (phase IN ('A_recon', 'B_consolidate', 'C_select', 'D_qualify', 'E_promote')),
  run_at              timestamptz NOT NULL DEFAULT now(),
  sandbox_mode        boolean     NOT NULL DEFAULT true,
  discovered_host_url text        NULL,
  vendor_family       text        NULL,
  notes               text        NULL,
  outcome             text        NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'pass', 'fail', 'skip'))
);

COMMENT ON TABLE public.source_recon_log IS
  'Tracks each source through the AâE operating sequence. One row per phase attempt per source.';

-- ============================================================
-- Vendor family consolidation table
-- Maps discovered real hosts to a shared parser family
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vendor_families (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name     text  NOT NULL UNIQUE,
  platform_url    text  NOT NULL,
  login_required  boolean NOT NULL DEFAULT false,
  lot_id_pattern  text  NULL,
  structure_notes text  NULL,
  priority        integer NOT NULL DEFAULT 100,
  phase_c_selected boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_families IS
  'Phase B consolidation. Each discovered real host grouped by vendor platform family.';

-- Link sources to vendor families after Phase B
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS vendor_family_id uuid NULL REFERENCES public.vendor_families(id),
  ADD COLUMN IF NOT EXISTS phase_current text NOT NULL DEFAULT 'A_recon'
    CHECK (phase_current IN ('A_recon', 'B_consolidate', 'C_select', 'D_qualify', 'E_promote', 'live'));

COMMENT ON COLUMN public.sources.phase_current IS 'Current operating sequence phase for this source.';
COMMENT ON COLUMN public.sources.vendor_family_id IS 'Set during Phase B after vendor host is identified.';

-- ============================================================
-- Phase C selection rule: only ONE source can be phase_c_selected at a time
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_single_phase_c_selection()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phase_c_selected = true THEN
    UPDATE public.vendor_families
    SET phase_c_selected = false
    WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_phase_c ON public.vendor_families;
CREATE TRIGGER trg_single_phase_c
  BEFORE INSERT OR UPDATE ON public.vendor_families
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_phase_c_selection();

-- ============================================================
-- Operating sequence progress view
-- ============================================================

CREATE OR REPLACE VIEW public.v_source_recovery_status AS
SELECT
  s.parser_key,
  s.name                          AS source_name,
  s.quality_state,
  s.source_role,
  s.phase_current,
  s.production_ready,
  s.real_host_url,
  vf.family_name                  AS vendor_family,
  vf.phase_c_selected             AS is_phase_c_target,
  s.disabled_reason,
  (
    SELECT COUNT(*)
    FROM public.source_qualification_log q
    WHERE q.source_id = s.id AND q.gate_passed = true
  )                               AS qualification_passes,
  (
    SELECT MAX(r.run_at)
    FROM public.source_recon_log r
    WHERE r.source_id = s.id
  )                               AS last_recon_at
FROM public.sources s
LEFT JOIN public.vendor_families vf ON vf.id = s.vendor_family_id
ORDER BY
  CASE s.phase_current
    WHEN 'E_promote'    THEN 1
    WHEN 'D_qualify'    THEN 2
    WHEN 'C_select'     THEN 3
    WHEN 'B_consolidate' THEN 4
    WHEN 'A_recon'      THEN 5
    WHEN 'live'         THEN 0
    ELSE 6
  END,
  s.parser_key;

