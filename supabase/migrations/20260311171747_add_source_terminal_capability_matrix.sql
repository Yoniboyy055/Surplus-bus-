
CREATE TABLE IF NOT EXISTS public.source_terminal_capabilities (
  source_id                uuid        NOT NULL REFERENCES public.sources(id),
  publishes_sold_result    boolean     NOT NULL DEFAULT false,
  publishes_unsold_result  boolean     NOT NULL DEFAULT false,
  publishes_final_bid_count boolean    NOT NULL DEFAULT false,
  requires_revisit         boolean     NOT NULL DEFAULT true,
  terminal_capture_tier    text        NOT NULL DEFAULT 'unknown'
    CHECK (terminal_capture_tier IN ('green', 'yellow', 'red', 'unknown')),
  notes                    text        NULL,
  verified_at              timestamptz NULL,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id)
);

COMMENT ON TABLE public.source_terminal_capabilities IS
  'Per-source matrix of terminal-state intelligence capability. Green = reliable sold comps. Yellow = partial. Red = listing-only.';

