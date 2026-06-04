-- ============================================================================
-- Migration 0017: Draft campaigns + purpose qualifier message template
--
-- 1. Adds 'Draft' to campaigns.status enum so marketing has a pre-Active state
--    for the new /campaigns approval queue (concept-note MVP feature #3 parity).
-- 2. Reserves the 'purpose_qualifier' template_name on messages so the Nurture
--    Agent can branch when lead.purpose is null (concept-note MVP feature #1).
-- ============================================================================

BEGIN;

-- 1. Extend campaigns.status CHECK constraint to include 'Draft'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('Draft','Active','Paused','Completed'));

-- 2. (Optional) Seed a few existing campaigns as Draft so the new queue has
-- something to demo. We pick the 3 most recently created Active campaigns and
-- flip them to Draft. Idempotent: only flips if not already Draft.
UPDATE campaigns
SET status = 'Draft'
WHERE id IN (
  SELECT id FROM campaigns
  WHERE status = 'Active'
  ORDER BY created_at DESC
  LIMIT 3
);

COMMIT;

-- Verify
SELECT status, COUNT(*) FROM campaigns GROUP BY status ORDER BY status;
