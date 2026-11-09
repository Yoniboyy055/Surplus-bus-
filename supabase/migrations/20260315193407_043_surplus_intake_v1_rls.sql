
-- RLS for surplus_intake_v1
-- Service role (parsers, agents, internal functions) can insert and read
-- Authenticated operators can read and update (review/promote)
-- No public access

ALTER TABLE public.surplus_intake_v1 ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Supabase service_role key bypasses RLS by default)
-- Explicit policies for authenticated users:

-- Operators can read all intake records
CREATE POLICY "operators_read_intake"
ON public.surplus_intake_v1
FOR SELECT
TO authenticated
USING (true);

-- Operators can insert intake records manually
CREATE POLICY "operators_insert_intake"
ON public.surplus_intake_v1
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Operators can update intake records (e.g. set promoted = true, gate scores)
CREATE POLICY "operators_update_intake"
ON public.surplus_intake_v1
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

