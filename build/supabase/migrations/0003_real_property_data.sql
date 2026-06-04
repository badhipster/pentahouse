-- ============================================================================
-- Migration 0003: Replace demo property data with RERA-verified real projects
-- ============================================================================
-- Strategy: UPDATE the 5 hero project rows in place (preserves FK relationships
-- in campaigns / leads / visits / bookings). The 10 lighter projects get a
-- lighter touch refresh. UUIDs are unchanged so all downstream data still works.
--
-- Provenance: see build/seed/DATA_PROVENANCE.md for the source for each
-- RERA number and possession date. Verified May 27 2026.
--
-- HOW TO APPLY:
--   Supabase SQL Editor -> New query -> paste this entire file -> Run.
-- ============================================================================

-- =========================================================================
-- 5 HERO PROJECTS (RERA-verified, real, audience-fact-checkable)
-- =========================================================================

-- 1. DLF Privana West (Sector 76, Gurugram)
--    Source: DLF + HARERA portal
UPDATE properties SET
  project_name      = 'DLF Privana West',
  developer         = 'DLF Limited',
  city              = 'Delhi NCR',
  locality          = 'Sector 76, Gurugram (SPR)',
  config            = '4BHK',
  price_min_lakhs   = 575,
  price_max_lakhs   = 950,
  carpet_area_sqft  = '2800-4200',
  rera_number       = 'RC/REP/HARERA/GGM/819/551/2024/46',
  possession_date   = 'Dec 2028',
  status            = 'Active',
  amenities         = ARRAY['Clubhouse 80000 sqft','Pool','Tennis','EV charging','Concierge','24x7 security','School onsite'],
  highlights        = ARRAY['Part of 116-acre DLF Privana township','SPR connectivity to NH-48','HARERA-cleared title','DMRC Yellow Line extension planned'],
  image_url         = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  updated_at        = now()
WHERE id = '11111111-1111-1111-1111-111111111101';

-- 2. Lodha Supremus Lower Parel (Mumbai)
--    Source: MahaRERA + Lodha
UPDATE properties SET
  project_name      = 'Lodha Supremus Lower Parel',
  developer         = 'Macrotech Developers (Lodha)',
  city              = 'Mumbai',
  locality          = 'Lower Parel',
  config            = '3BHK, 4BHK',
  price_min_lakhs   = 425,
  price_max_lakhs   = 850,
  carpet_area_sqft  = '1180-2050',
  rera_number       = 'A51800000454',
  possession_date   = 'Dec 2026',
  status            = 'Active',
  amenities         = ARRAY['Sea-view deck','Sky lounge','Concierge','Spa','Indoor sports','EV charging','24x7 security'],
  highlights        = ARRAY['Walk to Phoenix Palladium','MahaRERA verified','OC expected before handover','BMC water 24x7'],
  image_url         = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  updated_at        = now()
WHERE id = '11111111-1111-1111-1111-111111111102';

-- 3. Kolte-Patil Life Republic (Hinjewadi, Pune)
--    Source: MahaRERA + Kolte-Patil
--    Note: changed locality from Kharadi to Hinjewadi (Life Republic is in Hinjewadi).
--    Lead 8 (Karthik Iyer, EON IT Park) still scores well because his timeline + walk-to-work fit.
UPDATE properties SET
  project_name      = 'Kolte-Patil Life Republic',
  developer         = 'Kolte-Patil Developers',
  city              = 'Pune',
  locality          = 'Hinjewadi Phase 2',
  config            = '2BHK, 3BHK',
  price_min_lakhs   = 65,
  price_max_lakhs   = 145,
  carpet_area_sqft  = '650-1320',
  rera_number       = 'P52100047317',
  possession_date   = 'Dec 2027',
  status            = 'Active',
  amenities         = ARRAY['400+ acre integrated township','Clubhouse','Pool','Co-working','School onsite','Retail street','Fire station onsite'],
  highlights        = ARRAY['Hinjewadi IT Park within 2 km','Top schools onsite','MahaRERA verified across 10 phases','Rainwater harvesting + solar common areas'],
  image_url         = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
  updated_at        = now()
WHERE id = '11111111-1111-1111-1111-111111111103';

-- 4. Prestige Park Grove (Whitefield, Bangalore)
--    Source: K-RERA + Prestige Group
UPDATE properties SET
  project_name      = 'Prestige Park Grove',
  developer         = 'Prestige Group',
  city              = 'Bangalore',
  locality          = 'Whitefield, Seegehalli (Hope Farm Junction)',
  config            = '1BHK, 2BHK, 3BHK, 4BHK',
  price_min_lakhs   = 95,
  price_max_lakhs   = 285,
  carpet_area_sqft  = '620-1980',
  rera_number       = 'PRM/KA/RERA/1251/446/PR/100823/006141',
  possession_date   = 'Dec 2027',
  status            = 'Active',
  amenities         = ARRAY['72-acre township','Clubhouse','Pool','Tennis','Amphitheatre','EV charging','Smart home','88 luxury villas'],
  highlights        = ARRAY['3627 high-rise + 88 villas','Hope Farm Junction connectivity','Top schools within 3 km','K-RERA verified','Launched 18 Aug 2023'],
  image_url         = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  updated_at        = now()
WHERE id = '11111111-1111-1111-1111-111111111104';

-- 5. Godrej Tropical Isle (Sector 146, Noida)
--    Source: UP-RERA + Godrej Properties
UPDATE properties SET
  project_name      = 'Godrej Tropical Isle',
  developer         = 'Godrej Properties',
  city              = 'Delhi NCR',
  locality          = 'Sector 146, Noida (Noida-Greater Noida Expressway)',
  config            = '3BHK, 4BHK',
  price_min_lakhs   = 198,
  price_max_lakhs   = 480,
  carpet_area_sqft  = '1450-2680',
  rera_number       = 'UPRERAPRJ303390',
  possession_date   = 'Feb 2030',
  status            = 'Active',
  amenities         = ARRAY['6 towers, 721 units','Resort-style pool','Spa','Clubhouse','Cycling track','EV charging'],
  highlights        = ARRAY['6.18-acre site, low density','Noida-Greater Noida Expressway access','UP-RERA verified','Launch pricing','Strategic Sector 146 location'],
  image_url         = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
  updated_at        = now()
WHERE id = '11111111-1111-1111-1111-111111111105';


-- =========================================================================
-- 10 LIGHTER PROJECTS (light refresh; Kaggle import optional, see PROVENANCE)
-- These rows already use real developer names. We refresh prices to mid-2026
-- bands from public listings (99acres / MagicBricks averages) and keep them
-- as realistic-but-non-feature inventory for breadth.
-- =========================================================================

UPDATE properties SET
  price_min_lakhs = 245, price_max_lakhs = 580,
  highlights = ARRAY['M3M Smart City zone','HARERA cleared','Concierge included'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111106';

UPDATE properties SET
  locality = 'Mahalunge, Pune',
  price_min_lakhs = 68, price_max_lakhs = 125,
  highlights = ARRAY['Mahalunge IT corridor','MahaRERA cleared','Pool + clubhouse'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111107';

UPDATE properties SET
  locality = 'Powai (Hiranandani Gardens)',
  price_min_lakhs = 295, price_max_lakhs = 510,
  highlights = ARRAY['Lake view inventory','School + hospital onsite','MahaRERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111108';

UPDATE properties SET
  locality = 'Hebbal (Bellary Road)',
  price_min_lakhs = 105, price_max_lakhs = 215,
  highlights = ARRAY['Manyata Tech Park nearby','Hebbal flyover access','K-RERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111109';

UPDATE properties SET
  locality = 'Sarjapur Road (Bellandur side)',
  price_min_lakhs = 88, price_max_lakhs = 175,
  highlights = ARRAY['ORR connectivity','Co-working onsite','K-RERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111110';

UPDATE properties SET
  price_min_lakhs = 42, price_max_lakhs = 78,
  highlights = ARRAY['Affordable 1-2 BHK band','MahaRERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE properties SET
  locality = 'Andheri West (Lokhandwala)',
  price_min_lakhs = 285, price_max_lakhs = 540,
  highlights = ARRAY['Lokhandwala market access','Sky lounge','MahaRERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111112';

UPDATE properties SET
  locality = 'Sector 81, Faridabad',
  price_min_lakhs = 62, price_max_lakhs = 128,
  highlights = ARRAY['Faridabad-Greater Noida link road','HARERA cleared'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111113';

UPDATE properties SET
  price_min_lakhs = 48, price_max_lakhs = 88,
  highlights = ARRAY['Electronic City SEZ proximity','K-RERA cleared','Affordable 1-2 BHK'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111114';

UPDATE properties SET
  locality = 'Hinjewadi Phase 1',
  price_min_lakhs = 72, price_max_lakhs = 138,
  highlights = ARRAY['IT-corridor walk-to-work','MahaRERA cleared','Pool + clubhouse'],
  updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111115';

-- =========================================================================
-- Verify
-- =========================================================================
-- After running, this should return 5 rows with real RERA numbers visible:
-- SELECT project_name, developer, locality, rera_number, possession_date, price_min_lakhs, price_max_lakhs
-- FROM properties
-- WHERE id IN (
--   '11111111-1111-1111-1111-111111111101',
--   '11111111-1111-1111-1111-111111111102',
--   '11111111-1111-1111-1111-111111111103',
--   '11111111-1111-1111-1111-111111111104',
--   '11111111-1111-1111-1111-111111111105'
-- );
