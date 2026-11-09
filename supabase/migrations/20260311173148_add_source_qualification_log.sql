
-- Step 3: Source qualification log â tracks every admission gate check
CREATE TABLE IF NOT EXISTS public.source_qualification_log (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             uuid        NOT NULL REFERENCES public.sources(id),
  checked_at            timestamptz NOT NULL DEFAULT now(),
  checked_by            text        NOT NULL DEFAULT 'system',

  -- Gate checks
  real_listings_found   boolean     NOT NULL DEFAULT false,
  stable_external_id    boolean     NOT NULL DEFAULT false,
  core_fields_present   boolean     NOT NULL DEFAULT false,
  dedup_verified        boolean     NOT NULL DEFAULT false,
  terminal_state_plan   boolean     NOT NULL DEFAULT false,
  consecutive_runs_ok   integer     NOT NULL DEFAULT 0,

  -- Outcome
  gate_passed           boolean     NOT NULL DEFAULT false,
  notes                 text        NULL,
  real_host_discovered  text        NULL
);

COMMENT ON TABLE public.source_qualification_log IS
  'Admission gate log per source. All 5 checks must pass before production_ready = true.';

