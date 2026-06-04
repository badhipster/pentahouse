-- ============================================================================
-- 0012_add_visit_calendar_agent.sql
-- ============================================================================
-- The agent_logs.agent_name check constraint enumerates the 5 production agents.
-- The new Visit Calendar workflow (07_visit_calendar.json) needs to log under a
-- new agent name. Same pattern as 0004 (which added CAMPAIGN_LIVE to the
-- agent_events event_name constraint).
--
-- HOW TO APPLY:
--   Supabase SQL Editor -> paste this file -> Run.
--   Idempotent: DROP CONSTRAINT IF EXISTS + CREATE.
-- ============================================================================

ALTER TABLE agent_logs DROP CONSTRAINT IF EXISTS agent_logs_agent_name_check;

ALTER TABLE agent_logs ADD CONSTRAINT agent_logs_agent_name_check
  CHECK (agent_name IN (
    'Listing Agent',
    'Ad Agent',
    'Lead Agent',
    'Nurture Agent',
    'Conversion Agent',
    'Meta Lead Ingest',
    'Visit Calendar'
  ));

COMMENT ON CONSTRAINT agent_logs_agent_name_check ON agent_logs
  IS 'Allowlist of agent_name values. Add new agents here as the platform grows. Last update: Visit Calendar (07_visit_calendar.json) in 0012.';
