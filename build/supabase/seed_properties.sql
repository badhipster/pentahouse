-- ============================================================================
-- Seed: properties + visit_slots
-- 15 properties: 5 hero (full enrichment) + 10 lighter, across 4 target cities
-- Hero projects have fixed UUIDs so seed_campaigns.sql and seed_leads.sql
-- can deterministically reference them.
-- ============================================================================

-- --- 5 HERO PROJECTS --------------------------------------------------------
INSERT INTO properties (id, project_name, developer, city, locality, config,
  price_min_lakhs, price_max_lakhs, carpet_area_sqft, rera_number,
  possession_date, status, amenities, highlights, image_url) VALUES
(
  '11111111-1111-1111-1111-111111111101',
  'Skyline Residences', 'DLF', 'Delhi NCR', 'Sector 76, Gurugram',
  '2BHK, 3BHK', 95, 185, '950-1620', 'GGM/761/2024/R/12',
  'Dec 2027', 'Active',
  ARRAY['Clubhouse','Pool','Gym','School onsite','EV charging','24x7 security'],
  ARRAY['DMRC line within 1.2 km','RERA-cleared title','Bank-approved by SBI/HDFC/ICICI','85% Vaastu units'],
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'
),
(
  '11111111-1111-1111-1111-111111111102',
  'Oceanic Heights', 'Lodha', 'Mumbai', 'Lower Parel',
  '2BHK, 3BHK, 4BHK', 320, 740, '780-1850', 'P51900012345',
  'Jun 2026', 'Active',
  ARRAY['Sea-view deck','Sky lounge','Concierge','Spa','Indoor sports','EV charging'],
  ARRAY['Possession in 13 months','OC expected before handover','Walk to Phoenix Palladium','BMC water 24x7'],
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'
),
(
  '11111111-1111-1111-1111-111111111103',
  'Greens of Kharadi', 'Kolte-Patil', 'Pune', 'Kharadi',
  '2BHK, 3BHK', 78, 142, '720-1310', 'P52100029988',
  'Mar 2027', 'Active',
  ARRAY['Clubhouse','Pool','Co-working','Pet park','Kids play zone'],
  ARRAY['EON IT Park within 2 km','Walking distance to ITC Maratha','Rainwater harvesting','Solar common areas'],
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6'
),
(
  '11111111-1111-1111-1111-111111111104',
  'Whitefield Verdant', 'Prestige', 'Bangalore', 'Whitefield, ITPL Road',
  '2BHK, 3BHK, 3.5BHK', 105, 215, '820-1580', 'PRM/KA/RERA/1251/446/PR/240412',
  'Sep 2027', 'Active',
  ARRAY['Clubhouse','Pool','Tennis','Amphitheatre','EV charging','Smart home'],
  ARRAY['Metro Purple line extension','Top schools within 3 km','LEED Gold target','Smart-home enabled'],
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'
),
(
  '11111111-1111-1111-1111-111111111105',
  'Noida Sky Park', 'Godrej', 'Delhi NCR', 'Sector 150, Noida',
  '3BHK, 4BHK', 175, 410, '1450-2680', 'UPRERAPRJ123456',
  'Dec 2028', 'Upcoming',
  ARRAY['Golf practice','Pool','Spa','Clubhouse','Cycling track'],
  ARRAY['80% open green','Sports city zone','Yamuna Expressway access','Pre-launch pricing'],
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'
);

-- --- 10 LIGHTER PROJECTS ----------------------------------------------------
INSERT INTO properties (id, project_name, developer, city, locality, config,
  price_min_lakhs, price_max_lakhs, carpet_area_sqft, rera_number,
  possession_date, status, amenities) VALUES
('11111111-1111-1111-1111-111111111106','Trident Towers','M3M','Delhi NCR','Sector 65, Gurugram','3BHK, 4BHK',225,520,'1350-2400','GGM/812/2024/R/18','Mar 2028','Active', ARRAY['Pool','Gym','Concierge']),
('11111111-1111-1111-1111-111111111107','Riverdale Park','Mahindra Lifespaces','Pune','Mahalunge','2BHK, 3BHK',62,118,'650-1180','P52100031200','Aug 2027','Active', ARRAY['Pool','Clubhouse','Pet park']),
('11111111-1111-1111-1111-111111111108','Marina Bay','Hiranandani','Mumbai','Powai','3BHK',290,460,'1100-1450','P51800018822','Ready to Move','Active', ARRAY['Lake view','Clubhouse','School','Hospital onsite']),
('11111111-1111-1111-1111-111111111109','Hebbal Greens','Sobha','Bangalore','Hebbal','2BHK, 3BHK',92,178,'820-1380','PRM/KA/RERA/1251/309/PR/231120','Jun 2027','Active', ARRAY['Pool','Cricket pitch','Yoga deck']),
('11111111-1111-1111-1111-111111111110','Sarjapur Heights','Brigade','Bangalore','Sarjapur Road','2BHK, 3BHK',82,158,'780-1320','PRM/KA/RERA/1251/410/PR/240212','Dec 2027','Active', ARRAY['Pool','Co-working','Kids zone']),
('11111111-1111-1111-1111-111111111111','Wagholi Springs','Kohinoor','Pune','Wagholi','1BHK, 2BHK',38,72,'460-820','P52100033421','Sep 2027','Active', ARRAY['Gym','Clubhouse']),
('11111111-1111-1111-1111-111111111112','Andheri Crest','Oberoi','Mumbai','Andheri West','2BHK, 3BHK',265,520,'700-1400','P51800019901','Mar 2028','Active', ARRAY['Sky lounge','Pool','Spa']),
('11111111-1111-1111-1111-111111111113','Faridabad Greens','Puri','Delhi NCR','Sector 81, Faridabad','2BHK, 3BHK',58,118,'780-1320','HRERA-PKL-FBD-178/2024','Jun 2028','Upcoming', ARRAY['Pool','Clubhouse','Cycling track']),
('11111111-1111-1111-1111-111111111114','Electronic City Pulse','Puravankara','Bangalore','Electronic City Phase 1','1BHK, 2BHK',45,82,'480-920','PRM/KA/RERA/1251/350/PR/231220','Dec 2026','Active', ARRAY['Gym','Pool']),
('11111111-1111-1111-1111-111111111115','Hinjewadi Vista','Paranjape','Pune','Hinjewadi Phase 2','2BHK, 3BHK',68,128,'680-1240','P52100029102','Dec 2027','Active', ARRAY['Pool','Clubhouse','Pet park']);

-- --- VISIT SLOTS (next 14 days for hero projects) ---------------------------
-- Q5 default: developer provides slots; agent proposes from this set.
INSERT INTO visit_slots (property_id, slot_date, slot_time, capacity, status)
SELECT p.id, d::date, t, 2, 'Open'
FROM properties p
CROSS JOIN generate_series(CURRENT_DATE + 1, CURRENT_DATE + 14, '1 day'::interval) d
CROSS JOIN UNNEST(ARRAY['10:00','11:30','16:00','17:30']) t
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111105'
)
AND EXTRACT(DOW FROM d) NOT IN (1)  -- Closed Mondays
ON CONFLICT DO NOTHING;
