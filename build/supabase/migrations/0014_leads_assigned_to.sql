-- ============================================================================
-- Migration 0014: assigned_to + persona-aware indexing
--
-- Adds a typed UUID assigned_to column to leads so the dashboard can filter
-- "my deals" for sales reps. Old assigned_to (TEXT) is kept as assigned_to_legacy
-- for any pre-existing string-typed assignment data.
--
-- Also adds an index on users.role so role-based sidebar gating is cheap.
-- ============================================================================

BEGIN;

-- 1. Rename existing TEXT column (preserves any prior data, just out of the way)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'assigned_to'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE leads RENAME COLUMN assigned_to TO assigned_to_legacy;
  END IF;
END $$;

-- 2. Add new typed assigned_to (UUID FK to public.users)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Index for "my deals" queries
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);

-- 4. Index for role-based gating
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);

-- 5. Helper view: leads_with_owner (joins display_name in for the dashboard)
CREATE OR REPLACE VIEW leads_with_owner AS
SELECT
  l.*,
  u.display_name AS owner_display_name,
  u.email        AS owner_email,
  u.role         AS owner_role
FROM leads l
LEFT JOIN public.users u ON u.id = l.assigned_to;

GRANT SELECT ON leads_with_owner TO authenticated, anon;

-- 6. Extend v_lead_queue to expose assigned_to + owner display name
-- (The dashboard filters "my deals" using this column.)
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
  l.assigned_to,
  u.display_name    AS owner_display_name,
  u.role            AS owner_role,
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
LEFT JOIN public.users u ON u.id = l.assigned_to
LEFT JOIN LATERAL (
  SELECT * FROM lead_scores ls
  WHERE ls.lead_id = l.id
  ORDER BY ls.scored_at DESC
  LIMIT 1
) s ON true
LEFT JOIN properties p ON p.id = s.matched_property_id;

GRANT SELECT ON v_lead_queue TO authenticated, anon;

COMMIT;
