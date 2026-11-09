
-- Final purge: remaining chrome and generic seed rows with no real listing data
DELETE FROM public.opportunities
WHERE title IN (
  'City of Calgary Surplus Equipment',
  'Tell us how we&#39;re doing',
  'City of Edmonton Surplus Equipment',
  'City of Ottawa Surplus Equipment',
  'City of Toronto â Surplus Vehicles & Equipment',
  'GCSurplus â Federal Surplus Assets'
);

