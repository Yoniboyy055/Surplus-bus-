ALTER TABLE public.source_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
