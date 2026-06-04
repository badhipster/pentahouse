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
