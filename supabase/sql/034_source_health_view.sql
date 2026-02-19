-- -----------------------------------------------------------------------------
-- MIGRATION: 034_source_health_view.sql
-- PURPOSE: Operational health view for sources
-- -----------------------------------------------------------------------------

BEGIN;

CREATE OR REPLACE VIEW public.source_health AS
SELECT
  s.id,
  s.parser_key,
  s.is_active,
  (SELECT MAX(r.started_at) FROM public.source_runs r WHERE r.source_id = s.id) AS last_run,
  (
    SELECT r.status
    FROM public.source_runs r
    WHERE r.source_id = s.id
    ORDER BY r.started_at DESC
    LIMIT 1
  ) AS last_status
FROM public.sources s;

COMMIT;
