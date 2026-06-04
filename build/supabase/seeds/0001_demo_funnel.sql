-- ============================================================================
-- Pentahouse demo funnel seed
--
-- Inserts 10 leads spread across all funnel stages with realistic Pune-market
-- properties, pre-computed scores, drafted/sent messages, scheduled+completed
-- visits, one booking, and a full agent_events trail.
--
-- Bypasses the live Gemini scoring chain (which hits 429 rate limits on free
-- tier) — gives the sales head a coherent journey to navigate from day 1.
--
-- IDEMPOTENT: safe to re-run. Uses fixed UUID prefixes for demo rows so
-- repeated runs won't duplicate.
--
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/grfqzwozyhuysincordf/sql/new
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. CLEANUP — wipe any prior demo seed rows so re-runs are idempotent
-- ---------------------------------------------------------------------------
DELETE FROM agent_logs WHERE output_summary LIKE 'DEMO_SEED%';
DELETE FROM agent_events WHERE payload->>'demo_seed' = 'phase_b';
DELETE FROM bookings WHERE source_attribution LIKE 'DEMO_SEED%';
DELETE FROM visits WHERE post_visit_notes LIKE 'DEMO_SEED%' OR next_action LIKE 'DEMO_SEED%';
DELETE FROM messages WHERE content LIKE '%DEMO_SEED%' OR template_name LIKE 'demo_%';
DELETE FROM lead_scores WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE '%@demo.pentahouse');
DELETE FROM leads WHERE email LIKE '%@demo.pentahouse';

-- ---------------------------------------------------------------------------
-- 1. PICK 10 PUNE PROPERTIES for the demo (real inventory)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE demo_props ON COMMIT DROP AS
SELECT
  id          AS property_id,
  project_name,
  locality,
  config_mix,
  price_min_inr_lakhs,
  price_max_inr_lakhs,
  ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
FROM properties
WHERE city = 'Pune' AND status = 'Active'
LIMIT 10;

-- If we have < 10 Pune properties, top up from any city
INSERT INTO demo_props (property_id, project_name, locality, config_mix, price_min_inr_lakhs, price_max_inr_lakhs, rn)
SELECT id, project_name, locality, config_mix, price_min_inr_lakhs, price_max_inr_lakhs,
       (SELECT COALESCE(MAX(rn), 0) FROM demo_props) + ROW_NUMBER() OVER (ORDER BY created_at)
FROM properties
WHERE id NOT IN (SELECT property_id FROM demo_props)
LIMIT (10 - (SELECT COUNT(*) FROM demo_props));

-- ---------------------------------------------------------------------------
-- 2. INSERT 10 LEADS — spread across all stages
-- ---------------------------------------------------------------------------
WITH lead_data AS (
  SELECT * FROM (VALUES
    -- (slot, name, phone, email, source, locality, config, budget, purpose, timeline, loan, family, decision, intent_count, stage, age_hours)
    (1,  'Aarav Mehta',       '+919876500001', 'aarav.mehta@demo.pentahouse',       'Meta Ad',     'Hinjewadi',  '3BHK', 140, 'buy',    'Immediately', 'Pre-approved', 4, 'Self+Spouse', 9, 'New',             1),
    (2,  'Priya Iyer',         '+919876500002', 'priya.iyer@demo.pentahouse',         'Google Ad',   'Wakad',      '2BHK',  95, 'buy',    '3 months',    'Applied',      3, 'Self',         8, 'New',             3),
    (3,  'Rohit Patel',        '+919876500003', 'rohit.patel@demo.pentahouse',        '99acres',     'Baner',      '3BHK', 120, 'buy',    '3 months',    'Pre-approved', 4, 'Self+Spouse', 9, 'Qualified',      28),
    (4,  'Sneha Kulkarni',     '+919876500004', 'sneha.kulkarni@demo.pentahouse',     'Housing.com', 'Kothrud',    '2BHK',  85, 'buy',    '6 months',    'Planning',     3, 'Self+Spouse', 7, 'Qualified',      52),
    (5,  'Vikram Joshi',       '+919876500005', 'vikram.joshi@demo.pentahouse',       'Meta Ad',     'Wagholi',    '3BHK', 110, 'buy',    'Immediately', 'Pre-approved', 4, 'Joint family',9, 'Visit Scheduled', 76),
    (6,  'Anjali Deshmukh',    '+919876500006', 'anjali.deshmukh@demo.pentahouse',    'WhatsApp',    'Magarpatta', '2BHK', 100, 'buy',    '3 months',    'Applied',      3, 'Self+Spouse', 8, 'Visit Scheduled', 80),
    (7,  'Karan Shah',         '+919876500007', 'karan.shah@demo.pentahouse',         'CP Referral', 'Kharadi',    '3BHK', 130, 'buy',    'Immediately', 'Pre-approved', 4, 'Self+Spouse', 9, 'Visited',       124),
    (8,  'Meera Nair',         '+919876500008', 'meera.nair@demo.pentahouse',         'Meta Ad',     'Aundh',      '3BHK', 160, 'buy',    'Immediately', 'Pre-approved', 4, 'Self+Spouse',10, 'Booked',        196),
    (9,  'Sandeep Kumar',      '+919876500009', 'sandeep.kumar@demo.pentahouse',      'Google Ad',   'Koregaon Park','4BHK',60, 'buy',  'Exploring',   'Not sure',     2, 'Self',         3, 'Lost',           4),
    (10, 'Pooja Reddy',        '+919876500010', 'pooja.reddy@demo.pentahouse',        '99acres',     'Hadapsar',   '3BHK', 120, 'buy',    '3 months',    'Pre-approved', 4, 'Self+Spouse', 9, 'Negotiation',   100)
  ) AS t(slot, name, phone, email, source, locality, config, budget, purpose, timeline, loan, family, decision, intent_count, stage, age_hours)
)
INSERT INTO leads (
  id, name, phone, email, source, preferred_city, preferred_locality, preferred_config,
  budget_lakhs, purpose, purchase_timeline, loan_status, family_size, decision_makers,
  intent_fields_count, stage, language, inquiry_text,
  first_response_at, qualified_at, created_at, updated_at
)
SELECT
  -- Deterministic UUIDs for idempotency. Format: 11111111-1111-1111-1111-00000000000N
  ('11111111-1111-1111-1111-' || lpad(ld.slot::text, 12, '0'))::uuid,
  ld.name, ld.phone, ld.email, ld.source, 'Pune', ld.locality, ld.config,
  ld.budget, ld.purpose, ld.timeline, ld.loan, ld.family, ld.decision,
  ld.intent_count, ld.stage, 'en',
  CASE ld.stage
    WHEN 'New' THEN 'Looking for ' || ld.config || ' in ' || ld.locality || ', budget around ' || ld.budget || 'L'
    WHEN 'Lost' THEN 'Just browsing options in Koregaon Park area, not in any rush'
    ELSE 'Need ' || ld.config || ' in ' || ld.locality || ', budget ' || ld.budget || 'L, timeline ' || ld.timeline || ', loan ' || ld.loan
  END,
  CASE WHEN ld.stage IN ('Qualified','Visit Scheduled','Visited','Negotiation','Booked')
       THEN now() - (ld.age_hours - 0.2) * INTERVAL '1 hour' END,
  CASE WHEN ld.stage IN ('Qualified','Visit Scheduled','Visited','Negotiation','Booked')
       THEN now() - (ld.age_hours - 0.1) * INTERVAL '1 hour' END,
  now() - ld.age_hours * INTERVAL '1 hour',
  now() - (ld.age_hours * 0.5) * INTERVAL '1 hour'
FROM lead_data ld;

-- ---------------------------------------------------------------------------
-- 3. INSERT LEAD SCORES — pre-computed, realistic distribution
-- ---------------------------------------------------------------------------
INSERT INTO lead_scores (
  lead_id, fit_score, urgency_score, overall_score, confidence,
  fit_reasons, urgency_reasons, recommended_action,
  matched_property_id,
  scored_by, prompt_version, scored_at
)
SELECT
  l.id,
  s.fit_score, s.urgency_score, s.overall_score, s.confidence,
  s.fit_reasons, s.urgency_reasons, s.recommended_action,
  p.property_id,
  'gemini-2.5-flash', 'lead_scoring.v3.3_rag_defensive',
  l.created_at + INTERVAL '12 seconds'
FROM (VALUES
  (1,  87, 92, 89, 82, ARRAY['3BHK matches Hinjewadi inventory','Budget 1.4Cr aligns with mid-premium tier','Pre-approved loan reduces friction'], ARRAY['Immediate timeline','Pre-approved loan','Tight 30-day close window'], 'Schedule site visit'),
  (2,  74, 68, 71, 75, ARRAY['2BHK Wakad has 4 active inventory matches','Budget realistic for sub-1Cr band'],                ARRAY['3-month timeline is firm','Loan applied'],                                                  'Send brochure'),
  (3,  68, 72, 70, 78, ARRAY['3BHK Baner premium tier matches budget','Self+spouse decision is fast'],                       ARRAY['3-month window','Pre-approved loan'],                                                       'Schedule site visit'),
  (4,  72, 58, 65, 70, ARRAY['2BHK Kothrud established locality','Family decision indicates serious intent'],                ARRAY['6-month timeline','Planning loan, not yet applied'],                                        'Long-term nurture'),
  (5,  85, 94, 89, 86, ARRAY['3BHK Wagholi emerging corridor match','Joint family budget signals long-stay intent'],         ARRAY['Immediate timeline','Pre-approved loan','Joint family aligned'],                            'Schedule site visit'),
  (6,  78, 76, 77, 80, ARRAY['2BHK Magarpatta IT proximity match','Budget aligns with rental yield investor profile'],       ARRAY['3-month timeline','Loan applied'],                                                          'Schedule site visit'),
  (7,  88, 95, 91, 90, ARRAY['3BHK Kharadi premium match','CP referral indicates pre-qualified'],                            ARRAY['Immediate timeline','Pre-approved','CP introduced'],                                        'Schedule site visit'),
  (8,  92, 96, 94, 92, ARRAY['3BHK Aundh ultra-premium match','Budget headroom for upgrades'],                                ARRAY['Immediate timeline','Pre-approved','Family decision'],                                      'Schedule site visit'),
  (9,  18, 12, 15, 45, ARRAY['Budget 60L mismatches Koregaon Park 4BHK (3.5-6Cr range)','Likely browsing, not buying'],      ARRAY['Exploring timeline','Loan not sure'],                                                       'Disqualify'),
  (10, 82, 78, 80, 84, ARRAY['3BHK Hadapsar matches IT-corridor demand','Joint decision-makers aligned'],                    ARRAY['3-month timeline','Pre-approved loan','Negotiation phase active'],                          'Schedule site visit')
) AS s(slot, fit_score, urgency_score, overall_score, confidence, fit_reasons, urgency_reasons, recommended_action)
JOIN leads l ON l.id = ('11111111-1111-1111-1111-' || lpad(s.slot::text, 12, '0'))::uuid
JOIN demo_props p ON p.rn = s.slot;

-- ---------------------------------------------------------------------------
-- 4. INSERT MESSAGES — only for leads beyond 'New' stage
-- ---------------------------------------------------------------------------
WITH msg_data AS (
  SELECT * FROM (VALUES
    -- (lead_slot, direction, template, status, content_en, mins_after_lead)
    (3,  'outbound', 'intake_qualifier', 'sent',      'Namaste Rohit, thanks for your interest in Baner 3BHK options. I have 3 matching projects in 1.1-1.3Cr range with ready possession. When would be a good time for a quick call? — Team Pentahouse',  10),
    (4,  'outbound', 'intake_qualifier', 'read',      'Hi Sneha, thanks for reaching out about Kothrud 2BHK. Sharing 2 options matching your budget. Would you prefer to discuss over a call or visit the site this weekend?',                              12),
    (4,  'inbound',  NULL,               'delivered', 'Weekend visit works. Saturday morning preferred. Please confirm.',                                                                                                                                    240),
    (5,  'outbound', 'site_visit_invite','sent',      'Vikram ji, Wagholi 3BHK site visit confirmed for Saturday 11 AM. Address + directions in next message. Sales head will accompany.',                                                                    15),
    (5,  'inbound',  NULL,               'delivered', 'Confirmed for Saturday 11 AM. Please share the location pin.',                                                                                                                                          90),
    (6,  'outbound', 'site_visit_invite','sent',      'Hello Anjali, Magarpatta 2BHK visit scheduled for Sunday 10 AM. Looking forward to showing you the project.',                                                                                          20),
    (7,  'outbound', 'site_visit_invite','sent',      'Karan, Kharadi 3BHK site visit completed Thursday. Sharing the brochure + payment plan as discussed.',                                                                                                  15),
    (7,  'inbound',  NULL,               'delivered', 'Visit was great. Need to discuss with my wife. Will revert by Monday.',                                                                                                                                 1500),
    (7,  'outbound', 'post_visit_recap', 'sent',      'Thanks for visiting Karan. Recap: 3BHK 1340 sqft, possession Q2 2027, current price 1.28Cr all-in. Booking amount 5L. Floor plans attached.',                                                          1530),
    (8,  'outbound', 'site_visit_invite','sent',      'Meera, Aundh 3BHK visit confirmed. Sales head will personally guide you through the showroom.',                                                                                                         30),
    (8,  'inbound',  NULL,               'delivered', 'Visit was excellent. Proceeding with booking. Sharing PAN + Aadhaar details separately.',                                                                                                              4800),
    (8,  'outbound', 'post_visit_recap', 'sent',      'Wonderful Meera. Booking form attached. 5L token amount, balance per agreed schedule. Welcome to the family.',                                                                                          4830),
    (10, 'outbound', 'site_visit_invite','sent',      'Pooja, Hadapsar 3BHK visit went well. Sharing the revised pricing with the corner-unit discount we discussed.',                                                                                         20),
    (10, 'inbound',  NULL,               'delivered', 'Revised pricing acceptable. Need 2 more days to align with parents on token timing.',                                                                                                                  1800),
    (10, 'outbound', 'post_visit_recap', 'sent',      'No problem Pooja. Holding the corner unit till Thursday EOD. Booking docs ready when you are.',                                                                                                         1860)
  ) AS m(lead_slot, direction, template, status, content_en, mins_after_lead)
)
INSERT INTO messages (lead_id, channel, direction, template_name, content, language, status, created_at)
SELECT
  ('11111111-1111-1111-1111-' || lpad(m.lead_slot::text, 12, '0'))::uuid,
  'WhatsApp', m.direction, m.template, m.content_en, 'en', m.status,
  (SELECT created_at FROM leads WHERE id = ('11111111-1111-1111-1111-' || lpad(m.lead_slot::text, 12, '0'))::uuid) + (m.mins_after_lead * INTERVAL '1 minute')
FROM msg_data m;

-- ---------------------------------------------------------------------------
-- 5. INSERT VISITS — scheduled, completed, cancelled
-- ---------------------------------------------------------------------------
WITH visit_data AS (
  SELECT * FROM (VALUES
    -- (lead_slot, status, days_offset, time_str, attendees, objections, sentiment, notes, next_action)
    (5,  'Scheduled', 2,  '11:00',  'Self+Spouse',          ARRAY[]::TEXT[],                                          NULL,       NULL,                                                                                                            'Confirm location pin 1 day prior'),
    (6,  'Confirmed', 3,  '10:00',  'Self+Spouse',          ARRAY[]::TEXT[],                                          NULL,       NULL,                                                                                                            'Send floor plans before visit'),
    (7,  'Completed', -1, '16:00',  'Self+Spouse+Father',   ARRAY['possession_timeline','decision_maker'],            'positive', 'Visit went smoothly. Liked the layout. Father wants to consult on possession timeline. Following up Monday.', 'Follow up post family discussion'),
    (8,  'Completed', -3, '12:00',  'Self+Spouse',          ARRAY['negotiation_completed'],                            'positive', 'Booking confirmed. Token amount paid. Documentation in progress.',                                              'Coordinate final agreement signing'),
    (10, 'Completed', -2, '14:30',  'Self+Spouse+Parents',  ARRAY['price','possession_timeline'],                      'positive', 'Family aligned on the unit. Negotiating corner-unit premium. Pricing revised by 3%.',                          'Hold corner unit till Thursday')
  ) AS v(lead_slot, status, days_offset, time_str, attendees, objections, sentiment, notes, next_action)
)
INSERT INTO visits (lead_id, property_id, scheduled_date, scheduled_time, status, attendees, objections, post_visit_notes, next_action, sentiment, created_at)
SELECT
  ('11111111-1111-1111-1111-' || lpad(v.lead_slot::text, 12, '0'))::uuid,
  (SELECT matched_property_id FROM lead_scores WHERE lead_id = ('11111111-1111-1111-1111-' || lpad(v.lead_slot::text, 12, '0'))::uuid),
  (CURRENT_DATE + v.days_offset),
  v.time_str,
  v.status, v.attendees, v.objections,
  CASE WHEN v.notes IS NULL THEN NULL ELSE 'DEMO_SEED: ' || v.notes END,
  CASE WHEN v.next_action IS NULL THEN NULL ELSE 'DEMO_SEED: ' || v.next_action END,
  v.sentiment,
  (SELECT created_at FROM leads WHERE id = ('11111111-1111-1111-1111-' || lpad(v.lead_slot::text, 12, '0'))::uuid) + INTERVAL '2 hours'
FROM visit_data v;

-- ---------------------------------------------------------------------------
-- 6. INSERT BOOKING — Meera Nair's Aundh 3BHK
-- ---------------------------------------------------------------------------
INSERT INTO bookings (
  lead_id, property_id, visit_id, unit_number, booking_amount,
  booking_date, source_attribution, attribution_chain, cost_per_booking, created_at
)
SELECT
  l.id,
  ls.matched_property_id,
  v.id,
  'B-1204',
  500000,  -- 5L token in INR
  CURRENT_DATE - 2,
  'DEMO_SEED: Meta Ad > Score 94 > Visit > Booking',
  jsonb_build_object('source', 'Meta Ad', 'score', 94, 'visit_id', v.id, 'campaign', 'aundh_premium_q2'),
  18500,
  l.created_at + INTERVAL '7 days'
FROM leads l
JOIN lead_scores ls ON ls.lead_id = l.id
JOIN visits v ON v.lead_id = l.id
WHERE l.id = '11111111-1111-1111-1111-000000000008';

-- ---------------------------------------------------------------------------
-- 7. INSERT AGENT EVENTS — the activity feed
-- ---------------------------------------------------------------------------
-- LEAD_RECEIVED for every lead
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, created_at)
SELECT 'LEAD_RECEIVED', 'Lead Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'source', l.source, 'name', l.name),
       l.id, l.created_at
FROM leads l WHERE l.email LIKE '%@demo.pentahouse';

-- LEAD_SCORED for every lead
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, created_at)
SELECT 'LEAD_SCORED', 'Lead Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'overall_score', ls.overall_score, 'recommended_action', ls.recommended_action, 'matched_property', ls.matched_property_name),
       l.id, ls.created_at
FROM leads l JOIN lead_scores ls ON ls.lead_id = l.id WHERE l.email LIKE '%@demo.pentahouse';

-- MESSAGE_SENT for every outbound message
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, created_at)
SELECT 'MESSAGE_SENT', 'Nurture Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'template', m.template_name, 'channel', m.channel, 'preview', LEFT(m.content, 80)),
       m.lead_id, m.created_at
FROM messages m JOIN leads l ON l.id = m.lead_id
WHERE l.email LIKE '%@demo.pentahouse' AND m.direction = 'outbound';

-- VISIT_SCHEDULED for each scheduled/confirmed visit
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, property_id, created_at)
SELECT 'VISIT_SCHEDULED', 'Conversion Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'date', v.scheduled_date, 'time', v.scheduled_time, 'attendees', v.attendees),
       v.lead_id, v.property_id, v.created_at
FROM visits v JOIN leads l ON l.id = v.lead_id
WHERE l.email LIKE '%@demo.pentahouse' AND v.status IN ('Scheduled', 'Confirmed', 'Completed');

-- VISIT_COMPLETED for completed visits
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, property_id, created_at)
SELECT 'VISIT_COMPLETED', 'Conversion Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'sentiment', v.sentiment, 'objections', v.objections, 'next_action', v.next_action),
       v.lead_id, v.property_id, v.created_at + INTERVAL '3 hours'
FROM visits v JOIN leads l ON l.id = v.lead_id
WHERE l.email LIKE '%@demo.pentahouse' AND v.status = 'Completed';

-- BOOKING_MADE for the one booking
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, property_id, created_at)
SELECT 'BOOKING_MADE', 'Conversion Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'amount_inr', b.booking_amount, 'unit', b.unit_number, 'attribution', b.attribution_chain),
       b.lead_id, b.property_id, b.created_at
FROM bookings b JOIN leads l ON l.id = b.lead_id
WHERE l.email LIKE '%@demo.pentahouse';

-- ESCALATION_TRIGGERED for the disqualified lead (Sandeep)
INSERT INTO agent_events (event_name, source_agent, payload, lead_id, created_at)
SELECT 'ESCALATION_TRIGGERED', 'Lead Agent',
       jsonb_build_object('demo_seed', 'phase_b', 'reason', 'low_confidence', 'overall_score', 15, 'note', 'Budget 60L mismatches 4BHK Koregaon Park range. Suggested disqualification.'),
       l.id, l.created_at + INTERVAL '15 seconds'
FROM leads l WHERE l.id = '11111111-1111-1111-1111-000000000009';

-- ---------------------------------------------------------------------------
-- 8. INSERT AGENT LOGS — populates the Agent Observatory immediately
-- (demo_props temp table still in scope here, before final COMMIT)
-- ---------------------------------------------------------------------------

-- Lead Agent scoring runs (one per lead)
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, lead_id, duration_ms, status, created_at)
SELECT
  'Lead Agent',
  'score_lead',
  'Inquiry: ' || LEFT(l.inquiry_text, 60),
  'DEMO_SEED: Scored ' || ls.overall_score || ' (' || ls.recommended_action || ')',
  l.id,
  (1200 + (ABS(HASHTEXT(l.id::text)) % 1800))::integer,
  CASE WHEN ls.overall_score >= 30 THEN 'ok' ELSE 'warning' END,
  ls.scored_at
FROM leads l
JOIN lead_scores ls ON ls.lead_id = l.id
WHERE l.email LIKE '%@demo.pentahouse';

-- Nurture Agent drafting runs (one per outbound message)
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, lead_id, duration_ms, status, created_at)
SELECT
  'Nurture Agent',
  'draft_message',
  'Template: ' || COALESCE(m.template_name, 'auto'),
  'DEMO_SEED: Drafted ' || COALESCE(m.template_name, 'message') || ' (' || LEFT(m.content, 50) || '...)',
  m.lead_id,
  (800 + (ABS(HASHTEXT(m.id::text)) % 1200))::integer,
  'ok',
  m.created_at - INTERVAL '5 seconds'
FROM messages m
JOIN leads l ON l.id = m.lead_id
WHERE l.email LIKE '%@demo.pentahouse' AND m.direction = 'outbound';

-- Conversion Agent objection-extraction runs (one per completed visit)
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, lead_id, duration_ms, status, created_at)
SELECT
  'Conversion Agent',
  'extract_objections',
  'Visit outcome: ' || v.status || ', sentiment=' || COALESCE(v.sentiment, 'unknown'),
  'DEMO_SEED: Extracted ' || COALESCE(array_length(v.objections, 1), 0) || ' objections (' || COALESCE(v.sentiment, 'neutral') || ')',
  v.lead_id,
  (1400 + (ABS(HASHTEXT(v.id::text)) % 1100))::integer,
  'ok',
  v.created_at + INTERVAL '3 hours'
FROM visits v
JOIN leads l ON l.id = v.lead_id
WHERE l.email LIKE '%@demo.pentahouse' AND v.status = 'Completed';

-- Ad Agent campaign-generation runs (3 channels per active property used in demo)
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, property_id, duration_ms, status, created_at)
SELECT
  'Ad Agent',
  'generate_campaign_' || ch.channel,
  'Property: ' || dp.project_name,
  'DEMO_SEED: Drafted ' || ch.channel || ' creative for ' || dp.project_name,
  dp.property_id,
  (2000 + (ABS(HASHTEXT(dp.property_id::text || ch.channel)) % 1500))::integer,
  'ok',
  now() - (dp.rn * INTERVAL '2 hours')
FROM demo_props dp
CROSS JOIN (VALUES ('meta'), ('google'), ('portal')) AS ch(channel)
WHERE dp.rn <= 3;

-- Listing Agent extraction runs (one per top demo property)
INSERT INTO agent_logs (agent_name, action, input_summary, output_summary, property_id, duration_ms, status, created_at)
SELECT
  'Listing Agent',
  'extract_listing',
  'RERA source: ' || dp.project_name,
  'DEMO_SEED: Extracted ' || dp.project_name || ' (' || dp.locality || ')',
  dp.property_id,
  (3000 + (ABS(HASHTEXT(dp.property_id::text)) % 2000))::integer,
  'ok',
  now() - INTERVAL '6 hours' - (dp.rn * INTERVAL '15 minutes')
FROM demo_props dp
WHERE dp.rn <= 5;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION — confirms what landed
-- ---------------------------------------------------------------------------
SELECT 'leads'         AS table_name, COUNT(*) AS demo_rows FROM leads         WHERE email LIKE '%@demo.pentahouse'
UNION ALL
SELECT 'lead_scores',  COUNT(*) FROM lead_scores  WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE '%@demo.pentahouse')
UNION ALL
SELECT 'messages',     COUNT(*) FROM messages     WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE '%@demo.pentahouse')
UNION ALL
SELECT 'visits',       COUNT(*) FROM visits       WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE '%@demo.pentahouse')
UNION ALL
SELECT 'bookings',     COUNT(*) FROM bookings     WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE '%@demo.pentahouse')
UNION ALL
SELECT 'agent_events', COUNT(*) FROM agent_events WHERE payload->>'demo_seed' = 'phase_b'
UNION ALL
SELECT 'agent_logs',   COUNT(*) FROM agent_logs   WHERE output_summary LIKE 'DEMO_SEED%'
ORDER BY table_name;
