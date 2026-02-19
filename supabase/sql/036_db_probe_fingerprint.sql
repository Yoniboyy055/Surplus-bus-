-- -----------------------------------------------------------------------------
-- MIGRATION: 036_db_probe_fingerprint.sql
-- PURPOSE: RPC for db-probe project fingerprint
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_project_fingerprint()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  db text;
  addr text;
  usr text;
BEGIN
  db := current_database();
  addr := inet_server_addr()::text;
  usr := current_user;
  RETURN jsonb_build_object('current_database', db, 'inet_server_addr', addr, 'current_user', usr);
END;
$$;
