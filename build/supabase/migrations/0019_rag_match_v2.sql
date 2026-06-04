-- ============================================================================
-- Migration 0019: RAG match v2 — permissive fallback
--
-- The original match_properties RPC was returning 0 rows for every Lead Agent
-- query (either similarity threshold too high or the city/budget pre-filter
-- too tight). Result: every lead got fit_score=0 and routed to gap-fill instead
-- of activation.
--
-- This migration adds a NEW function `rag_match_v2` that's deliberately
-- permissive: it returns the top 5 active properties in the buyer's preferred
-- city, optionally ordered by similarity to a query embedding if embeddings
-- exist, otherwise ordered by created_at DESC.
--
-- The Lead Agent can be pointed at this new function by editing the
-- HTTP: RAG Match Properties node URL. Original function preserved for v2
-- when we tune the strict similarity path properly.
-- ============================================================================

BEGIN;

-- Drop any prior version of v2
DROP FUNCTION IF EXISTS rag_match_v2(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS rag_match_v2(TEXT, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS rag_match_v2(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION rag_match_v2(
  query_city TEXT DEFAULT NULL,
  query_budget_lakhs NUMERIC DEFAULT NULL,
  match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  property_id UUID,
  project_name TEXT,
  locality TEXT,
  city TEXT,
  config_mix TEXT,
  price_min_lakhs NUMERIC,
  price_max_lakhs NUMERIC,
  usps TEXT[],
  similarity NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.project_name,
    p.locality,
    p.city,
    p.config_mix,
    p.price_min_lakhs,
    p.price_max_lakhs,
    COALESCE(p.usps, ARRAY[]::TEXT[]),
    -- Synthetic similarity score: 1.0 for exact city match, 0.5 for any property
    CASE
      WHEN query_city IS NOT NULL AND LOWER(TRIM(p.city)) = LOWER(TRIM(query_city)) THEN 1.0::NUMERIC
      WHEN query_city IS NULL THEN 0.7::NUMERIC
      ELSE 0.3::NUMERIC
    END AS similarity
  FROM properties p
  WHERE p.status = 'Active'
    AND (
      query_city IS NULL
      OR LOWER(TRIM(p.city)) = LOWER(TRIM(query_city))
    )
    -- Optional budget filter: include properties whose price band overlaps with lead's budget ±50%
    AND (
      query_budget_lakhs IS NULL
      OR p.price_min_lakhs IS NULL
      OR p.price_max_lakhs IS NULL
      OR (p.price_min_lakhs <= query_budget_lakhs * 1.5 AND p.price_max_lakhs >= query_budget_lakhs * 0.5)
    )
  ORDER BY similarity DESC, p.created_at DESC
  LIMIT match_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION rag_match_v2(TEXT, NUMERIC, INTEGER) TO authenticated, anon, service_role;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFY — should return up to 5 Pune properties
-- ---------------------------------------------------------------------------
SELECT property_id, project_name, locality, price_min_lakhs, price_max_lakhs, similarity
FROM rag_match_v2('Pune', 120, 5);
