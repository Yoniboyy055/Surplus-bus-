-- -----------------------------------------------------------------------------
-- MIGRATION: 024_last_run_per_parser.sql
-- PURPOSE: SQL function for efficient "last run per parser_key" query.
--          Called via supabase.rpc('last_run_per_parser') from /api/status.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.last_run_per_parser()
RETURNS TABLE (
  parser_key text,
  last_started_at timestamptz,
  last_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.parser_key,
    max(r.started_at) AS last_started_at,
    (array_agg(r.status ORDER BY r.started_at DESC))[1] AS last_status
  FROM public.source_runs r
  JOIN public.sources s ON s.id = r.source_id
  GROUP BY s.parser_key
  ORDER BY last_started_at DESC;
$$;
