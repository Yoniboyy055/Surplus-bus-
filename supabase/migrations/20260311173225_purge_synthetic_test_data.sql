
-- Step 6: Purge known synthetic/placeholder data from opportunities table
-- These are confirmed test rows: duplicated seeded titles, nav chrome, placeholders

DELETE FROM public.opportunities
WHERE
  -- Placeholder federal tenders
  title IN ('Sample Federal Tender', 'CanadaBuys â Federal Tenders & Procurement')

  -- Navigation/chrome garbage from city parsers
  OR title IN (
    'Topics in this section',
    'You may also be interested in',
    'Popular programs and services',
    'Tell us how we''re doing',
    'Search',
    'Main navigation',
    'Footer',
    'Contact Us',
    'Terms and Conditions',
    'In this section',
    'Procurement',
    'Extreme Weather Alert',
    'Surplus Sales',
    'Online Auctions',
    'Online Auction',
    'Surplus Sales'
  )

  -- Whitespace / empty HTML entities
  OR title ~ '^[\s&nbsp;]*$'
  OR title = '&nbsp;'
  OR title = 'Vehicle&nbsp;and Heavy Equipment Auctions';

-- Also purge exact duplicate rows (same source + title + estimated_value â keep earliest created_at)
DELETE FROM public.opportunities o1
USING public.opportunities o2
WHERE o1.source = o2.source
  AND o1.title = o2.title
  AND (o1.estimated_value = o2.estimated_value OR (o1.estimated_value IS NULL AND o2.estimated_value IS NULL))
  AND o1.created_at > o2.created_at;

