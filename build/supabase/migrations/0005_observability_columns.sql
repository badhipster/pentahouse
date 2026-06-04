-- =============================================================================
-- 0005_observability_columns.sql
-- =============================================================================
-- Adds the observability + provenance columns the AGENT_AUDIT.md doc identified
-- as the foundation for every other Week 1 improvement. All columns are
-- nullable + additive: existing rows and existing n8n nodes that don't write
-- these columns continue to function. Safe to run any time, including the day
-- before demo.
--
-- What this enables:
--   * trace_id        — correlates every event in a single buyer's journey
--                        (form submit → score → draft → approve → send → reply
--                         → visit → booking). One UUID threads the whole chain.
--   * confidence      — how sure the model was. Lets the manager filter the
--                        activity feed by "show me only low-confidence drafts".
--   * model_used      — which LLM produced this row. Required for cost
--                        attribution and for the post-demo model-fallback work.
--   * latency_ms      — end-to-end time the agent took. The first-reply KPI
--                        only tracks human-perceived latency; this tracks the
--                        machine side.
--   * prompt_version  — which versioned prompt file produced this output
--                        (e.g. "listing_extraction.v1"). Pairs with the
--                        new prompts/ files added in the same commit.
--
-- All Week 1 post-demo improvements (Lead Agent filter, Ad Agent prev-
-- campaigns, Conversion severity) write into these columns. Today we just
-- make them exist.
-- =============================================================================

ALTER TABLE agent_events
  ADD COLUMN IF NOT EXISTS trace_id       UUID,
  ADD COLUMN IF NOT EXISTS confidence     NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  ADD COLUMN IF NOT EXISTS model_used     TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms     INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

-- Index on trace_id for fast "show me the full journey of lead X" lookups.
-- Partial index so we don't bloat the table with NULL entries from v1 rows.
CREATE INDEX IF NOT EXISTS agent_events_trace_idx
  ON agent_events(trace_id, created_at)
  WHERE trace_id IS NOT NULL;

-- Index on (model_used, created_at) so the post-demo cost-tracking view can
-- aggregate spend by model over time windows.
CREATE INDEX IF NOT EXISTS agent_events_model_idx
  ON agent_events(model_used, created_at)
  WHERE model_used IS NOT NULL;

-- ---------------------------------------------------------------------------
-- v_agent_traces: a per-trace summary row. One row per unique trace_id with
-- the lead, the start/end timestamps, the number of hops, and the list of
-- agents that touched it. This is what the post-demo "trace viewer" UI reads.
-- ---------------------------------------------------------------------------
-- Note on UUID aggregation: Postgres does not define MIN/MAX on UUID. A trace
-- should only ever be tied to one lead_id and one property_id, so taking the
-- first non-null value via ARRAY_AGG[1] is semantically correct and avoids
-- the missing-aggregate error.
CREATE OR REPLACE VIEW v_agent_traces AS
SELECT
  trace_id,
  (ARRAY_AGG(lead_id)     FILTER (WHERE lead_id     IS NOT NULL))[1] AS lead_id,
  (ARRAY_AGG(property_id) FILTER (WHERE property_id IS NOT NULL))[1] AS property_id,
  MIN(created_at)                               AS started_at,
  MAX(created_at)                               AS ended_at,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000 AS span_ms,
  COUNT(*)                                      AS hop_count,
  ARRAY_AGG(DISTINCT source_agent ORDER BY source_agent) FILTER (WHERE source_agent IS NOT NULL) AS agents_touched,
  ARRAY_AGG(event_name ORDER BY created_at)     AS event_chain,
  AVG(confidence)                               AS avg_confidence,
  SUM(latency_ms)                               AS total_agent_latency_ms
FROM agent_events
WHERE trace_id IS NOT NULL
GROUP BY trace_id;

COMMENT ON COLUMN agent_events.trace_id       IS 'Correlates all agent events for a single buyer journey. Set on the first event (LEAD_RECEIVED) and propagated by downstream agents via the event payload.';
COMMENT ON COLUMN agent_events.confidence     IS 'Model self-rated confidence 0.00-1.00. NULL when the agent did not produce a probabilistic output.';
COMMENT ON COLUMN agent_events.model_used     IS 'e.g. "gemini-2.5-flash". Required for cost attribution and model-fallback analysis.';
COMMENT ON COLUMN agent_events.latency_ms     IS 'Agent-side time from prompt assembly to event write. Excludes human approval wait.';
COMMENT ON COLUMN agent_events.prompt_version IS 'e.g. "listing_extraction.v1". Pairs with files in build/prompts/.';
