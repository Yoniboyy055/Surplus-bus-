-- -----------------------------------------------------------------------------
-- MIGRATION: 015_property_candidates_integration.sql
-- PURPOSE: Integrate property_candidates with properties table for approval flow
-- -----------------------------------------------------------------------------

-- 1. Expand property_type to include agent-scraped categories
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE public.properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN (
  'land', 'commercial', 'residential', 'industrial',
  'vehicles', 'equipment', 'furniture', 'electronics', 'other'
));

-- 2. Add candidate_id foreign key to link approved properties to their source
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.property_candidates(id);

-- 3. Add unique constraint to prevent duplicate property creation from same candidate
ALTER TABLE public.properties
ADD CONSTRAINT properties_candidate_id_unique UNIQUE (candidate_id);

-- 4. Add index for candidate lookups
CREATE INDEX IF NOT EXISTS idx_properties_candidate_id ON public.properties(candidate_id);

-- 5. RLS policy for properties - operators have full access
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_all_properties ON public.properties;
CREATE POLICY operator_all_properties ON public.properties
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
);

-- 6. Buyers can view approved properties (for matching)
DROP POLICY IF EXISTS buyer_view_properties ON public.properties;
CREATE POLICY buyer_view_properties ON public.properties
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'buyer')
);
