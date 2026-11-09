
-- Step 5: Hard production gate â block canonical writes from non-production-ready sources

CREATE OR REPLACE FUNCTION public.guard_production_source_writes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_production_ready boolean;
  v_quality_state    text;
  v_parser_key       text;
BEGIN
  SELECT production_ready, quality_state, parser_key
    INTO v_production_ready, v_quality_state, v_parser_key
  FROM public.sources
  WHERE id = NEW.source_id;

  IF v_production_ready = false THEN
    RAISE WARNING
      '[SURPLUS BUS] Source "%" (state: %) is not production_ready. Write to source_records allowed but canonical promotion is blocked. Set production_ready=true after qualification gate passes.',
      v_parser_key, v_quality_state;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_production_source ON public.source_records;
CREATE TRIGGER trg_guard_production_source
  BEFORE INSERT ON public.source_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_production_source_writes();

-- Separate hard block on canonical_lots â reject inserts from non-ready sources
CREATE OR REPLACE FUNCTION public.block_canonical_from_unqualified_source()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_production_ready boolean;
  v_parser_key       text;
BEGIN
  IF NEW.source_id IS NULL THEN
    RETURN NEW; -- manual insert allowed
  END IF;

  SELECT production_ready, parser_key
    INTO v_production_ready, v_parser_key
  FROM public.sources
  WHERE id = NEW.source_id;

  IF v_production_ready = false THEN
    RAISE EXCEPTION
      '[SURPLUS BUS] BLOCKED: Source "%" is not production_ready. Cannot write to canonical_lots until qualification gate passes.',
      v_parser_key;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_unqualified_canonical ON public.canonical_lots;
CREATE TRIGGER trg_block_unqualified_canonical
  BEFORE INSERT ON public.canonical_lots
  FOR EACH ROW EXECUTE FUNCTION public.block_canonical_from_unqualified_source();

