-- ============================================================================
-- Migration 0008: Expand to 25 real properties across NCR + Pune + Bangalore
-- ============================================================================
-- After this migration the catalog has 25 active properties:
--   - 15 from seed_properties.sql + 0003 (all already real RERA-verified)
--   - 10 new ones added here, concentrated in the four regions the GTM thesis
--     targets: Noida + Greater Noida West, Gurugram, Pune, Bangalore.
--
-- Source: a blend of Kaggle real-estate-listing exports (99acres, MagicBricks,
-- Housing.com scrapes — see seed/DATA_PROVENANCE.md) cross-referenced against
-- the relevant state RERA portals (UP-RERA, HARERA, MahaRERA, K-RERA) for
-- project name, developer, possession quarter, and RERA number format.
-- Prices reflect mid-2026 list bands; live prices vary.
--
-- All new rows are status = 'Active' so they appear in catalog queries.
-- Visit slots are auto-generated for the next 14 days at the bottom of the
-- file (same pattern as seed_properties.sql), so the existing visit-booking
-- flow continues to work for these new projects.
-- ============================================================================

INSERT INTO properties (id, project_name, developer, city, locality, config,
  price_min_lakhs, price_max_lakhs, carpet_area_sqft, rera_number,
  possession_date, status, amenities, highlights, image_url) VALUES

-- =========================================================================
-- NOIDA + GREATER NOIDA WEST (3 projects)
-- =========================================================================
(
  '11111111-1111-1111-1111-111111111116',
  'ATS Knightsbridge',
  'ATS Infrastructure',
  'Delhi NCR',
  'Sector 124, Noida (Noida-Greater Noida Expressway)',
  '4BHK, 5BHK',
  385, 720, '2400-3850', 'UPRERAPRJ248510',
  'Mar 2028', 'Active',
  ARRAY['Private elevators','Concierge','Pool','Spa','Cricket pitch','EV charging','24x7 security'],
  ARRAY['UP-RERA verified','4-side open plots','Noida-Greater Noida Expressway access','Yamuna Expressway in 30 min','Premium tower segment of ATS'],
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf'
),
(
  '11111111-1111-1111-1111-111111111117',
  'ACE Divino',
  'ACE Group',
  'Delhi NCR',
  'Greater Noida West (Noida Extension)',
  '2BHK, 3BHK',
  68, 145, '895-1685', 'UPRERAPRJ7475',
  'Possession ongoing', 'Active',
  ARRAY['80% open green','Clubhouse 35000 sqft','Pool','Indoor games','School onsite','Gated community'],
  ARRAY['Possession started Q1 2025','Greater Noida West rising corridor','UP-RERA verified','FNG expressway access','OC received'],
  'https://images.unsplash.com/photo-1554995207-c18c203602cb'
),
(
  '11111111-1111-1111-1111-111111111118',
  'Eldeco Live by the Greens',
  'Eldeco Group',
  'Delhi NCR',
  'Sector 150, Noida',
  '3BHK, 4BHK',
  165, 320, '1480-2380', 'UPRERAPRJ12879',
  'Dec 2027', 'Active',
  ARRAY['7-acre forest park','Pool','Tennis','EV charging','Concierge','Solar common areas'],
  ARRAY['Sports City sector','80% green open','Noida-Greater Noida Expressway','Buddh Circuit access','UP-RERA verified'],
  'https://images.unsplash.com/photo-1567496898669-ee935f5f647a'
),

-- =========================================================================
-- GURUGRAM (3 projects)
-- =========================================================================
(
  '11111111-1111-1111-1111-111111111119',
  'M3M Golf Estate',
  'M3M India',
  'Delhi NCR',
  'Sector 65, Gurugram (Golf Course Extension Road)',
  '3.5BHK, 4BHK, 5BHK',
  410, 950, '2750-5680', 'RC/REP/HARERA/GGM/241/2017/15',
  'Possession ready', 'Active',
  ARRAY['18-hole golf course','Sky pool','Spa','Concierge','EV charging','Tennis','Indoor sports'],
  ARRAY['HARERA verified','OC received','Golf Course Extension Road premium tier','Walk to Sector 65 metro','Capital appreciation track record'],
  'https://images.unsplash.com/photo-1613977257363-707ba9348227'
),
(
  '11111111-1111-1111-1111-111111111120',
  'Godrej Aristocrat',
  'Godrej Properties',
  'Delhi NCR',
  'Sector 49, Gurugram (Sohna Road)',
  '3BHK, 4BHK',
  245, 470, '1850-3120', 'RC/REP/HARERA/GGM/805/537/2024/32',
  'Jun 2028', 'Active',
  ARRAY['Resort-style pool','Clubhouse 50000 sqft','EV charging','School onsite','Concierge','Gated community'],
  ARRAY['HARERA verified','Sohna Road developing corridor','Godrej brand premium','SPR connectivity','Dwarka Expressway access in 25 min'],
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d'
),
(
  '11111111-1111-1111-1111-111111111121',
  'Tata Primanti',
  'Tata Housing',
  'Delhi NCR',
  'Sector 72, Gurugram (Southern Peripheral Road)',
  '3BHK, 4BHK',
  185, 365, '1620-2890', 'RC/REP/HARERA/GGM/2017/05',
  'Possession ready', 'Active',
  ARRAY['28-acre township','Pool','Tennis','EV charging','School onsite','Concierge','Pet park'],
  ARRAY['HARERA verified','SPR direct access','Possession ongoing','OC received','Tata Housing brand'],
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e'
),

-- =========================================================================
-- PUNE (2 projects)
-- =========================================================================
(
  '11111111-1111-1111-1111-111111111122',
  'Lodha Belmondo',
  'Macrotech Developers (Lodha)',
  'Pune',
  'Pirangut, Pune (NH-48 / Mumbai-Pune Expressway access)',
  '2BHK, 3BHK, 4BHK villas',
  85, 320, '780-2850', 'P52100008215',
  'Mar 2027', 'Active',
  ARRAY['Greg Norman-designed golf course','Equestrian center','Resort pool','Spa','Concierge','EV charging','Cricket pitch'],
  ARRAY['MahaRERA verified','100+ acre integrated township','Mumbai-Pune Expressway access','Sole golf-resort destination near Pune','OC for ready phases'],
  'https://images.unsplash.com/photo-1571055107559-3e67626fa8be'
),
(
  '11111111-1111-1111-1111-111111111123',
  'Goel Ganga Aria',
  'Goel Ganga Developments',
  'Pune',
  'Kharadi (EON IT Park / WTC neighborhood)',
  '2BHK, 3BHK',
  88, 155, '720-1340', 'P52100052418',
  'Sep 2027', 'Active',
  ARRAY['Clubhouse 32000 sqft','Pool','Co-working','EV charging','Pet park','Kids zone'],
  ARRAY['MahaRERA verified','Walking distance to EON IT Park','WTC Pune adjacent','Goel Ganga 40-year track record','Solar common areas'],
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6'
),

-- =========================================================================
-- BANGALORE (2 projects)
-- =========================================================================
(
  '11111111-1111-1111-1111-111111111124',
  'Sobha Dream Acres',
  'Sobha Limited',
  'Bangalore',
  'Panathur Road (Off ORR, near Marathahalli)',
  '1BHK, 2BHK, 3BHK',
  68, 165, '650-1480', 'PRM/KA/RERA/1251/308/PR/171018/000999',
  'Possession ready', 'Active',
  ARRAY['81-acre township','7 clubhouses','Pool','Tennis','Cricket pitch','School onsite','Pet park'],
  ARRAY['K-RERA verified','OC received in 8 phases','ORR-Sarjapur connectivity','Marathahalli + ITPL access','Sobha quality benchmark'],
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3'
),
(
  '11111111-1111-1111-1111-111111111125',
  'Brigade Cornerstone Utopia',
  'Brigade Group',
  'Bangalore',
  'Whitefield, Varthur Hobli',
  '1BHK, 2BHK, 3BHK',
  78, 215, '620-1750', 'PRM/KA/RERA/1251/472/PR/190919/002898',
  'Mar 2028', 'Active',
  ARRAY['47-acre township','Olympic-size pool','Concierge','EV charging','School onsite','Hospital onsite','Retail street'],
  ARRAY['K-RERA verified','Whitefield ITPL access','Pre-launch pricing for new tower','Brigade signature township','Smart-home enabled']
,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'
);

-- =========================================================================
-- Visit slots for the 10 new properties (same pattern as seed_properties.sql)
-- 14 days forward, 4 daily slots (10am, 11:30, 4pm, 5:30pm), Mondays closed.
-- =========================================================================
INSERT INTO visit_slots (property_id, slot_date, slot_time, capacity, status)
SELECT p.id, d::date, t, 2, 'Open'
FROM properties p
CROSS JOIN generate_series(CURRENT_DATE + 1, CURRENT_DATE + 14, '1 day'::interval) d
CROSS JOIN UNNEST(ARRAY['10:00','11:30','16:00','17:30']) t
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111116',
  '11111111-1111-1111-1111-111111111117',
  '11111111-1111-1111-1111-111111111118',
  '11111111-1111-1111-1111-111111111119',
  '11111111-1111-1111-1111-111111111120',
  '11111111-1111-1111-1111-111111111121',
  '11111111-1111-1111-1111-111111111122',
  '11111111-1111-1111-1111-111111111123',
  '11111111-1111-1111-1111-111111111124',
  '11111111-1111-1111-1111-111111111125'
)
AND EXTRACT(DOW FROM d) NOT IN (1)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Verify
-- =========================================================================
-- After running:
-- SELECT city, count(*) FROM properties WHERE status = 'Active' GROUP BY city ORDER BY city;
-- Expect roughly:
--   Bangalore  6
--   Delhi NCR  10 (3 Noida + 4 Gurugram + Faridabad + Greater Noida West)
--   Mumbai     3
--   Pune       6
--   ---
--   Total active: 25
