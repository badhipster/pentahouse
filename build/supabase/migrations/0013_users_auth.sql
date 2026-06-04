-- ============================================================================
-- 0013_users_auth.sql
-- ============================================================================
-- Auth foundation for the Sales Head persona.
-- Creates a public.users table that mirrors auth.users, adds display_name +
-- role columns, RLS policies, and a trigger so a public.users row is created
-- automatically whenever a Supabase auth.users row is created (signup flow).
--
-- Single role for v1 ("sales_head"), but the role column is an enum-style
-- CHECK that already includes the multi-persona roles we'll need later —
-- marketing, sales_rep, aggregator, admin. Adding those roles is then
-- additive (no schema change), only UI route-gating changes.
--
-- HOW TO APPLY:
--   Supabase SQL Editor → paste this file → Run.
--   Idempotent: IF NOT EXISTS + CREATE OR REPLACE everywhere.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. public.users — application profile mirroring auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'sales_head'
                 CHECK (role IN ('sales_head','marketing','sales_rep','aggregator','admin')),
  avatar_url   TEXT,
  phone        TEXT,
  -- Multi-tenant prep: every user belongs to a tenant. NULL allowed for v1
  -- (single-tenant Pilot) but the column exists so adding tenants is additive.
  tenant_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_idx       ON public.users(role);
CREATE INDEX IF NOT EXISTS users_tenant_idx     ON public.users(tenant_id);

-- ---------------------------------------------------------------------------
-- 2. Trigger: auto-create public.users row when auth.users row is inserted
--    This means /signup just needs to create the auth.users row; the public
--    mirror happens automatically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 3. Trigger: touch updated_at on UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._touch_users_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS users_touch_updated_at ON public.users;
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public._touch_users_updated_at();

-- ---------------------------------------------------------------------------
-- 4. RLS — Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- For v1 (single tenant), all authenticated users can read every users row
-- (so the dashboard can render names, avatars, etc.). When multi-tenant lands,
-- this policy will narrow to "same tenant_id."
DROP POLICY IF EXISTS "users_readable_by_authenticated" ON public.users;
CREATE POLICY "users_readable_by_authenticated"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- A user can update their own profile only.
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- A user cannot directly INSERT — that's the trigger's job from auth signup.
-- A user cannot DELETE — admin-only, handled out-of-band for now.

-- ---------------------------------------------------------------------------
-- 5. Grants (the anon key can read public users via RLS; service_role bypasses)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.users TO authenticated, anon;
GRANT UPDATE (display_name, avatar_url, phone) ON public.users TO authenticated;

COMMENT ON TABLE  public.users IS 'Application profiles for Supabase auth.users. Auto-populated on signup via trigger. Role column ready for multi-persona phase.';
COMMENT ON COLUMN public.users.role IS 'sales_head (v1 default) | marketing | sales_rep | aggregator | admin. UI route-gating uses this column.';
COMMENT ON COLUMN public.users.tenant_id IS 'Reserved for multi-tenancy phase. NULL means default-tenant for v1.';
