-- ============================================================================
-- Migration 0018: Intent Completeness + Three-Way Activation Branch (spec rev. 3)
--
-- Implements the schema scaffolding the corrected Activation Loop needs:
--   1. lead_scores.data_sufficiency — sufficient | insufficient verdict
--   2. lead_scores.missing_fields TEXT[] — fields the buyer hasn't shared
--   3. lead_scores.critical_missing_count
--   4. leads.no_inventory_match — RAG returned zero matches (don't fabricate)
--   5. leads.gap_fill_turn_count — hard-capped at MAX_GAP_FILL_TURNS=2
--   6. v_intent_dashboard — what's missing per active lead, for the UI
-- ============================================================================

BEGIN;

-- 1. Lead scores: add intent-completeness fields
ALTER TABLE lead_scores ADD COLUMN IF NOT EXISTS data_sufficiency TEXT
  CHECK (data_sufficiency IS NULL OR data_sufficiency IN ('sufficient', 'insufficient'));
ALTER TABLE lead_scores ADD COLUMN IF NOT EXISTS missing_fields TEXT[] DEFAULT '{}';
ALTER TABLE lead_scores ADD COLUMN IF NOT EXISTS critical_missing_count INTEGER DEFAULT 0;

-- 2. Leads: no-inventory guard + gap-fill turn counter
ALTER TABLE leads ADD COLUMN IF NOT EXISTS no_inventory_match BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gap_fill_turn_count INTEGER NOT NULL DEFAULT 0;

-- 3. Useful view: per-lead intent state for the dashboard
DROP VIEW IF EXISTS v_intent_dashboard CASCADE;
CREATE VIEW v_intent_dashboard AS
SELECT
  l.id                            AS lead_id,
  l.name,
  l.stage,
  l.no_inventory_match,
  l.gap_fill_turn_count,
  s.data_sufficiency,
  s.missing_fields,
  s.critical_missing_count,
  s.overall_score,
  s.confidence,
  s.recommended_action,
  -- Determine which branch the Lead Agent would have taken
  CASE
    WHEN s.recommended_action IN ('Disqualify', 'Escalate to manager') THEN 'no_message'
    WHEN s.data_sufficiency = 'sufficient'
         AND s.overall_score >= 70
         AND s.recommended_action IN ('Schedule site visit', 'Send brochure')
      THEN 'activation'
    WHEN s.data_sufficiency = 'insufficient'
         AND s.recommended_action != 'Disqualify'
         AND l.gap_fill_turn_count < 2
      THEN 'gap_fill'
    WHEN l.gap_fill_turn_count >= 2 THEN 'human_handoff'
    ELSE 'no_message'
  END                              AS activation_branch
FROM leads l
LEFT JOIN LATERAL (
  SELECT * FROM lead_scores ls
  WHERE ls.lead_id = l.id
  ORDER BY ls.scored_at DESC LIMIT 1
) s ON true;

GRANT SELECT ON v_intent_dashboard TO authenticated, anon;

COMMIT;

-- Verify
SELECT 'lead_scores cols added' AS check,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='lead_scores' AND column_name='data_sufficiency') AS ok;
SELECT 'leads cols added',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='no_inventory_match');
SELECT activation_branch, COUNT(*) FROM v_intent_dashboard GROUP BY activation_branch ORDER BY activation_branch;
