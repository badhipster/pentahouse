-- ============================================================================
-- Migration 0016: Autonomous Activation Loop (v1.1 spec)
--
-- This migration adds the schema scaffolding the v1.1 activation loop needs:
--   1. trace_id propagation across agent_events and agent_logs
--   2. Reminder columns on visits (for the T-24h / T-2h scheduler)
--   3. trigger_event column on messages (so the approval queue can show WHY
--      a draft was created — hot lead, reply, or reminder)
--   4. consent_status reserved column on leads (DPDP-ready, used in v2)
--   5. v_agent_traces — the view that lets the dashboard prove unbroken chains
--   6. v_activation_metrics — the headline KPI for the spec
-- ============================================================================

BEGIN;

-- 1. trace_id on agent_events + agent_logs
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS trace_id UUID;
ALTER TABLE agent_logs   ADD COLUMN IF NOT EXISTS trace_id UUID;

CREATE INDEX IF NOT EXISTS agent_events_trace_idx ON agent_events(trace_id);
CREATE INDEX IF NOT EXISTS agent_logs_trace_idx   ON agent_logs(trace_id);

-- 2. Reminder tracking on visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS reminder_2h_sent  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ;

-- Backfill scheduled_at from existing date + time columns
UPDATE visits
SET scheduled_at = (scheduled_date::text || ' ' || COALESCE(scheduled_time, '10:00') || ':00')::timestamptz
WHERE scheduled_at IS NULL AND scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS visits_scheduled_at_idx ON visits(scheduled_at);
CREATE INDEX IF NOT EXISTS visits_reminder_pending_idx
  ON visits(scheduled_at)
  WHERE status IN ('Scheduled','Confirmed') AND (NOT reminder_24h_sent OR NOT reminder_2h_sent);

-- 3. trigger_event on messages so the approval queue can explain itself
ALTER TABLE messages ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS trace_id UUID;
CREATE INDEX IF NOT EXISTS messages_trace_idx ON messages(trace_id);

-- 4. Consent status (DPDP-ready, used in v2; reserve column shape now)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending'
  CHECK (consent_status IN ('pending','granted','revoked'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- 5. Re-score debounce — last_rescored_at on leads so inbound workflow can debounce
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_rescored_at TIMESTAMPTZ;

-- 6. v_agent_traces — collects every step of a single autonomous run
DROP VIEW IF EXISTS v_agent_traces CASCADE;
CREATE VIEW v_agent_traces AS
SELECT
  e.trace_id,
  e.lead_id,
  e.event_name,
  e.source_agent,
  e.payload,
  e.created_at,
  'event' AS row_type
FROM agent_events e
WHERE e.trace_id IS NOT NULL
UNION ALL
SELECT
  l.trace_id,
  l.lead_id,
  l.action AS event_name,
  l.agent_name AS source_agent,
  jsonb_build_object(
    'input', l.input_summary,
    'output', l.output_summary,
    'duration_ms', l.duration_ms,
    'status', l.status
  ) AS payload,
  l.created_at,
  'log' AS row_type
FROM agent_logs l
WHERE l.trace_id IS NOT NULL
ORDER BY trace_id, created_at;

GRANT SELECT ON v_agent_traces TO authenticated, anon;

-- 7. v_activation_metrics — the spec's headline KPI
DROP VIEW IF EXISTS v_activation_metrics CASCADE;
CREATE VIEW v_activation_metrics AS
WITH hot_leads AS (
  SELECT
    l.id AS lead_id,
    l.created_at AS lead_created_at,
    ls.overall_score,
    ls.recommended_action,
    ls.scored_at
  FROM leads l
  JOIN LATERAL (
    SELECT * FROM lead_scores
    WHERE lead_id = l.id
    ORDER BY scored_at DESC LIMIT 1
  ) ls ON true
  WHERE ls.overall_score >= 70
    AND ls.recommended_action IN ('Schedule site visit','Send brochure')
    AND l.created_at > now() - INTERVAL '7 days'
),
hot_with_draft AS (
  SELECT
    h.lead_id,
    h.lead_created_at,
    MIN(m.created_at) AS first_draft_at
  FROM hot_leads h
  LEFT JOIN messages m
    ON m.lead_id = h.lead_id
   AND m.direction = 'outbound'
   AND m.trigger_event = 'lead_scored_hot'
  GROUP BY h.lead_id, h.lead_created_at
)
SELECT
  COUNT(*)                                                       AS hot_leads_7d,
  COUNT(*) FILTER (WHERE first_draft_at IS NOT NULL)              AS auto_activated_count,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE first_draft_at IS NOT NULL) / COUNT(*), 1)
    ELSE 0 END                                                    AS auto_activation_pct,
  EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (
    ORDER BY first_draft_at - lead_created_at
  ))::integer                                                     AS median_latency_seconds,
  EXTRACT(EPOCH FROM percentile_cont(0.9) WITHIN GROUP (
    ORDER BY first_draft_at - lead_created_at
  ))::integer                                                     AS p90_latency_seconds,
  COUNT(*) FILTER (WHERE first_draft_at - lead_created_at < INTERVAL '60 seconds') AS under_60s_count
FROM hot_with_draft;

GRANT SELECT ON v_activation_metrics TO authenticated, anon;

-- 8. Allow the new agent_logs agent_name 'System' for cron workflows
-- (Already in CHECK, this is a no-op assertion. Visit Reminders runs as 'System')

COMMIT;

-- Verify
SELECT 'v_agent_traces' AS view_name, COUNT(*) AS rows FROM v_agent_traces
UNION ALL
SELECT 'v_activation_metrics', COUNT(*) FROM v_activation_metrics;
