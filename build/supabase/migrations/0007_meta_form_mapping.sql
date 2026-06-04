-- =============================================================================
-- 0007_meta_form_mapping.sql
-- =============================================================================
-- Dependency for build/n8n/06_meta_lead_ingest.json (Meta Lead Ads integration).
--
-- When a buyer fills a Lead Form in Instagram or Facebook, the webhook payload
-- tells us which form_id was submitted but NOT which property it was about.
-- This table stores the form_id → property_id mapping the Ad Agent (or a human)
-- maintains when launching a campaign.
--
-- In v2 phase 1, the Ad Agent's "publish to Meta" step writes to this table
-- automatically as it creates each Lead Form via the Marketing API. For now
-- (capstone v1), the user inserts a row manually after creating a test form
-- in the Meta Developer Console.
-- =============================================================================

CREATE TABLE IF NOT EXISTS meta_form_to_property (
  form_id          TEXT PRIMARY KEY,
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  form_name        TEXT,
  page_id          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       TEXT,    -- 'ad_agent' | 'manual' | future tenant user id
  -- Optional: map the raw form field names to our canonical lead fields.
  -- e.g. {"bhk_preference": "preferred_config", "your_budget": "budget_lakhs"}
  field_map        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS meta_form_to_property_property_idx
  ON meta_form_to_property(property_id);

GRANT SELECT ON meta_form_to_property TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON meta_form_to_property TO authenticated, service_role;

COMMENT ON TABLE meta_form_to_property IS 'Maps a Meta Lead Form id to the property it was created for. Populated by the Ad Agent on publish, or manually for capstone test forms.';

-- Convenience view: form mapping joined with property snapshot so the n8n
-- workflow only needs one query.
CREATE OR REPLACE VIEW v_meta_form_lookup AS
SELECT
  m.form_id,
  m.property_id,
  m.form_name,
  m.page_id,
  m.field_map,
  p.project_name,
  p.developer,
  p.city,
  p.locality,
  p.price_min_lakhs,
  p.price_max_lakhs
FROM meta_form_to_property m
JOIN properties p ON p.id = m.property_id;

GRANT SELECT ON v_meta_form_lookup TO anon, authenticated, service_role;
