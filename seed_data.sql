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
-- ============================================================================
-- Seed: campaigns (simulated, per PRD §8 out-of-scope for live API)
-- Fixed UUIDs so seed_leads.sql can attribute leads to specific campaigns.
-- Realistic CPL ranges per platform from India proptech market research.
-- ============================================================================

INSERT INTO campaigns (id, property_id, platform, campaign_name, ad_copy,
  target_audience, budget_inr, impressions, clicks, leads_generated, cpl_inr, status) VALUES

-- DLF Skyline Residences (Delhi NCR) ----------------------------------------
('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','Meta',
 'Skyline-Meta-Gurugram-3BHK',
 'New 3BHK in Sector 76 Gurugram. DLF quality, DMRC nearby. Site visits open.',
 'Age 32-48, HHI 30L+, Gurugram + South Delhi, intent: real-estate-buying',
 250000, 412000, 5840, 312, 801, 'Active'),
('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','Google',
 'Skyline-Search-3BHK-Gurugram',
 '3BHK Apartments Sector 76 Gurugram | DLF Skyline | Book Site Visit',
 'Keywords: 3bhk gurugram, dlf sector 76, apartments near dmrc',
 180000, 95000, 4120, 198, 909, 'Active'),
('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111101','Portal',
 'Skyline-99acres-Featured',
 'Featured project listing on 99acres + Magicbricks',
 '99acres + Magicbricks featured slot, NCR shoppers',
 120000, 220000, 3200, 240, 500, 'Active'),

-- Lodha Oceanic Heights (Mumbai) --------------------------------------------
('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111102','Meta',
 'Oceanic-Meta-LowerParel-LuxLiving',
 'Lower Parel sea-view homes. 2/3/4 BHK. Ready in 13 months. Visit today.',
 'Age 35-55, HHI 75L+, Mumbai + Pune NRI, intent: luxury-apartments',
 380000, 510000, 7280, 286, 1329, 'Active'),
('22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111102','Google',
 'Oceanic-Search-Luxury-Mumbai',
 'Luxury Apartments Lower Parel | Lodha Oceanic Heights | Sea View',
 'Keywords: luxury flats lower parel, lodha mumbai, sea view apartments',
 240000, 84000, 3680, 162, 1481, 'Active'),
('22222222-2222-2222-2222-222222222206','11111111-1111-1111-1111-111111111102','Portal',
 'Oceanic-MagicBricks-Premium',
 'Premium listing on MagicBricks + Housing.com',
 'MagicBricks + Housing premium slot, Mumbai metro',
 150000, 180000, 2400, 188, 798, 'Active'),

-- Kolte-Patil Greens of Kharadi (Pune) --------------------------------------
('22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111103','Meta',
 'Greens-Meta-Kharadi-IT-Pros',
 'Walk-to-work homes in Kharadi. 2/3 BHK near EON IT Park. Visit this weekend.',
 'Age 28-42, IT/ITeS workers, Pune east + Kharadi/Wagholi residents',
 180000, 380000, 5240, 348, 517, 'Active'),
('22222222-2222-2222-2222-222222222208','11111111-1111-1111-1111-111111111103','Google',
 'Greens-Search-Kharadi',
 '2/3 BHK Kharadi | Kolte-Patil Greens | Near EON IT Park',
 'Keywords: 3bhk kharadi, near eon it park, kolte patil pune',
 120000, 62000, 2840, 196, 612, 'Active'),

-- Prestige Whitefield Verdant (Bangalore) -----------------------------------
('22222222-2222-2222-2222-222222222209','11111111-1111-1111-1111-111111111104','Meta',
 'Verdant-Meta-Whitefield-Family',
 'Whitefield premium living. 2/3/3.5 BHK. Top schools nearby. Site visits open.',
 'Age 32-48, HHI 35L+, Whitefield/Marathahalli/KR Puram, family-stage signals',
 220000, 445000, 6120, 392, 561, 'Active'),
('22222222-2222-2222-2222-222222222210','11111111-1111-1111-1111-111111111104','Google',
 'Verdant-Search-Whitefield-3BHK',
 '3BHK Whitefield ITPL | Prestige Verdant | Near Metro',
 'Keywords: 3bhk whitefield, prestige verdant, apartments near itpl',
 160000, 78000, 3420, 224, 714, 'Active'),
('22222222-2222-2222-2222-222222222211','11111111-1111-1111-1111-111111111104','Portal',
 'Verdant-Housing-Premium',
 'Premium project listing on Housing.com + NoBroker',
 'Housing premium + NoBroker bundle, Bangalore east',
 100000, 142000, 2080, 168, 595, 'Active'),

-- Godrej Noida Sky Park (Delhi NCR) ------------------------------------------
('22222222-2222-2222-2222-222222222212','11111111-1111-1111-1111-111111111105','Meta',
 'NoidaSkyPark-Meta-Prelaunch',
 'Pre-launch pricing. 3/4 BHK in Sector 150 Noida. Limited inventory.',
 'Age 38-55, HHI 50L+, Noida + Greater Noida, investor signals',
 300000, 425000, 5680, 268, 1119, 'Active'),

-- Lighter projects (1 campaign each) ----------------------------------------
('22222222-2222-2222-2222-222222222213','11111111-1111-1111-1111-111111111107','Meta',
 'Riverdale-Meta-Mahalunge',
 'Affordable 2/3 BHK in Mahalunge. Family living, Pune.',
 'Age 28-40, HHI 18L+, Pune west',
 90000, 195000, 2840, 218, 413, 'Active'),
('22222222-2222-2222-2222-222222222214','11111111-1111-1111-1111-111111111110','Google',
 'Sarjapur-Search-2BHK',
 '2BHK Sarjapur Road | Brigade Heights | RERA Approved',
 'Keywords: 2bhk sarjapur, brigade bangalore, apartments under 1 cr',
 95000, 48000, 2120, 142, 669, 'Active'),
('22222222-2222-2222-2222-222222222215','11111111-1111-1111-1111-111111111114','Portal',
 'EC-Pulse-99acres',
 'Listing on 99acres Bangalore',
 '99acres listing, Bangalore south',
 50000, 88000, 1240, 96, 521, 'Active');
-- ============================================================================
-- Seed: leads + eval_ground_truth + messages + visits + bookings
-- 30 leads total:
--   IDs 01-15 = EVAL SET (with ground truth for Section 8 validation protocol)
--   IDs 16-30 = DEMO PIPELINE leads (varied stages so dashboard looks alive)
-- Plus 5 completed journeys (visits + objections + 2 bookings) for demo-day flow.
-- ============================================================================

-- Convention:
--   Lead UUIDs:      33333333-3333-3333-3333-3333333333NN   (NN = 01..30)
--   Visit UUIDs:     44444444-4444-4444-4444-4444444444NN
--   Booking UUIDs:   55555555-5555-5555-5555-5555555555NN
--   Message UUIDs:   66666666-6666-6666-6666-6666666666NN

-- ============================================================================
-- A. EVAL SET (15 leads) — varied across source × intent × urgency × budget
-- ============================================================================

INSERT INTO leads (id, name, phone, email, source, campaign_id, inquiry_text,
  interested_project, purpose, budget_lakhs, preferred_config, preferred_city,
  preferred_locality, purchase_timeline, loan_status, family_size,
  decision_makers, language, intent_fields_count, stage, assigned_to,
  first_response_at, qualified_at, created_at) VALUES

-- 01. Hot buy, perfectly matched, NCR DLF
('33333333-3333-3333-3333-333333333301','Rahul Mehra','+919810012301','rahul.mehra@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222201',
 'Looking for 3BHK in DLF Skyline, Sector 76 Gurugram. Budget around 1.6Cr. Loan pre-approved.',
 'Skyline Residences','buy',160,'3BHK','Delhi NCR','Sector 76, Gurugram',
 'Immediately','Pre-approved',4,'Self+Spouse','en',7,'Qualified','Rohit',
 now() - interval '6 days 23 hours 58 minutes', now() - interval '6 days 23 hours 50 minutes', now() - interval '7 days'),

-- 02. Just browsing, no real intent — low/low
('33333333-3333-3333-3333-333333333302','Aman Khurana','+919810012302','aman.k@outlook.com',
 '99acres','22222222-2222-2222-2222-222222222203',
 'Just exploring options, not in a hurry. Tell me about projects in NCR.',
 NULL,'browse',NULL,NULL,'Delhi NCR',NULL,
 'Exploring',NULL,NULL,NULL,'en',2,'New',NULL,
 now() - interval '5 days 23 hours 57 minutes', NULL, now() - interval '6 days'),

-- 03. Rent intent (mismatched product) — Disqualify
('33333333-3333-3333-3333-333333333303','Sonia Bhatt','+919810012303','sonia.b@yahoo.com',
 'Housing.com',NULL,
 'Need a 2BHK on rent in Whitefield. 35-45k per month.',
 'Whitefield Verdant','rent',NULL,'2BHK','Bangalore','Whitefield',
 'Immediately',NULL,2,'Self','en',4,'New',NULL,
 now() - interval '4 days 23 hours 59 minutes', now() - interval '4 days 23 hours 50 minutes', now() - interval '5 days'),

-- 04. Investor, 2.5Cr — VIP ESCALATION
('33333333-3333-3333-3333-333333333304','Vikram Sethi','+919810012304','vikram.sethi@example.in',
 'CP Referral',NULL,
 'Investor. Looking for 4BHK Lower Parel or BKC. 2.5Cr range. Need 2 units if possible.',
 'Oceanic Heights','invest',250,'4BHK','Mumbai','Lower Parel',
 '3 months','Not sure',1,'Self','en',5,'Qualified','Priya',
 now() - interval '3 days 23 hours 59 minutes', now() - interval '3 days 23 hours 50 minutes', now() - interval '4 days'),

-- 05. Low confidence / vague — ESCALATE
('33333333-3333-3333-3333-333333333305','Unknown Caller','+919810012305',NULL,
 'WhatsApp',NULL,
 'hi pls share',
 NULL,'not_sure',NULL,NULL,NULL,NULL,
 NULL,NULL,NULL,NULL,'en',0,'New',NULL,
 NULL, NULL, now() - interval '6 hours'),

-- 06. NCR budget shopper, config mismatch (wants 4BHK at 1Cr) — Brochure
('33333333-3333-3333-3333-333333333306','Neha Goyal','+919810012306','neha.g@gmail.com',
 'Google Ad','22222222-2222-2222-2222-222222222202',
 '4BHK Gurugram under 1Cr possible? Possession in 1 year max.',
 'Skyline Residences','buy',100,'4BHK','Delhi NCR','Sector 76, Gurugram',
 '3 months','Planning',5,'Joint family','en',6,'Qualified','Rohit',
 now() - interval '3 days 23 hours 58 minutes', now() - interval '3 days 23 hours 45 minutes', now() - interval '4 days'),

-- 07. Mumbai luxury, ready to move, pre-approved — Schedule
('33333333-3333-3333-3333-333333333307','Ananya Pillai','+919810012307','ananya.p@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222204',
 '3BHK Lower Parel. Ready to move. 4-4.5Cr range. Loan pre-approved with HDFC.',
 'Oceanic Heights','buy',440,'3BHK','Mumbai','Lower Parel',
 'Immediately','Pre-approved',3,'Self+Spouse','en',7,'Qualified','Priya',
 now() - interval '2 days 23 hours 58 minutes', now() - interval '2 days 23 hours 48 minutes', now() - interval '3 days'),

-- 08. Pune IT pro, 3 months, near EON — Schedule
('33333333-3333-3333-3333-333333333308','Karthik Iyer','+919810012308','karthik.iyer@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222207',
 '3BHK near EON IT Park Kharadi. Budget 1.1-1.4Cr. Want to shift in 3 months.',
 'Greens of Kharadi','buy',125,'3BHK','Pune','Kharadi',
 '3 months','Applied',3,'Self+Spouse','en',7,'Qualified','Priya',
 now() - interval '1 day 23 hours 58 minutes', now() - interval '1 day 23 hours 50 minutes', now() - interval '2 days'),

-- 09. Bangalore family, school priority, exploring — Brochure
('33333333-3333-3333-3333-333333333309','Meera Krishnan','+919810012309','meera.k@gmail.com',
 'Google Ad','22222222-2222-2222-2222-222222222210',
 '3BHK Whitefield, kids start school next year. Top schools matter. 1.5-1.8Cr.',
 'Whitefield Verdant','buy',160,'3BHK','Bangalore','Whitefield, ITPL Road',
 '6 months','Planning',4,'Self+Spouse','en',7,'Qualified','Rohit',
 now() - interval '1 day 23 hours 59 minutes', now() - interval '1 day 23 hours 50 minutes', now() - interval '2 days'),

-- 10. Faridabad budget shopper — Brochure / longer cycle
('33333333-3333-3333-3333-333333333310','Sunil Yadav','+919810012310','sunil.y@gmail.com',
 'Portal',NULL,
 '2BHK Faridabad, budget 55-65L. Possession not urgent, 2-3 years okay.',
 'Faridabad Greens','buy',60,'2BHK','Delhi NCR','Sector 81, Faridabad',
 '6 months','Planning',4,'Joint family','en',6,'Qualified','Rohit',
 now() - interval '23 hours 58 minutes', now() - interval '23 hours 45 minutes', now() - interval '1 day'),

-- 11. NRI investor — ESCALATE (high value + complex)
('33333333-3333-3333-3333-333333333311','Rajesh Subramanian','+971501234567','rajesh.s@gulfmail.com',
 'WhatsApp',NULL,
 'NRI from Dubai. Looking at 2-3 units for portfolio. Mumbai or NCR. 3-5Cr each. Need NRI loan support.',
 'Oceanic Heights','invest',400,'3BHK','Mumbai',NULL,
 '3 months','Not sure',NULL,'Self','en',5,'Qualified','Priya',
 now() - interval '23 hours 56 minutes', now() - interval '23 hours 40 minutes', now() - interval '1 day'),

-- 12. Walk-in returning — Schedule
('33333333-3333-3333-3333-333333333312','Divya Nair','+919810012312','divya.nair@gmail.com',
 'Walk-in',NULL,
 'Visited site office last weekend. Want to see 3.5BHK floor plan options.',
 'Whitefield Verdant','buy',195,'3.5BHK','Bangalore','Whitefield, ITPL Road',
 'Immediately','Pre-approved',4,'Self+Spouse','en',7,'Visit Scheduled','Rohit',
 now() - interval '2 days 23 hours 50 minutes', now() - interval '2 days 23 hours 40 minutes', now() - interval '3 days'),

-- 13. CP referral high intent — Schedule
('33333333-3333-3333-3333-333333333313','Arvind Patil','+919810012313','arvind.p@gmail.com',
 'CP Referral',NULL,
 'Referred by Sandeep. Want to see Greens of Kharadi this weekend. 3BHK around 1.3Cr.',
 'Greens of Kharadi','buy',130,'3BHK','Pune','Kharadi',
 'Immediately','Applied',3,'Self+Spouse','en',7,'Qualified','Priya',
 now() - interval '23 hours 55 minutes', now() - interval '23 hours 50 minutes', now() - interval '1 day'),

-- 14. Google ad, researching — Long-term nurture
('33333333-3333-3333-3333-333333333314','Pooja Sharma','+919810012314','pooja.s@gmail.com',
 'Google Ad','22222222-2222-2222-2222-222222222202',
 'Researching options in Gurugram, 6-12 month horizon. Want comparisons across DLF, M3M.',
 'Skyline Residences','buy',140,'3BHK','Delhi NCR','Sector 76, Gurugram',
 '6 months','Planning',3,'Self+Spouse','en',6,'Qualified','Rohit',
 now() - interval '4 days 23 hours 58 minutes', now() - interval '4 days 23 hours 50 minutes', now() - interval '5 days'),

-- 15. Fence-sitter Meta ad, 6 months — Brochure
('33333333-3333-3333-3333-333333333315','Sameer Joshi','+919810012315','sameer.j@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222209',
 '2BHK Whitefield. Will decide in 6 months. Budget 1-1.2Cr.',
 'Whitefield Verdant','buy',110,'2BHK','Bangalore','Whitefield, ITPL Road',
 '6 months','Planning',2,'Self+Spouse','en',6,'Qualified','Rohit',
 now() - interval '4 days 23 hours 59 minutes', now() - interval '4 days 23 hours 50 minutes', now() - interval '5 days');

-- --- Eval ground truth (for Section 8 validation report) -------------------
INSERT INTO eval_ground_truth (lead_id, expected_fit_band, expected_urgency_band, expected_action, reviewer_notes) VALUES
('33333333-3333-3333-3333-333333333301','high','high','Schedule site visit','Textbook hot lead: matched product, pre-approved, immediate timeline'),
('33333333-3333-3333-3333-333333333302','low','low','Long-term nurture','No budget or config signal; classic tire-kicker'),
('33333333-3333-3333-3333-333333333303','low','high','Disqualify','Rent intent on a buy-only inventory'),
('33333333-3333-3333-3333-333333333304','high','medium','Escalate to manager','>2Cr trigger: VIP routing per Story 7'),
('33333333-3333-3333-3333-333333333305','low','low','Escalate to manager','Confidence <50% trigger; ambiguous text'),
('33333333-3333-3333-3333-333333333306','medium','medium','Send brochure','Config mismatch (4BHK at 1Cr in this market is non-viable)'),
('33333333-3333-3333-3333-333333333307','high','high','Schedule site visit','Ready-to-move + pre-approved is the conversion goldmine'),
('33333333-3333-3333-3333-333333333308','high','high','Schedule site visit','IT worker walk-to-work fit + 3-month timeline'),
('33333333-3333-3333-3333-333333333309','high','medium','Send brochure','Strong fit but 6-month school-start anchor reduces urgency'),
('33333333-3333-3333-3333-333333333310','medium','low','Send brochure','Budget fits, urgency low; brochure-and-nurture cadence'),
('33333333-3333-3333-3333-333333333311','high','medium','Escalate to manager','NRI + multi-unit + 3-5Cr triggers VIP path'),
('33333333-3333-3333-3333-333333333312','high','high','Schedule site visit','Returning walk-in is the highest-converting source'),
('33333333-3333-3333-3333-333333333313','high','high','Schedule site visit','CP referrals carry priority + named context'),
('33333333-3333-3333-3333-333333333314','medium','low','Long-term nurture','Long horizon, comparison-shopping mode'),
('33333333-3333-3333-3333-333333333315','medium','low','Send brochure','Stated 6-month decision; staged nurture');

-- ============================================================================
-- B. DEMO PIPELINE LEADS (16..30) — varied stages so the UI looks alive
-- ============================================================================

INSERT INTO leads (id, name, phone, email, source, campaign_id, inquiry_text,
  interested_project, purpose, budget_lakhs, preferred_config, preferred_city,
  preferred_locality, purchase_timeline, loan_status, family_size,
  decision_makers, language, intent_fields_count, stage, assigned_to,
  first_response_at, qualified_at, created_at) VALUES

-- New, just-arrived (no first response yet)
('33333333-3333-3333-3333-333333333316','Tanvi Reddy','+919810012316','tanvi.r@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222209','Interested in Whitefield Verdant 3BHK.',
 'Whitefield Verdant','buy',NULL,'3BHK','Bangalore',NULL,NULL,NULL,NULL,NULL,'en',2,'New',NULL,
 NULL, NULL, now() - interval '12 minutes'),

('33333333-3333-3333-3333-333333333317','Yash Malhotra','+919810012317','yash.m@gmail.com',
 'Google Ad','22222222-2222-2222-2222-222222222202','Want a callback about Skyline Residences pricing.',
 'Skyline Residences','buy',NULL,NULL,'Delhi NCR','Sector 76, Gurugram',NULL,NULL,NULL,NULL,'en',2,'New',NULL,
 NULL, NULL, now() - interval '4 minutes'),

('33333333-3333-3333-3333-333333333318','Ritika Sen','+919810012318','ritika.s@gmail.com',
 'Housing.com',NULL,'Hello, brochure please. Lodha Lower Parel.',
 'Oceanic Heights',NULL,NULL,'3BHK','Mumbai','Lower Parel',NULL,NULL,NULL,NULL,'en',2,'New',NULL,
 NULL, NULL, now() - interval '2 minutes'),

('33333333-3333-3333-3333-333333333319','Imran Sheikh','+919810012319','imran.s@gmail.com',
 'WhatsApp',NULL,'मुझे Kharadi में 2BHK चाहिए, बजट 70 लाख तक।',
 'Greens of Kharadi','buy',70,'2BHK','Pune','Kharadi','3 months','Planning',3,'Self+Spouse','hi',6,'Qualified','Priya',
 now() - interval '23 hours 58 minutes', now() - interval '23 hours 50 minutes', now() - interval '1 day'),

('33333333-3333-3333-3333-333333333320','Lalit Bansal','+919810012320','lalit.b@gmail.com',
 '99acres','22222222-2222-2222-2222-222222222203','3BHK Sector 150 Noida. Investment angle.',
 'Noida Sky Park','invest',180,'3BHK','Delhi NCR','Sector 150, Noida','6 months','Planning',NULL,'Self','en',6,'Qualified','Rohit',
 now() - interval '23 hours 58 minutes', now() - interval '23 hours 50 minutes', now() - interval '1 day'),

-- Qualified, pending message approval
('33333333-3333-3333-3333-333333333321','Smita Joshi','+919810012321','smita.j@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222204','Lower Parel 2BHK. 3-3.5Cr. Possession important.',
 'Oceanic Heights','buy',330,'2BHK','Mumbai','Lower Parel','Immediately','Applied',2,'Self+Spouse','en',7,'Qualified','Priya',
 now() - interval '5 hours 58 minutes', now() - interval '5 hours 50 minutes', now() - interval '6 hours'),

('33333333-3333-3333-3333-333333333322','Anant Verma','+919810012322','anant.v@gmail.com',
 'CP Referral',NULL,'Referred by Mohit. 3BHK in Whitefield Verdant. Around 1.7Cr.',
 'Whitefield Verdant','buy',170,'3BHK','Bangalore','Whitefield, ITPL Road','3 months','Pre-approved',3,'Self+Spouse','en',7,'Qualified','Rohit',
 now() - interval '4 hours 58 minutes', now() - interval '4 hours 50 minutes', now() - interval '5 hours'),

-- Visit Scheduled
('33333333-3333-3333-3333-333333333323','Harish Rao','+919810012323','harish.rao@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222207','3BHK Kharadi. Visit this Saturday.',
 'Greens of Kharadi','buy',135,'3BHK','Pune','Kharadi','Immediately','Applied',4,'Self+Spouse','en',7,'Visit Scheduled','Priya',
 now() - interval '2 days 23 hours 50 minutes', now() - interval '2 days 23 hours 40 minutes', now() - interval '3 days'),

('33333333-3333-3333-3333-333333333324','Naina Kapoor','+919810012324','naina.k@gmail.com',
 'Google Ad','22222222-2222-2222-2222-222222222210','3.5BHK Whitefield. Sunday visit.',
 'Whitefield Verdant','buy',205,'3.5BHK','Bangalore','Whitefield, ITPL Road','Immediately','Pre-approved',4,'Self+Spouse','en',7,'Visit Scheduled','Rohit',
 now() - interval '1 day 23 hours 50 minutes', now() - interval '1 day 23 hours 40 minutes', now() - interval '2 days'),

-- Visited (notes ready for objection extraction)
('33333333-3333-3333-3333-333333333325','Geeta Saxena','+919810012325','geeta.s@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222201','3BHK Skyline Residences. Family decision.',
 'Skyline Residences','buy',150,'3BHK','Delhi NCR','Sector 76, Gurugram','3 months','Pre-approved',4,'Joint family','en',7,'Visited','Rohit',
 now() - interval '7 days 23 hours 50 minutes', now() - interval '7 days 23 hours 40 minutes', now() - interval '8 days'),

('33333333-3333-3333-3333-333333333326','Manish Agarwal','+919810012326','manish.a@gmail.com',
 'CP Referral',NULL,'4BHK Oceanic Heights. Sea-view non-negotiable.',
 'Oceanic Heights','buy',680,'4BHK','Mumbai','Lower Parel','3 months','Pre-approved',4,'Self+Spouse','en',7,'Visited','Priya',
 now() - interval '6 days 23 hours 50 minutes', now() - interval '6 days 23 hours 40 minutes', now() - interval '7 days'),

-- Negotiation
('33333333-3333-3333-3333-333333333327','Shreya Bhattacharya','+919810012327','shreya.b@gmail.com',
 'Walk-in',NULL,'3BHK Kharadi, negotiating on floor and price.',
 'Greens of Kharadi','buy',128,'3BHK','Pune','Kharadi','Immediately','Pre-approved',3,'Self+Spouse','en',7,'Negotiation','Priya',
 now() - interval '10 days 23 hours 50 minutes', now() - interval '10 days 23 hours 40 minutes', now() - interval '11 days'),

-- Booked
('33333333-3333-3333-3333-333333333328','Deepak Choudhary','+919810012328','deepak.c@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222209','3BHK Whitefield Verdant. Booking done.',
 'Whitefield Verdant','buy',175,'3BHK','Bangalore','Whitefield, ITPL Road','Immediately','Pre-approved',3,'Self+Spouse','en',7,'Booked','Rohit',
 now() - interval '14 days 23 hours 50 minutes', now() - interval '14 days 23 hours 40 minutes', now() - interval '15 days'),

-- Booked #2
('33333333-3333-3333-3333-333333333329','Priyanka Das','+919810012329','priyanka.d@gmail.com',
 'CP Referral',NULL,'3BHK Greens of Kharadi. Booking done last week.',
 'Greens of Kharadi','buy',132,'3BHK','Pune','Kharadi','Immediately','Pre-approved',3,'Self+Spouse','en',7,'Booked','Priya',
 now() - interval '12 days 23 hours 50 minutes', now() - interval '12 days 23 hours 40 minutes', now() - interval '13 days'),

-- Lost
('33333333-3333-3333-3333-333333333330','Faisal Khan','+919810012330','faisal.k@gmail.com',
 'Meta Ad','22222222-2222-2222-2222-222222222204','3BHK Lower Parel. Possession too far. Went with competitor.',
 'Oceanic Heights','buy',360,'3BHK','Mumbai','Lower Parel','Immediately','Pre-approved',3,'Self+Spouse','en',7,'Lost','Priya',
 now() - interval '20 days 23 hours 50 minutes', now() - interval '20 days 23 hours 40 minutes', now() - interval '21 days');

-- ============================================================================
-- C. LEAD SCORES (sample — agent will produce these live; pre-seeded so the
-- demo UI is populated without depending on n8n being up at boot.)
-- ============================================================================
INSERT INTO lead_scores (lead_id, fit_score, urgency_score, overall_score, confidence,
  fit_reasons, urgency_reasons, recommended_action, matched_property_id, prompt_version) VALUES
('33333333-3333-3333-3333-333333333301',92,95,93,94,
  ARRAY['Budget 1.6Cr matches Skyline 3BHK range','City and locality exact match'],
  ARRAY['Timeline: Immediately','Loan pre-approved'],
  'Schedule site visit','11111111-1111-1111-1111-111111111101','v1.0'),
('33333333-3333-3333-3333-333333333302',22,18,20,82,
  ARRAY['No budget signal','No config preference shared'],
  ARRAY['Stated "just exploring"'],
  'Long-term nurture',NULL,'v1.0'),
('33333333-3333-3333-3333-333333333303',12,80,46,90,
  ARRAY['Rent intent on a sales-only product','Unit type matches but transaction type does not'],
  ARRAY['Immediate move-in requested'],
  'Disqualify',NULL,'v1.0'),
('33333333-3333-3333-3333-333333333304',88,62,75,76,
  ARRAY['Budget 2.5Cr fits Oceanic 4BHK band','Multi-unit interest signals investor profile'],
  ARRAY['Timeline 3 months','Multi-unit raises stakes'],
  'Escalate to manager','11111111-1111-1111-1111-111111111102','v1.0'),
('33333333-3333-3333-3333-333333333305',8,12,10,38,
  ARRAY['No fit signals extractable'],
  ARRAY['Single ambiguous message'],
  'Escalate to manager',NULL,'v1.0'),
('33333333-3333-3333-3333-333333333306',55,58,57,80,
  ARRAY['Budget 1Cr is below 4BHK floor in this micro-market','Locality match'],
  ARRAY['Timeline 3 months'],
  'Send brochure','11111111-1111-1111-1111-111111111101','v1.0'),
('33333333-3333-3333-3333-333333333307',95,96,96,96,
  ARRAY['Budget 4.4Cr matches Oceanic 3BHK premium tier','Pre-approved with HDFC'],
  ARRAY['Ready-to-move + immediate timeline'],
  'Schedule site visit','11111111-1111-1111-1111-111111111102','v1.0'),
('33333333-3333-3333-3333-333333333308',90,88,89,92,
  ARRAY['Budget 1.25Cr fits Kharadi 3BHK range','Walk-to-work to EON IT Park'],
  ARRAY['3-month shift timeline','Loan applied'],
  'Schedule site visit','11111111-1111-1111-1111-111111111103','v1.0'),
('33333333-3333-3333-3333-333333333309',86,55,73,88,
  ARRAY['Budget 1.6Cr matches Verdant 3BHK','Schools-nearby USP aligns'],
  ARRAY['6-month decision anchored to school year'],
  'Send brochure','11111111-1111-1111-1111-111111111104','v1.0'),
('33333333-3333-3333-3333-333333333310',72,32,55,84,
  ARRAY['Budget 60L fits Faridabad Greens 2BHK','City match'],
  ARRAY['2-3 year possession horizon is fine for buyer'],
  'Send brochure','11111111-1111-1111-1111-111111111113','v1.0'),
('33333333-3333-3333-3333-333333333311',85,58,73,72,
  ARRAY['NRI multi-unit fits luxury portfolio play','Mumbai/NCR coverage available'],
  ARRAY['3-month window for finalisation'],
  'Escalate to manager','11111111-1111-1111-1111-111111111102','v1.0'),
('33333333-3333-3333-3333-333333333312',93,94,94,95,
  ARRAY['Returning walk-in: prior site visit','3.5BHK matches Verdant top tier'],
  ARRAY['Immediate timeline','Loan pre-approved'],
  'Schedule site visit','11111111-1111-1111-1111-111111111104','v1.0'),
('33333333-3333-3333-3333-333333333313',91,93,92,94,
  ARRAY['Budget 1.3Cr matches Kharadi 3BHK','Named CP referral context'],
  ARRAY['Visit requested this weekend','Loan applied'],
  'Schedule site visit','11111111-1111-1111-1111-111111111103','v1.0'),
('33333333-3333-3333-3333-333333333314',68,28,49,86,
  ARRAY['Budget 1.4Cr roughly aligns','Locality match'],
  ARRAY['6-12 month research horizon'],
  'Long-term nurture','11111111-1111-1111-1111-111111111101','v1.0'),
('33333333-3333-3333-3333-333333333315',74,30,54,87,
  ARRAY['Budget 1.1Cr fits Verdant 2BHK','Locality match'],
  ARRAY['6-month decision stated upfront'],
  'Send brochure','11111111-1111-1111-1111-111111111104','v1.0'),
-- Demo pipeline scores (subset)
('33333333-3333-3333-3333-333333333319',82,75,79,90,
  ARRAY['Hindi-language buyer, locality + config match','Budget 70L fits Wagholi/Kharadi 2BHK'],
  ARRAY['3-month timeline'],
  'Schedule site visit','11111111-1111-1111-1111-111111111103','v1.0'),
('33333333-3333-3333-3333-333333333320',70,42,58,82,
  ARRAY['Sector 150 inventory available in Sky Park','Budget 1.8Cr fits 3BHK'],
  ARRAY['6-month investor cycle'],
  'Send brochure','11111111-1111-1111-1111-111111111105','v1.0'),
('33333333-3333-3333-3333-333333333321',92,88,90,93,
  ARRAY['Budget 3.3Cr matches Oceanic 2BHK premium','Possession in 13 months satisfies buyer'],
  ARRAY['Immediate timeline','Loan applied'],
  'Schedule site visit','11111111-1111-1111-1111-111111111102','v1.0'),
('33333333-3333-3333-3333-333333333322',93,90,92,94,
  ARRAY['Budget 1.7Cr exact match for Verdant 3BHK','Named CP referral'],
  ARRAY['3-month timeline','Pre-approved'],
  'Schedule site visit','11111111-1111-1111-1111-111111111104','v1.0');

-- ============================================================================
-- D. ESCALATIONS (Story 7) — populate dashboard alert card
-- ============================================================================
INSERT INTO escalations (lead_id, reason_code, reason_text, recommended_action, status) VALUES
('33333333-3333-3333-3333-333333333304','vip_budget','Budget 2.5Cr triggers >2Cr VIP threshold; investor profile, multi-unit interest','Priya to call within 30 min','open'),
('33333333-3333-3333-3333-333333333305','low_confidence','Single-message lead with insufficient signal (confidence 38%)','Manual qualifier call','open'),
('33333333-3333-3333-3333-333333333311','vip_budget','NRI multi-unit, 3-5Cr per unit; loan complexity','Loop in NRI desk + Priya','acknowledged');

-- ============================================================================
-- E. COMPLETED JOURNEYS (5) — visits + objections + 2 bookings + messages
-- ============================================================================

-- Visit 1 (Lead 25 — Visited, Skyline Sector 76, family decision)
INSERT INTO visits (id, lead_id, property_id, scheduled_date, scheduled_time, status,
  attendees, objections, post_visit_notes, sentiment, completed_at, created_at) VALUES
('44444444-4444-4444-4444-444444444425','33333333-3333-3333-3333-333333333325','11111111-1111-1111-1111-111111111101',
 CURRENT_DATE - 5, '11:30', 'Completed',
 'Self + Spouse + Parents',
 ARRAY['decision-maker','possession'],
 'Liked the layout. Joint family wants to consult uncle in Bangalore before deciding. Concerned about Dec 2027 possession; needs documentation on penalty clauses.',
 'positive', now() - interval '5 days', now() - interval '8 days'),

-- Visit 2 (Lead 26 — Visited, Oceanic 4BHK, sea-view feedback)
('44444444-4444-4444-4444-444444444426','33333333-3333-3333-3333-333333333326','11111111-1111-1111-1111-111111111102',
 CURRENT_DATE - 4, '17:30', 'Completed',
 'Self + Spouse',
 ARRAY['price','configuration'],
 'Loved the sea view from 28F+. Asked for revised pricing on corner units. Wants 4BHK with separate study; pure 4BHK feels tight.',
 'positive', now() - interval '4 days', now() - interval '7 days'),

-- Visit 3 (Lead 27 — Negotiation, Greens of Kharadi)
('44444444-4444-4444-4444-444444444427','33333333-3333-3333-3333-333333333327','11111111-1111-1111-1111-111111111103',
 CURRENT_DATE - 9, '10:00', 'Completed',
 'Self + Spouse',
 ARRAY['price','financing'],
 'Negotiating discount on floor-rise. Wants assistance switching loan from SBI to lower-rate option.',
 'neutral', now() - interval '9 days', now() - interval '11 days'),

-- Visit 4 (Lead 28 — Booked, Verdant)
('44444444-4444-4444-4444-444444444428','33333333-3333-3333-3333-333333333328','11111111-1111-1111-1111-111111111104',
 CURRENT_DATE - 13, '16:00', 'Completed',
 'Self + Spouse',
 ARRAY[]::text[],
 'Booking confirmed at visit. Selected E-1204, 3BHK 1380 sqft, south-east facing.',
 'positive', now() - interval '13 days', now() - interval '15 days'),

-- Visit 5 (Lead 29 — Booked, Kharadi)
('44444444-4444-4444-4444-444444444429','33333333-3333-3333-3333-333333333329','11111111-1111-1111-1111-111111111103',
 CURRENT_DATE - 11, '11:30', 'Completed',
 'Self + Spouse',
 ARRAY[]::text[],
 'Booking confirmed within 48h of visit. Selected B-805, 3BHK 1240 sqft.',
 'positive', now() - interval '11 days', now() - interval '13 days'),

-- Upcoming scheduled visits (Lead 12, 23, 24)
('44444444-4444-4444-4444-444444444412','33333333-3333-3333-3333-333333333312','11111111-1111-1111-1111-111111111104',
 CURRENT_DATE + 2, '11:30', 'Confirmed','Self + Spouse',ARRAY[]::text[],NULL,NULL,NULL, now() - interval '3 days'),
('44444444-4444-4444-4444-444444444423','33333333-3333-3333-3333-333333333323','11111111-1111-1111-1111-111111111103',
 CURRENT_DATE + 3, '10:00', 'Scheduled','Self + Spouse + Parents',ARRAY[]::text[],NULL,NULL,NULL, now() - interval '3 days'),
('44444444-4444-4444-4444-444444444424','33333333-3333-3333-3333-333333333324','11111111-1111-1111-1111-111111111104',
 CURRENT_DATE + 4, '16:00', 'Scheduled','Self + Spouse',ARRAY[]::text[],NULL,NULL,NULL, now() - interval '2 days');

-- Bookings (2) ---------------------------------------------------------------
INSERT INTO bookings (id, lead_id, property_id, visit_id, unit_number, booking_amount, booking_date,
  source_attribution, attribution_chain) VALUES
('55555555-5555-5555-5555-555555555528','33333333-3333-3333-3333-333333333328','11111111-1111-1111-1111-111111111104',
 '44444444-4444-4444-4444-444444444428','E-1204', 17500000, CURRENT_DATE - 13,
 'Meta Ad > Score 94 > Visit > Booking',
 '{"source":"Meta Ad","campaign_id":"22222222-2222-2222-2222-222222222209","fit_score":93,"urgency_score":95,"visit_id":"44444444-4444-4444-4444-444444444428"}'::jsonb),
('55555555-5555-5555-5555-555555555529','33333333-3333-3333-3333-333333333329','11111111-1111-1111-1111-111111111103',
 '44444444-4444-4444-4444-444444444429','B-805', 13200000, CURRENT_DATE - 11,
 'CP Referral > Score 92 > Visit > Booking',
 '{"source":"CP Referral","campaign_id":null,"fit_score":91,"urgency_score":94,"visit_id":"44444444-4444-4444-4444-444444444429"}'::jsonb);

-- ============================================================================
-- F. MESSAGES — mix of approved/sent, pending_approval, inbound replies
-- This populates the Manager Approval queue + lead detail conversation view.
-- ============================================================================
INSERT INTO messages (lead_id, direction, template_name, content, language, status,
  drafted_by, approved_by, approved_at, sent_at, created_at) VALUES

-- Lead 01: qualifier + sent acknowledgment
('33333333-3333-3333-3333-333333333301','outbound','intake_qualifier',
 'Hi Rahul, thanks for the interest in Skyline Residences. Quick check: 2BHK or 3BHK, and what is your move-in timeline? Reply 1 for 2BHK / 2 for 3BHK.',
 'en','sent','gemini-2.5-flash','priya@dev.in', now() - interval '6 days 23 hours 58 minutes', now() - interval '6 days 23 hours 58 minutes', now() - interval '6 days 23 hours 59 minutes'),
('33333333-3333-3333-3333-333333333301','inbound',NULL,'3BHK. Want to shift in 2 months. Loan pre-approved with ICICI.',
 'en','delivered',NULL,NULL,NULL,NULL, now() - interval '6 days 23 hours 50 minutes'),
('33333333-3333-3333-3333-333333333301','outbound','site_visit_invite',
 'Great, Rahul. Skyline 3BHK fits your budget. We have slots Sat 10:00 / 11:30 and Sun 16:00. Which works?',
 'en','sent','gemini-2.5-flash','priya@dev.in', now() - interval '6 days 23 hours 45 minutes', now() - interval '6 days 23 hours 45 minutes', now() - interval '6 days 23 hours 46 minutes'),

-- Lead 21: PENDING APPROVAL (the demo "wow" — manager clicks A to approve)
('33333333-3333-3333-3333-333333333321','outbound','site_visit_invite',
 'Hi Smita, Oceanic Heights 2BHK in your 3-3.5Cr range has 28F+ sea-view units. Possession is Jun 2026 (13 months). I can hold Sat 16:00 or Sun 11:30 for a site visit. Which works for you?',
 'en','pending_approval','gemini-2.5-flash',NULL,NULL,NULL, now() - interval '5 minutes'),

-- Lead 22: PENDING APPROVAL
('33333333-3333-3333-3333-333333333322','outbound','site_visit_invite',
 'Hi Anant, thanks to Mohit for the intro. Whitefield Verdant 3BHK (1380 sqft) at 1.7Cr is a clean fit. Site visit Saturday 11:30 or Sunday 10:00?',
 'en','pending_approval','gemini-2.5-flash',NULL,NULL,NULL, now() - interval '3 minutes'),

-- Lead 19: PENDING APPROVAL (Hindi)
('33333333-3333-3333-3333-333333333319','outbound','intake_qualifier',
 'नमस्ते Imran जी, Greens of Kharadi में 2BHK 78-95 लाख रेंज में है। 70 लाख बजट के लिए Wagholi Springs भी देख सकते हैं। दोनों के brochures भेज दूं?',
 'hi','pending_approval','gemini-2.5-flash',NULL,NULL,NULL, now() - interval '2 minutes'),

-- Lead 23: visit confirmation + reminders
('33333333-3333-3333-3333-333333333323','outbound','visit_confirmation',
 'Hi Harish, your visit at Greens of Kharadi is confirmed: Sat 10:00. Pin: https://maps.app/g/kharadi-greens. Reply STOP to opt-out.',
 'en','sent','gemini-2.5-flash','priya@dev.in', now() - interval '2 days 23 hours 30 minutes', now() - interval '2 days 23 hours 30 minutes', now() - interval '2 days 23 hours 32 minutes'),

-- Lead 25: post-visit recap
('33333333-3333-3333-3333-333333333325','outbound','post_visit_recap',
 'Hi Geeta, thanks for visiting Skyline. Sharing the Dec 2027 possession clause with penalty terms here: [pdf]. Happy to set a call once your Bangalore consult is done.',
 'en','sent','gemini-2.5-flash','priya@dev.in', now() - interval '4 days 12 hours', now() - interval '4 days 12 hours', now() - interval '4 days 12 hours 2 minutes'),

-- Lead 28: booking thank-you
('33333333-3333-3333-3333-333333333328','outbound','booking_thanks',
 'Welcome to Whitefield Verdant family, Deepak. Unit E-1204 is yours. Onboarding pack and registration steps coming up tomorrow.',
 'en','sent','gemini-2.5-flash','priya@dev.in', now() - interval '13 days', now() - interval '13 days', now() - interval '13 days 1 minute'),

-- Lead 30: lost recovery (rejected by manager — too pushy)
('33333333-3333-3333-3333-333333333330','outbound','rescue_attempt',
 'Hi Faisal, we revised Oceanic Heights possession timeline. Worth a 10-min call this week?',
 'en','rejected','gemini-2.5-flash',NULL,NULL,NULL, now() - interval '18 days');

UPDATE messages
SET rejection_reason = 'Too pushy for a lost lead; needs softer reactivation tone'
WHERE lead_id = '33333333-3333-3333-3333-333333333330' AND status = 'rejected';

-- ============================================================================
-- G. AGENT_LOGS — populate Command Center activity feed
-- ============================================================================
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, lead_id, duration_ms, status, created_at) VALUES
('Lead Agent','scored_lead','Lead 33...301 intake reply','fit=92 urgency=95 action=Schedule site visit','33333333-3333-3333-3333-333333333301',1840,'ok', now() - interval '6 days 23 hours 50 minutes'),
('Nurture Agent','drafted_message','Lead 33...301 LEAD_SCORED event','site_visit_invite drafted EN, 312 chars','33333333-3333-3333-3333-333333333301',1120,'ok', now() - interval '6 days 23 hours 46 minutes'),
('Conversion Agent','extracted_objections','Visit 44...425 notes (217 chars)','objections=[decision-maker, possession] sentiment=positive','33333333-3333-3333-3333-333333333325',1390,'ok', now() - interval '5 days'),
('Lead Agent','scored_lead','Lead 33...321 reply with budget+timeline','fit=92 urgency=88 action=Schedule site visit','33333333-3333-3333-3333-333333333321',1750,'ok', now() - interval '5 hours 50 minutes'),
('Nurture Agent','drafted_message','Lead 33...321 LEAD_SCORED event','site_visit_invite drafted EN','33333333-3333-3333-3333-333333333321',1080,'ok', now() - interval '5 minutes'),
('Nurture Agent','drafted_message','Lead 33...319 LEAD_SCORED event (HI)','intake_qualifier drafted HI','33333333-3333-3333-3333-333333333319',1180,'ok', now() - interval '2 minutes'),
('Lead Agent','escalated','Lead 33...304 budget 2.5Cr','VIP threshold exceeded; routed to Priya','33333333-3333-3333-3333-333333333304',420,'warning', now() - interval '3 days 23 hours 45 minutes'),
('Lead Agent','escalated','Lead 33...305 ambiguous text','Confidence 38% < 50% threshold','33333333-3333-3333-3333-333333333305',310,'warning', now() - interval '5 hours 50 minutes'),
('Conversion Agent','booking_recorded','Lead 33...328 unit E-1204','Attribution chain: Meta Ad > Score 94 > Visit > Booking','33333333-3333-3333-3333-333333333328',680,'ok', now() - interval '13 days'),
('Ad Agent','simulated_campaign','Property 11...102 launched on Meta','impressions=510000 leads=286 cpl=1329','33333333-3333-3333-3333-333333333307',520,'ok', now() - interval '21 days');

-- ============================================================================
-- H. AGENT_EVENTS — populate event bus history (PRD §5)
-- ============================================================================
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, property_id, processed, created_at) VALUES
('LISTING_SYNCED','Listing Agent','{"property_id":"11111111-1111-1111-1111-111111111101","fields_extracted":11}'::jsonb, NULL, '11111111-1111-1111-1111-111111111101', true, now() - interval '21 days'),
('LEAD_RECEIVED','System','{"lead_id":"33333333-3333-3333-3333-333333333301","source":"Meta Ad"}'::jsonb, '33333333-3333-3333-3333-333333333301', NULL, true, now() - interval '7 days'),
('LEAD_SCORED','Lead Agent','{"lead_id":"33333333-3333-3333-3333-333333333301","overall_score":93}'::jsonb, '33333333-3333-3333-3333-333333333301', NULL, true, now() - interval '6 days 23 hours 50 minutes'),
('MESSAGE_SENT','Nurture Agent','{"lead_id":"33333333-3333-3333-3333-333333333301","template":"site_visit_invite"}'::jsonb, '33333333-3333-3333-3333-333333333301', NULL, true, now() - interval '6 days 23 hours 45 minutes'),
('VISIT_SCHEDULED','Conversion Agent','{"lead_id":"33333333-3333-3333-3333-333333333323","date":"+3d","time":"10:00"}'::jsonb, '33333333-3333-3333-3333-333333333323', '11111111-1111-1111-1111-111111111103', false, now() - interval '3 days'),
('VISIT_COMPLETED','Conversion Agent','{"visit_id":"44444444-4444-4444-4444-444444444425","objections":["decision-maker","possession"]}'::jsonb, '33333333-3333-3333-3333-333333333325', '11111111-1111-1111-1111-111111111101', true, now() - interval '5 days'),
('BOOKING_MADE','Conversion Agent','{"lead_id":"33333333-3333-3333-3333-333333333328","property_id":"11111111-1111-1111-1111-111111111104","amount":17500000}'::jsonb, '33333333-3333-3333-3333-333333333328', '11111111-1111-1111-1111-111111111104', true, now() - interval '13 days'),
('ESCALATION_TRIGGERED','Lead Agent','{"lead_id":"33333333-3333-3333-3333-333333333304","reason":"vip_budget"}'::jsonb, '33333333-3333-3333-3333-333333333304', NULL, false, now() - interval '3 days 23 hours 45 minutes'),
('ESCALATION_TRIGGERED','Lead Agent','{"lead_id":"33333333-3333-3333-3333-333333333305","reason":"low_confidence"}'::jsonb, '33333333-3333-3333-3333-333333333305', NULL, false, now() - interval '5 hours 50 minutes');
