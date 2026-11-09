
-- Trigger: once final_price is set on canonical_lots, prevent overwrite
-- Controlled correction path: set final_price = NULL first, then re-set

CREATE OR REPLACE FUNCTION public.guard_terminal_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.final_price IS NOT NULL AND NEW.final_price IS NOT NULL
     AND OLD.final_price <> NEW.final_price THEN
    RAISE EXCEPTION
      'final_price is immutable once set on lot %. Use correction path: null then re-set.',
      OLD.id;
  END IF;
  IF OLD.outcome IS NOT NULL AND NEW.outcome IS NOT NULL
     AND OLD.outcome <> NEW.outcome THEN
    RAISE EXCEPTION
      'outcome is immutable once set on lot %. Use correction path: null then re-set.',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_terminal_fields ON public.canonical_lots;
CREATE TRIGGER trg_guard_terminal_fields
  BEFORE UPDATE ON public.canonical_lots
  FOR EACH ROW EXECUTE FUNCTION public.guard_terminal_fields();

