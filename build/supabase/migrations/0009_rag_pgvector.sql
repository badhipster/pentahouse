-- ============================================================================
-- Migration 0009: RAG infrastructure — pgvector + property embeddings + RPC
-- ============================================================================
-- Adds real semantic retrieval to the Lead Agent. Replaces the naive city +
-- budget filter (audit item 3.3 was a placeholder; this is the proper fix)
-- with vector-similarity search over property embeddings.
--
-- Architecture:
--   1. pgvector extension (768-dim vectors — matches Gemini text-embedding-004)
--   2. property_embeddings table — one row per property, holds the embedding
--      of (project_name + developer + city + locality + config + highlights
--          + amenities + possession_date), produced by a Gemini API call.
--   3. match_properties_for_inquiry(inquiry_embedding vector, lead_budget,
--      lead_city, k) RPC — returns top-K properties by cosine similarity,
--      with optional soft filters on city + budget band.
--   4. ivfflat index on the embedding column for sublinear search at scale.
--
-- The Lead Agent's Build Context node embeds the buyer's inquiry_text via
-- Gemini, calls this RPC, and passes the top-K results into the scoring
-- prompt. This is RAG: retrieve relevant context (matching properties)
-- BEFORE the augmented generation (Gemini-based scoring).
--
-- Why pgvector and not Pinecone/Weaviate: we already have Supabase Postgres
-- in the loop. Adding a separate vector store would mean another vendor,
-- another credential, another sync job. pgvector keeps everything in one DB
-- and one transaction. Good enough for the catalog size we'll have at first
-- 5 customers (~500 properties).
-- ============================================================================

-- 1) Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) property_embeddings table
CREATE TABLE IF NOT EXISTS property_embeddings (
  property_id      UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  embedding        vector(768) NOT NULL,                 -- Gemini text-embedding-004 = 768 dims
  source_text      TEXT NOT NULL,                        -- the exact text that was embedded
  source_text_hash TEXT NOT NULL,                        -- sha256 of source_text; lets us skip re-embed when unchanged
  model_used       TEXT NOT NULL DEFAULT 'gemini-text-embedding-004',
  embedding_dim    INTEGER NOT NULL DEFAULT 768,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) IVF-flat index for cosine similarity search (sublinear at scale)
--    lists=100 is a starting point; tune to sqrt(N) where N = row count
CREATE INDEX IF NOT EXISTS property_embeddings_embedding_idx
  ON property_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 25);

-- 4) RPC: semantic match for a lead inquiry
--    Returns top-K properties by cosine distance, with soft filters.
--    The Lead Agent calls this in place of the existing GetAll(properties)
--    pattern. Soft filters mean: if city matches we boost the score, but
--    we don't exclude — semantic relevance can override city in edge cases
--    like "I work in Pune but want to invest in NCR".
CREATE OR REPLACE FUNCTION match_properties_for_inquiry(
  inquiry_embedding vector(768),
  preferred_city    TEXT DEFAULT NULL,
  budget_lakhs      NUMERIC DEFAULT NULL,
  match_count       INT DEFAULT 6
)
RETURNS TABLE (
  id                 UUID,
  project_name       TEXT,
  developer          TEXT,
  city               TEXT,
  locality           TEXT,
  config             TEXT,
  price_min_lakhs    NUMERIC,
  price_max_lakhs    NUMERIC,
  possession_date    TEXT,
  highlights         TEXT[],
  amenities          TEXT[],
  similarity         REAL,   -- cosine similarity (1 = identical)
  budget_overlap     BOOLEAN,
  city_match         BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  budget_low  NUMERIC := CASE WHEN budget_lakhs IS NULL THEN NULL ELSE budget_lakhs * 0.8 END;
  budget_high NUMERIC := CASE WHEN budget_lakhs IS NULL THEN NULL ELSE budget_lakhs * 1.2 END;
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.project_name,
      p.developer,
      p.city,
      p.locality,
      p.config,
      p.price_min_lakhs,
      p.price_max_lakhs,
      p.possession_date,
      p.highlights,
      p.amenities,
      (1 - (pe.embedding <=> inquiry_embedding))::REAL                 AS similarity,
      CASE
        WHEN budget_lakhs IS NULL THEN TRUE
        WHEN p.price_min_lakhs IS NULL OR p.price_max_lakhs IS NULL THEN TRUE
        WHEN p.price_min_lakhs <= budget_high AND p.price_max_lakhs >= budget_low THEN TRUE
        ELSE FALSE
      END                                                              AS budget_overlap,
      (preferred_city IS NOT NULL AND p.city = preferred_city)         AS city_match
    FROM property_embeddings pe
    JOIN properties p ON p.id = pe.property_id
    WHERE p.status = 'Active'
    ORDER BY
      -- Composite ranking: similarity first, then city match boost, then budget overlap boost
      (1 - (pe.embedding <=> inquiry_embedding))
        + CASE WHEN preferred_city IS NOT NULL AND p.city = preferred_city THEN 0.15 ELSE 0 END
        + CASE WHEN budget_lakhs IS NOT NULL
                AND p.price_min_lakhs <= COALESCE(budget_high, p.price_min_lakhs)
                AND p.price_max_lakhs >= COALESCE(budget_low, p.price_max_lakhs)
              THEN 0.10 ELSE 0 END
        DESC
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_properties_for_inquiry TO service_role, authenticated, anon;

COMMENT ON TABLE property_embeddings IS 'Vector embeddings of property metadata for RAG retrieval. Populated by build/scripts/compute_property_embeddings.mjs after seed/update.';
COMMENT ON FUNCTION match_properties_for_inquiry IS 'RAG: returns top-K properties by cosine similarity to inquiry embedding, with soft boosts for matching city + budget band.';

-- 5) Trigger to bump updated_at on embedding changes (debugging hygiene)
CREATE OR REPLACE FUNCTION _touch_property_embeddings_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS property_embeddings_touch ON property_embeddings;
CREATE TRIGGER property_embeddings_touch
  BEFORE UPDATE ON property_embeddings
  FOR EACH ROW EXECUTE FUNCTION _touch_property_embeddings_updated_at();
