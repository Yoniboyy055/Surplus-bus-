
INSERT INTO public.source_terminal_capabilities
  (source_id, publishes_sold_result, publishes_unsold_result, publishes_final_bid_count, requires_revisit, terminal_capture_tier, notes)
VALUES
  -- GC Surplus: government surplus, typically posts closed lots with outcome
  ('fb39e60c-f88d-4f2a-99aa-03d976577129', true,  true,  false, true,  'yellow', 'GC Surplus posts closed status but bid count not always exposed'),
  -- GSA Auctions: US federal, structured auction data, best terminal data
  ('f861ec85-6583-4dcb-84e0-f10fe36e7ce5', true,  true,  true,  true,  'green',  'GSA publishes full results including bid count and final price'),
  -- Alberta Surplus
  ('7277ec54-8245-4659-b9da-1a4903601506', true,  false, false, true,  'yellow', 'Publishes sold status, final price unclear, needs verification'),
  -- City of Calgary Surplus
  ('cd250361-cbe2-4bfb-a6d8-69b2cdbdcc3a', false, false, false, false, 'red',    'Listing-only at time of seeding â needs manual verification'),
  -- City of Edmonton Surplus
  ('d04673f2-c0cc-47f2-b877-e8f30a655967', false, false, false, false, 'red',    'Listing-only at time of seeding â needs manual verification'),
  -- City of Hamilton Surplus
  ('d585cde0-61d8-45f3-843b-40e53471bdf1', false, false, false, false, 'red',    'Listing-only at time of seeding â needs manual verification'),
  -- City of Ottawa Surplus
  ('d4f3209c-5732-464b-aaba-f510d3916c61', false, false, false, false, 'red',    'Listing-only at time of seeding â needs manual verification'),
  -- City of Toronto Surplus
  ('4c39ae99-7181-439b-8c5a-dca7c55ab20d', false, false, false, false, 'red',    'Listing-only at time of seeding â needs manual verification'),
  -- CanadaBuys RFP â not auction, terminal concept is award notice
  ('3c5c4113-9211-4c0b-a1e0-84eb32327e84', false, false, false, false, 'yellow', 'RFP source â terminal = contract award, not auction close'),
  -- Infrastructure Ontario Surplus
  ('6df9756a-3352-4349-9289-e20ae2125ea1', false, false, false, true,  'red',    'Listing-only at time of seeding â needs manual verification'),
  -- Ontario Surplus
  ('91d01caa-fcef-445a-8471-82030dd52302', false, false, false, true,  'red',    'Listing-only at time of seeding â needs manual verification')
ON CONFLICT (source_id) DO NOTHING;

