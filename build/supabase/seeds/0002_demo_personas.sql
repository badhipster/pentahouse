-- ============================================================================
-- Pentahouse demo personas — role assignment
--
-- This SQL runs AFTER you sign up the 3 demo users via the dashboard's
-- /signup page (because Supabase Auth requires email/password creation
-- through the auth API, not direct SQL inserts).
--
-- Signup flow first:
--   1. Open http://localhost:8081/signup
--   2. Sign up each persona (display name + email + password):
--        Priya Rao        head@pentahouse.demo       demo1234
--        Rohit Joshi      rohit@pentahouse.demo      demo1234
--        Meera Patel      meera@pentahouse.demo      demo1234
--   3. After each signup, you'll land on /today (signed in)
--   4. Sign out from the avatar menu, repeat for next persona
--
-- Then run THIS sql in Supabase SQL Editor to:
--   - Promote each user to the right role
--   - Assign half the demo funnel leads to Rohit (the sales rep)
--   - Leave Priya/Meera as floor-wide viewers
-- ============================================================================

BEGIN;

-- 1. Set roles on the 3 demo users (uses email match, no IDs needed)
UPDATE public.users SET role = 'sales_head', display_name = 'Priya Rao'
  WHERE email = 'head@pentahouse.demo';

UPDATE public.users SET role = 'sales_rep',  display_name = 'Rohit Joshi'
  WHERE email = 'rohit@pentahouse.demo';

UPDATE public.users SET role = 'marketing',  display_name = 'Meera Patel'
  WHERE email = 'meera@pentahouse.demo';

-- 2. Assign demo leads to Rohit (the sales rep) so he has a personal pipeline
-- Leads 1, 3, 5, 7, 10 belong to Rohit (5 of 10)
UPDATE leads
SET assigned_to = (SELECT id FROM public.users WHERE email = 'rohit@pentahouse.demo')
WHERE id IN (
  '11111111-1111-1111-1111-000000000001',  -- Aarav Mehta (New, hot)
  '11111111-1111-1111-1111-000000000003',  -- Rohit Patel (Qualified)
  '11111111-1111-1111-1111-000000000005',  -- Vikram Joshi (Visit Scheduled)
  '11111111-1111-1111-1111-000000000007',  -- Karan Shah (Visited)
  '11111111-1111-1111-1111-000000000010'   -- Pooja Reddy (Negotiation)
);

-- Leads 2, 4, 6, 8, 9 stay unassigned (floor pool) OR auto-assign later

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------
SELECT
  u.email,
  u.display_name,
  u.role,
  (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id) AS assigned_leads
FROM public.users u
WHERE u.email IN ('head@pentahouse.demo','rohit@pentahouse.demo','meera@pentahouse.demo')
ORDER BY
  CASE u.role
    WHEN 'sales_head' THEN 1
    WHEN 'sales_rep' THEN 2
    WHEN 'marketing' THEN 3
    ELSE 4
  END;
