DROP INDEX IF EXISTS public.uq_source_records_lookup;
ALTER TABLE public.source_records DROP COLUMN IF EXISTS lookup_key;
