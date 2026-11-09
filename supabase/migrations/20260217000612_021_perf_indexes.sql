CREATE INDEX IF NOT EXISTS idx_opportunities_created_at_id ON public.opportunities(created_at DESC, id DESC);
