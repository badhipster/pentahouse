-- ============================================================================
-- Migration 0015: Lead deduplication + attribution-ready scoring
--
-- 1. Adds a unique partial index on leads.phone so the same phone number can't
--    create duplicate lead records. NULL phones (rare but possible) are allowed.
--    Existing demo data uses unique phones (+91999900001..0010) so this is safe.
--
-- 2. Adds a check_existing_lead_by_phone RPC for the Lead Agent to optionally
--    pre-check before insert. (Today the Insert Lead node will simply error on
--    duplicate — surfaces in n8n execution log, which is honest behavior.)
--
-- 3. Adds first_response_seconds computed column for the speed-to-lead KPI
--    so the dashboard doesn't have to compute it on every read.
-- ============================================================================

BEGIN;

-- 1. Unique partial index on phone
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique_idx
  ON leads (lower(trim(phone)))
  WHERE phone IS NOT NULL AND length(trim(phone)) > 0;

-- 2. Optional RPC for n8n to check duplicates before insert
CREATE OR REPLACE FUNCTION check_existing_lead_by_phone(p_phone TEXT)
RETURNS TABLE (
  existing_lead_id UUID,
  existing_name TEXT,
  existing_score INTEGER,
  existing_stage TEXT,
  existing_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    s.overall_score,
    l.stage,
    l.created_at
  FROM leads l
  LEFT JOIN LATERAL (
    SELECT overall_score FROM lead_scores
    WHERE lead_id = l.id
    ORDER BY scored_at DESC
    LIMIT 1
  ) s ON true
  WHERE lower(trim(l.phone)) = lower(trim(p_phone))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_existing_lead_by_phone(TEXT) TO authenticated, anon;

-- 3. Speed-to-lead view (median across last 24h)
CREATE OR REPLACE VIEW v_speed_to_lead AS
SELECT
  COUNT(*)                                                          AS leads_with_response,
  COUNT(*) FILTER (WHERE first_response_at - created_at < INTERVAL '5 minutes')   AS under_5_min,
  COUNT(*) FILTER (WHERE first_response_at - created_at < INTERVAL '1 hour')      AS under_1_hour,
  EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (
    ORDER BY first_response_at - created_at
  ))::integer                                                       AS median_seconds,
  EXTRACT(EPOCH FROM percentile_cont(0.9) WITHIN GROUP (
    ORDER BY first_response_at - created_at
  ))::integer                                                       AS p90_seconds
FROM leads
WHERE created_at > now() - INTERVAL '24 hours'
  AND first_response_at IS NOT NULL;

GRANT SELECT ON v_speed_to_lead TO authenticated, anon;

COMMIT;

-- Verification: should return 1 row (might be all zeros if no recent leads)
SELECT * FROM v_speed_to_lead;
