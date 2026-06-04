#!/usr/bin/env node
/**
 * compute_property_embeddings.mjs
 *
 * One-shot script: pulls every Active property from Supabase, builds a text
 * representation of each, calls Gemini text-embedding-004 to produce a 768-dim
 * embedding, and upserts into the property_embeddings table.
 *
 * Run once after migrations 0008 + 0009 are applied:
 *   GEMINI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
 *     node build/scripts/compute_property_embeddings.mjs
 *
 * Idempotent: skips properties whose source_text_hash hasn't changed since
 * last run. Safe to re-run after every property update.
 *
 * Requires Node 18+ (uses global fetch + crypto).
 */

import { createHash } from 'node:crypto';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const GEMINI_API_KEY       = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env vars. Set: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY');
  process.exit(1);
}

const SUPA = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...opts,
  headers: {
    apikey:        SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:        'return=representation',
    ...(opts.headers || {})
  }
});

// Build the text we embed. Keep it focused on signal — the fields a buyer
// might actually mention in inquiry_text. We deliberately exclude price
// numbers because the budget filter handles that separately; the embedding
// is for SEMANTIC match (locality, amenities, lifestyle), not arithmetic match.
function buildSourceText(p) {
  const amenities  = Array.isArray(p.amenities)  ? p.amenities.join(', ')  : '';
  const highlights = Array.isArray(p.highlights) ? p.highlights.join('. ') : '';
  return [
    `${p.project_name} by ${p.developer || 'developer'} in ${p.locality || ''}, ${p.city}.`,
    `Configuration: ${p.config || 'mixed'}.`,
    `Carpet area: ${p.carpet_area_sqft || 'varied'} sqft.`,
    `Possession ${p.possession_date || 'TBD'}.`,
    amenities  ? `Amenities: ${amenities}.`   : '',
    highlights ? `Highlights: ${highlights}.` : ''
  ].filter(Boolean).join(' ');
}

function sha256Hex(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

async function embed(text) {
  // gemini-embedding-001 is the current generation (text-embedding-004 was renamed).
  // We request 768 dims via outputDimensionality so the output fits the vector(768)
  // pgvector column without a migration. The model supports MRL down to 768/1536.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    model:    'models/gemini-embedding-001',
    content:  { parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: 768
  });
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding error ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Unexpected embedding shape: length=${values?.length}`);
  }
  return values;
}

async function main() {
  console.log('Fetching active properties from Supabase…');
  const propsRes = await SUPA('properties?status=eq.Active&select=id,project_name,developer,city,locality,config,carpet_area_sqft,price_min_lakhs,price_max_lakhs,possession_date,amenities,highlights');
  if (!propsRes.ok) {
    console.error('Failed to fetch properties:', propsRes.status, await propsRes.text());
    process.exit(1);
  }
  const properties = await propsRes.json();
  console.log(`Found ${properties.length} active properties.`);

  // Existing embeddings (so we can skip unchanged ones)
  const existingRes = await SUPA('property_embeddings?select=property_id,source_text_hash');
  const existing = existingRes.ok ? await existingRes.json() : [];
  const existingMap = new Map(existing.map(r => [r.property_id, r.source_text_hash]));

  let computed = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const p of properties) {
    const sourceText = buildSourceText(p);
    const hash       = sha256Hex(sourceText);

    if (existingMap.get(p.id) === hash) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`Embedding ${p.project_name.padEnd(35)} `);
      const t0 = Date.now();
      const embedding = await embed(sourceText);
      const dt = Date.now() - t0;

      // Upsert: POST to /rest/v1/property_embeddings with Prefer: resolution=merge-duplicates
      const upRes = await fetch(`${SUPABASE_URL}/rest/v1/property_embeddings`, {
        method: 'POST',
        headers: {
          apikey:        SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer:        'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          property_id:      p.id,
          embedding:        embedding,            // pgvector accepts array literal
          source_text:      sourceText,
          source_text_hash: hash,
          model_used:       'gemini-text-embedding-004',
          embedding_dim:    768
        })
      });
      if (!upRes.ok) {
        const err = await upRes.text();
        process.stdout.write(`UPSERT FAILED (${upRes.status}): ${err.slice(0, 200)}\n`);
        failed++;
      } else {
        process.stdout.write(`OK (${dt}ms)\n`);
        computed++;
      }
    } catch (e) {
      process.stdout.write(`FAILED: ${e.message}\n`);
      failed++;
    }
    // Friendly pause to stay under Gemini Flash free-tier rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  console.log('---');
  console.log(`Computed: ${computed}`);
  console.log(`Skipped (unchanged): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${properties.length}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
