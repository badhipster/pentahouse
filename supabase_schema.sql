-- ============================================================================
-- Real Estate Marketing & Conversion Intelligence Agent
-- Supabase schema (PostgreSQL 15+)
-- Source of truth: PRD v1.0 (2026-05-22) + Implementation Plan §3
-- Capstone: Product Space Advanced AI, Cohort 11
-- ============================================================================
-- HOW TO APPLY:
--   1. Create a new Supabase project (free tier).
--   2. Open SQL Editor → New Query → paste this file → Run.
--   3. Apply seed_properties.sql, seed_campaigns.sql, seed_leads.sql in that order.
--   4. Open Table Editor to verify rows.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- Shared helper: updated_at touch --------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name      TEXT NOT NULL,
  developer         TEXT,
  city              TEXT NOT NULL CHECK (city IN ('Delhi NCR','Mumbai','Pune','Bangalore')),
  locality          TEXT,
  config            TEXT,                         -- "2BHK, 3BHK, 4BHK"
  price_min_lakhs   NUMERIC,
  price_max_lakhs   NUMERIC,
  carpet_area_sqft  TEXT,                         -- "650-1100"
  rera_number       TEXT UNIQUE,
  possession_date   TEXT,                         -- "Dec 2027"
  status            TEXT NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Sold Out','Upcoming')),
  amenities         TEXT[] DEFAULT '{}',
  highlights        TEXT[] DEFAULT '{}',          -- USP bullets used by Nurture Agent
  brochure_url      TEXT,
  image_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_city_idx        ON properties(city);
CREATE INDEX IF NOT EXISTS properties_status_idx      ON properties(status);
CREATE INDEX IF NOT EXISTS properties_price_min_idx   ON properties(price_min_lakhs);

DROP TRIGGER IF EXISTS properties_touch ON properties;
CREATE TRIGGER properties_touch BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  source              TEXT,                       -- "99acres","Housing.com","Meta Ad","Google Ad","WhatsApp","CP Referral","Walk-in"
  campaign_id         UUID,                       -- FK added after campaigns table
  inquiry_text        TEXT,
  interested_project  TEXT,
  -- Intent fields (Story 1)
  purpose             TEXT CHECK (purpose IS NULL OR purpose IN ('buy','rent','invest','browse','not_sure')),
  budget_lakhs        NUMERIC,
  preferred_config    TEXT,                       -- "3BHK"
  preferred_city      TEXT,
  preferred_locality  TEXT,
  purchase_timeline   TEXT,                       -- "Immediately","3 months","6 months","Exploring"
  loan_status         TEXT,                       -- "Pre-approved","Applied","Planning","Not sure"
  family_size         INTEGER,
  decision_makers     TEXT,                       -- "Self","Self+Spouse","Joint family"
  language            TEXT DEFAULT 'en' CHECK (language IN ('en','hi')),
  intent_fields_count INTEGER NOT NULL DEFAULT 0, -- For PRIMARY metric (≥3 captured)
  stage               TEXT NOT NULL DEFAULT 'New'
                      CHECK (stage IN ('New','Qualified','Visit Scheduled','Visited','Negotiation','Booked','Lost')),
  assigned_to         TEXT,
  first_response_at   TIMESTAMPTZ,                -- Primary metric latency calc
  qualified_at        TIMESTAMPTZ,                -- When intent_fields_count first ≥3
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_stage_idx     ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_source_idx    ON leads(source);
CREATE INDEX IF NOT EXISTS leads_phone_idx     ON leads(phone);
CREATE INDEX IF NOT EXISTS leads_created_idx   ON leads(created_at DESC);

DROP TRIGGER IF EXISTS leads_touch ON leads;
CREATE TRIGGER leads_touch BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 3. lead_scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  fit_score           INTEGER NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  urgency_score       INTEGER NOT NULL CHECK (urgency_score BETWEEN 0 AND 100),
  overall_score       INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  confidence          INTEGER CHECK (confidence BETWEEN 0 AND 100),  -- For Story 7 escalation
  fit_reasons         TEXT[] DEFAULT '{}',
  urgency_reasons     TEXT[] DEFAULT '{}',
  recommended_action  TEXT NOT NULL
                      CHECK (recommended_action IN ('Schedule site visit','Send brochure','Long-term nurture','Disqualify','Escalate to manager')),
  matched_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  scored_by           TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  prompt_version      TEXT,                       -- e.g. "v1.0"
  raw_response        JSONB,                      -- Full Gemini JSON for debugging
  scored_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_scores_lead_idx     ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS lead_scores_overall_idx  ON lead_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS lead_scores_scored_idx   ON lead_scores(scored_at DESC);

-- ============================================================================
-- 4. messages (WhatsApp conversation log + approval queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL DEFAULT 'WhatsApp' CHECK (channel IN ('WhatsApp','Email','SMS')),
  direction       TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  template_name   TEXT,                            -- "acknowledgment","brochure","visit_reminder","post_visit_recap"
  content         TEXT NOT NULL,
  language        TEXT DEFAULT 'en' CHECK (language IN ('en','hi')),
  status          TEXT NOT NULL DEFAULT 'pending_approval'
                  CHECK (status IN ('pending_approval','sent','delivered','read','failed','rejected','draft')),
  rejection_reason TEXT,
  twilio_sid      TEXT,                            -- For delivery tracking
  drafted_by      TEXT,                            -- "gemini-2.5-flash" or manager id
  approved_by     TEXT,                            -- manager id who approved
  approved_at     TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_lead_idx    ON messages(lead_id);
CREATE INDEX IF NOT EXISTS messages_status_idx  ON messages(status);
CREATE INDEX IF NOT EXISTS messages_queue_idx   ON messages(status, created_at) WHERE status = 'pending_approval';

-- ============================================================================
-- 5. visit_slots (Q5 resolution: developer provides bookable slots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  slot_date    DATE NOT NULL,
  slot_time    TEXT NOT NULL,                      -- "10:00","11:30","16:00"
  capacity     INTEGER NOT NULL DEFAULT 2,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Full','Blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, slot_date, slot_time)
);
CREATE INDEX IF NOT EXISTS visit_slots_property_idx ON visit_slots(property_id, slot_date);

-- ============================================================================
-- 6. visits
-- ============================================================================
CREATE TABLE IF NOT EXISTS visits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id       UUID REFERENCES properties(id) ON DELETE SET NULL,
  slot_id           UUID REFERENCES visit_slots(id) ON DELETE SET NULL,
  scheduled_date    DATE,
  scheduled_time    TEXT,
  status            TEXT NOT NULL DEFAULT 'Scheduled'
                    CHECK (status IN ('Scheduled','Confirmed','Completed','No-Show','Rescheduled','Cancelled')),
  attendees         TEXT,                          -- "Self + Spouse"
  objections        TEXT[] DEFAULT '{}',           -- Extracted by Gemini: price/location/configuration/decision-maker/competitor/possession/financing/other
  post_visit_notes  TEXT,
  next_action       TEXT,
  sentiment         TEXT CHECK (sentiment IS NULL OR sentiment IN ('positive','neutral','negative')),
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_2h_sent  BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visits_lead_idx     ON visits(lead_id);
CREATE INDEX IF NOT EXISTS visits_status_idx   ON visits(status);
CREATE INDEX IF NOT EXISTS visits_date_idx     ON visits(scheduled_date);

DROP TRIGGER IF EXISTS visits_touch ON visits;
CREATE TRIGGER visits_touch BEFORE UPDATE ON visits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  visit_id            UUID REFERENCES visits(id) ON DELETE SET NULL,
  unit_number         TEXT,
  booking_amount      NUMERIC,                     -- in INR (full amount, not lakhs)
  booking_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  source_attribution  TEXT,                        -- "Meta Ad > Score 87 > Visit > Booking"
  attribution_chain   JSONB,                       -- Structured references: {source, campaign_id, score, visit_id}
  cost_per_booking    NUMERIC,                     -- Derived from campaigns.cpl
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_lead_idx     ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS bookings_property_idx ON bookings(property_id);
CREATE INDEX IF NOT EXISTS bookings_date_idx     ON bookings(booking_date DESC);

-- ============================================================================
-- 8. campaigns (simulated for v1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID REFERENCES properties(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('Meta','Google','Portal','Other')),
  campaign_name     TEXT NOT NULL,
  ad_copy           TEXT,
  target_audience   TEXT,
  budget_inr        NUMERIC,
  impressions       INTEGER NOT NULL DEFAULT 0,
  clicks            INTEGER NOT NULL DEFAULT 0,
  leads_generated   INTEGER NOT NULL DEFAULT 0,
  cpl_inr           NUMERIC,                       -- cost per lead
  status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Paused','Completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_property_idx ON campaigns(property_id);
CREATE INDEX IF NOT EXISTS campaigns_platform_idx ON campaigns(platform);

-- FK from leads.campaign_id (after campaigns exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_campaign_fk'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_campaign_fk
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 9. agent_logs (observability — Story 8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL CHECK (agent_name IN ('Listing Agent','Ad Agent','Lead Agent','Nurture Agent','Conversion Agent','System')),
  action          TEXT NOT NULL,                    -- "scored_lead","drafted_message","extracted_objections", etc.
  input_summary   TEXT,
  output_summary  TEXT,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  duration_ms     INTEGER,
  status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error','warning')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_logs_created_idx ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS agent_logs_agent_idx   ON agent_logs(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_logs_lead_idx    ON agent_logs(lead_id);

-- ============================================================================
-- 10. agent_events (event bus — PRD §5 closed-loop architecture)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    TEXT NOT NULL CHECK (event_name IN (
                  'LISTING_SYNCED','LEAD_RECEIVED','LEAD_SCORED',
                  'MESSAGE_SENT','VISIT_SCHEDULED','VISIT_COMPLETED',
                  'VISIT_NO_SHOW','BOOKING_MADE','ESCALATION_TRIGGERED'
                )),
  source_agent  TEXT,
  payload       JSONB NOT NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  processed     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_events_name_idx       ON agent_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_events_unprocessed_idx ON agent_events(created_at) WHERE processed = false;

-- ============================================================================
-- 11. escalations (Story 7)
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  reason_code     TEXT NOT NULL CHECK (reason_code IN ('vip_budget','low_confidence','human_request','manual','other')),
  reason_text     TEXT NOT NULL,
  recommended_action TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  assigned_to     TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS escalations_status_idx ON escalations(status, created_at DESC);

-- ============================================================================
-- 12. eval_ground_truth (Section 8 — 15-lead model validation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS eval_ground_truth (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  expected_fit_band        TEXT NOT NULL CHECK (expected_fit_band IN ('low','medium','high')),
  expected_urgency_band    TEXT NOT NULL CHECK (expected_urgency_band IN ('low','medium','high')),
  expected_action          TEXT NOT NULL,
  reviewer_notes           TEXT,
  reviewer                 TEXT NOT NULL DEFAULT 'Abhishek Ranjan',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

-- ============================================================================
-- Convenience views (read-friendly for the Next.js dashboard)
-- ============================================================================

-- Lead queue: latest score + lead detail joined
CREATE OR REPLACE VIEW v_lead_queue AS
SELECT
  l.id              AS lead_id,
  l.name,
  l.phone,
  l.source,
  l.stage,
  l.purpose,
  l.budget_lakhs,
  l.preferred_config,
  l.preferred_city,
  l.purchase_timeline,
  l.language,
  l.intent_fields_count,
  l.first_response_at,
  l.created_at,
  s.fit_score,
  s.urgency_score,
  s.overall_score,
  s.confidence,
  s.fit_reasons,
  s.urgency_reasons,
  s.recommended_action,
  s.matched_property_id,
  p.project_name    AS matched_project
FROM leads l
LEFT JOIN LATERAL (
  SELECT * FROM lead_scores ls
  WHERE ls.lead_id = l.id
  ORDER BY ls.scored_at DESC
  LIMIT 1
) s ON true
LEFT JOIN properties p ON p.id = s.matched_property_id;

-- Source ROI: leads, qualified, visits, bookings, spend, CPL/CPV/CPB
CREATE OR REPLACE VIEW v_source_roi AS
SELECT
  COALESCE(l.source, 'Unknown')                                    AS source,
  COUNT(DISTINCT l.id)                                             AS leads_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.intent_fields_count >= 3)   AS qualified_count,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'Completed')       AS visits_completed,
  COUNT(DISTINCT b.id)                                             AS bookings_count,
  COALESCE(SUM(c.budget_inr), 0)                                   AS total_spend_inr,
  CASE WHEN COUNT(DISTINCT l.id) > 0
       THEN ROUND(COALESCE(SUM(c.budget_inr),0)::numeric / COUNT(DISTINCT l.id), 2)
       ELSE NULL END                                               AS cost_per_lead,
  CASE WHEN COUNT(DISTINCT v.id) FILTER (WHERE v.status='Completed') > 0
       THEN ROUND(COALESCE(SUM(c.budget_inr),0)::numeric / COUNT(DISTINCT v.id) FILTER (WHERE v.status='Completed'), 2)
       ELSE NULL END                                               AS cost_per_visit,
  CASE WHEN COUNT(DISTINCT b.id) > 0
       THEN ROUND(COALESCE(SUM(c.budget_inr),0)::numeric / COUNT(DISTINCT b.id), 2)
       ELSE NULL END                                               AS cost_per_booking
FROM leads l
LEFT JOIN visits   v ON v.lead_id = l.id
LEFT JOIN bookings b ON b.lead_id = l.id
LEFT JOIN campaigns c ON c.id = l.campaign_id
GROUP BY COALESCE(l.source, 'Unknown');

-- Primary metric: time to first qualifying response (≥3 intent fields)
CREATE OR REPLACE VIEW v_primary_metric AS
SELECT
  l.id AS lead_id,
  l.created_at,
  l.first_response_at,
  l.qualified_at,
  EXTRACT(EPOCH FROM (l.first_response_at - l.created_at)) AS sec_to_first_response,
  EXTRACT(EPOCH FROM (l.qualified_at - l.created_at))      AS sec_to_qualification
FROM leads l
WHERE l.first_response_at IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- DEMO POSTURE: RLS enabled, public read+write for the anon key. This is fine
-- for the capstone demo where every dashboard user is the same "manager".
-- TODO (post-capstone): add auth.uid() based policies before any prod use.

ALTER TABLE properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_ground_truth ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'properties','leads','lead_scores','messages','visit_slots','visits',
    'bookings','campaigns','agent_logs','agent_events','escalations','eval_ground_truth'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_demo_all ON %I;', t, t);
    EXECUTE format('CREATE POLICY %I_demo_all ON %I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- End of schema. Run seed_properties.sql next.
-- ============================================================================
