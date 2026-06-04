-- ============================================================================
-- Migration 0002: lead_feedback_aggregate() function
-- Provides the closed-loop feedback block consumed by the Lead Agent at scoring time.
-- Runs once. Idempotent (CREATE OR REPLACE).
-- ============================================================================
-- HOW TO APPLY:
--   1. Supabase SQL Editor → New query → paste this entire file → Run.
--   2. Verify with: SELECT * FROM lead_feedback_aggregate();
-- ============================================================================

CREATE OR REPLACE FUNCTION lead_feedback_aggregate()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH
src AS (
  SELECT
    COALESCE(l.source, 'Unknown') AS source,
    COUNT(DISTINCT l.id)                                                              AS leads_30d,
    COUNT(DISTINCT l.id) FILTER (WHERE l.intent_fields_count >= 3)                    AS qualified_30d,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'Completed')                        AS visits_30d,
    COUNT(DISTINCT b.id)                                                              AS bookings_30d
  FROM leads l
  LEFT JOIN visits   v ON v.lead_id = l.id
  LEFT JOIN bookings b ON b.lead_id = l.id
  WHERE l.created_at >= now() - interval '90 days'
  GROUP BY COALESCE(l.source, 'Unknown')
),
src_with_rate AS (
  SELECT
    source,
    leads_30d,
    qualified_30d,
    visits_30d,
    bookings_30d,
    CASE WHEN leads_30d > 0
         THEN ROUND((bookings_30d::numeric / leads_30d::numeric) * 100, 1)
         ELSE 0 END AS conv_rate_pct
  FROM src
),
obj AS (
  SELECT
    p.project_name,
    unnest(v.objections) AS objection,
    COUNT(*) AS occurrences
  FROM visits v
  JOIN properties p ON p.id = v.property_id
  WHERE v.status = 'Completed'
    AND v.completed_at >= now() - interval '90 days'
  GROUP BY p.project_name, unnest(v.objections)
),
obj_by_project AS (
  SELECT
    project_name,
    array_agg(objection ORDER BY occurrences DESC) AS objections,
    SUM(occurrences) AS count
  FROM obj
  GROUP BY project_name
)
SELECT jsonb_build_object(
  'by_source',
  COALESCE((SELECT jsonb_agg(to_jsonb(src_with_rate.*) ORDER BY conv_rate_pct DESC) FROM src_with_rate), '[]'::jsonb),
  'top_objections_by_project',
  COALESCE((SELECT jsonb_agg(to_jsonb(obj_by_project.*) ORDER BY count DESC) FROM obj_by_project), '[]'::jsonb),
  'generated_at',
  now()
);
$$;

-- Grant execute to the anon and service_role for n8n + dashboard reads
GRANT EXECUTE ON FUNCTION lead_feedback_aggregate() TO anon, authenticated, service_role;

-- Quick sanity check (uncomment to test):
-- SELECT * FROM lead_feedback_aggregate();
