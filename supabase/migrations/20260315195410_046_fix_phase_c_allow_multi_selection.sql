
-- Drop the singleton enforcement trigger on vendor_families
-- Phase C selection is a multi-source decision, not a radio button
-- Governance over which sources are selected lives in the operating sequence, not this trigger

DROP TRIGGER IF EXISTS trg_single_phase_c ON public.vendor_families;
DROP FUNCTION IF EXISTS public.enforce_single_phase_c_selection();

-- Now correctly set phase_c_selected for all 6 selected families
UPDATE vendor_families
SET phase_c_selected = true
WHERE family_name IN (
  'GCSurplus (PSPC)',
  'CanadaBuys (PSPC)',
  'Alberta Government Surplus',
  'North Toronto Auction',
  'Michener Allen',
  'Calgary Direct (City)'
);

-- GovDeals stays false â Lane C, commercial marketplace, link-out only
UPDATE vendor_families
SET phase_c_selected = false
WHERE family_name = 'GovDeals';

-- Advance all sources linked to selected families to C_select
UPDATE sources
SET phase_current = 'C_select',
    updated_at = now()
WHERE vendor_family_id IN (
  SELECT id FROM vendor_families WHERE phase_c_selected = true
)
AND phase_current = 'B_consolidate';

-- Ensure GovDeals sources stay at B_consolidate with discovery role
UPDATE sources
SET phase_current = 'B_consolidate',
    source_role = 'discovery',
    updated_at = now()
WHERE vendor_family_id IN (
  SELECT id FROM vendor_families WHERE family_name = 'GovDeals'
);

