-- ============================================================================
-- Pentahouse demo — give the Sales Rep a populated "My deals" pipeline
--
-- WHY: the rep view filters leads to assigned_to = the logged-in rep. If no
-- leads are assigned, "My deals" is empty. This assigns demo leads to whoever
-- is the sales_rep, WITHOUT depending on a specific signup email or lead UUIDs.
--
-- PREREQUISITES (run these first, in order, in the Supabase SQL Editor):
--   1. schema.sql + all migrations
--   2. seeds/0001_demo_funnel.sql   (the 10 demo leads + Lead Agent scores)
--   3. Sign up the 3 personas via /signup, then seeds/0002_demo_personas.sql
--      (sets roles). THIS file then assigns leads to the rep.
--
-- Safe to re-run.
-- ============================================================================

BEGIN;

-- Assign the 6 most recent demo leads to the first sales_rep, regardless of
-- which email they signed up with. Each lead already carries a Lead Agent
-- score, so the rep's pipeline shows the AI's work per card.
WITH rep AS (
  SELECT id FROM public.users WHERE role = 'sales_rep' ORDER BY created_at LIMIT 1
),
to_assign AS (
  SELECT id FROM leads ORDER BY created_at LIMIT 6
)
UPDATE leads
SET assigned_to = (SELECT id FROM rep)
WHERE id IN (SELECT id FROM to_assign)
  AND EXISTS (SELECT 1 FROM rep);

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION — should show the rep with 6 assigned leads
-- ---------------------------------------------------------------------------
SELECT u.email, u.display_name, u.role,
       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id) AS assigned_leads
FROM public.users u
WHERE u.role = 'sales_rep';
