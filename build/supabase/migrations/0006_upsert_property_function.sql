-- =============================================================================
-- 0006_upsert_property_function.sql
-- =============================================================================
-- Audit items 1.1 (dedup by RERA + fuzzy fallback) and 1.2 (upsert behaviour).
-- Replaces the Listing Agent's direct Insert with a single RPC that:
--   1. If rera_number provided: look up by RERA; if found, UPDATE and return id.
--   2. Else (or no RERA match): fuzzy match by (project_name, developer, city);
--      if found, UPDATE and return id.
--   3. Else: INSERT and return id.
--
-- Why an RPC and not a Supabase node upsert: n8n's Supabase node (typeVersion 1)
-- has no native upsert operation, and the multi-node IF/Merge dance to simulate
-- one inside n8n adds 4-5 nodes plus a Merge for every property write. A single
-- RPC call keeps the workflow JSON readable and centralises the dedup logic in
-- one place we can audit.
--
-- Also returns review_needed + review_reason in the result so the workflow can
-- decide whether to set status='Active' or status='Upcoming' (held until human
-- review).
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_property(
  p_project_name      TEXT,
  p_developer         TEXT,
  p_city              TEXT,
  p_locality          TEXT,
  p_config            TEXT,
  p_price_min_lakhs   NUMERIC,
  p_price_max_lakhs   NUMERIC,
  p_carpet_area_sqft  TEXT,
  p_rera_number       TEXT,
  p_possession_date   TEXT,
  p_amenities         TEXT[],
  p_highlights        TEXT[],
  p_status            TEXT DEFAULT 'Active'
) RETURNS TABLE (
  id              UUID,
  action_taken    TEXT,   -- 'insert' | 'update_by_rera' | 'update_by_fuzzy'
  matched_on      TEXT    -- which column drove the match (null on insert)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id UUID;
  v_action      TEXT;
  v_matched_on  TEXT;
BEGIN
  -- Step 1: Try RERA match (the strong signal).
  IF p_rera_number IS NOT NULL AND length(trim(p_rera_number)) > 0 THEN
    SELECT properties.id INTO v_existing_id
      FROM properties
     WHERE properties.rera_number = trim(p_rera_number)
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      v_action     := 'update_by_rera';
      v_matched_on := 'rera_number';
    END IF;
  END IF;

  -- Step 2: Fuzzy match on (project_name, developer, city) when no RERA hit.
  -- Case-insensitive equality, with NULL-safe developer comparison.
  IF v_existing_id IS NULL THEN
    SELECT properties.id INTO v_existing_id
      FROM properties
     WHERE LOWER(properties.project_name) = LOWER(trim(p_project_name))
       AND properties.city = p_city
       AND COALESCE(LOWER(properties.developer), '') = COALESCE(LOWER(trim(p_developer)), '')
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      v_action     := 'update_by_fuzzy';
      v_matched_on := 'project_name+developer+city';
    END IF;
  END IF;

  -- Step 3a: Update if matched.
  IF v_existing_id IS NOT NULL THEN
    UPDATE properties SET
      project_name     = trim(p_project_name),
      developer        = NULLIF(trim(COALESCE(p_developer, '')), ''),
      city             = p_city,
      locality         = NULLIF(trim(COALESCE(p_locality, '')), ''),
      config           = NULLIF(trim(COALESCE(p_config, '')), ''),
      price_min_lakhs  = p_price_min_lakhs,
      price_max_lakhs  = p_price_max_lakhs,
      carpet_area_sqft = NULLIF(trim(COALESCE(p_carpet_area_sqft, '')), ''),
      rera_number      = COALESCE(NULLIF(trim(COALESCE(p_rera_number, '')), ''), properties.rera_number),
      possession_date  = NULLIF(trim(COALESCE(p_possession_date, '')), ''),
      amenities        = COALESCE(p_amenities, properties.amenities),
      highlights       = COALESCE(p_highlights, properties.highlights),
      status           = p_status,
      updated_at       = now()
    WHERE properties.id = v_existing_id;
    RETURN QUERY SELECT v_existing_id, v_action, v_matched_on;
    RETURN;
  END IF;

  -- Step 3b: Insert if no match.
  INSERT INTO properties (
    project_name, developer, city, locality, config,
    price_min_lakhs, price_max_lakhs, carpet_area_sqft, rera_number, possession_date,
    amenities, highlights, status
  ) VALUES (
    trim(p_project_name),
    NULLIF(trim(COALESCE(p_developer, '')), ''),
    p_city,
    NULLIF(trim(COALESCE(p_locality, '')), ''),
    NULLIF(trim(COALESCE(p_config, '')), ''),
    p_price_min_lakhs,
    p_price_max_lakhs,
    NULLIF(trim(COALESCE(p_carpet_area_sqft, '')), ''),
    NULLIF(trim(COALESCE(p_rera_number, '')), ''),
    NULLIF(trim(COALESCE(p_possession_date, '')), ''),
    COALESCE(p_amenities, '{}'),
    COALESCE(p_highlights, '{}'),
    p_status
  )
  RETURNING properties.id INTO v_existing_id;

  RETURN QUERY SELECT v_existing_id, 'insert'::TEXT, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION upsert_property IS 'Listing Agent dedup + upsert. Tries RERA match first, then fuzzy (project_name + developer + city). Returns id, action_taken (insert | update_by_rera | update_by_fuzzy), and matched_on.';

-- Grant execute to the service role (n8n) and authenticated users (dashboard "Add property" sheet).
GRANT EXECUTE ON FUNCTION upsert_property TO service_role, authenticated, anon;
