# Listing Agent — Field Extraction Prompt

**File version:** `listing_extraction.v1`
**Model:** Gemini 2.5 Flash
**Temperature:** 0.1 (deterministic — we want extraction, not creativity)
**Response format:** `application/json` (responseMimeType enforced)
**Where it lives at runtime:** `build/n8n/01_listing_agent.json` → "Code: Build Extraction Body" node.

This file is the source of truth. The n8n node is the runtime copy. When the prompt changes here, bump the version (`.v2`, `.v3` …) and update both the JSON node and the `prompt_version` field that the agent writes to `agent_events`.

---

## Who reads this prompt

The Listing Agent reads unstructured project information pasted by a sales head — a paragraph from a broker WhatsApp forward, a brochure excerpt, a CSV row, anything — and turns it into a clean row in the `properties` table.

It is the only agent in the system that touches a *new* property record. Every downstream agent (Ad, Lead matching, Nurture's project pitch) reads what this one writes. So getting this right matters more than the others.

---

## System prompt (canonical)

> You are the Listing Agent for an Indian residential real estate sales platform. Read unstructured project information and extract structured fields. Output a single JSON object with the exact keys: `project_name` (string), `developer` (string), `city` (must be one of: 'Delhi NCR', 'Mumbai', 'Pune', 'Bangalore'), `locality` (string), `config` (string like '2BHK, 3BHK'), `price_min_lakhs` (number, in INR lakhs), `price_max_lakhs` (number, in INR lakhs), `carpet_area_sqft` (string like '650-1100'), `rera_number` (string or null if not stated), `possession_date` (string like 'Dec 2027'), `amenities` (array of strings), `highlights` (array of strings).
>
> Indian conventions: 1 Cr = 100 lakhs; 1.5Cr = 150 lakhs; budget like '1.6Cr' = 160 lakhs.
>
> If a field is genuinely missing from the input, use `null` (do NOT invent). Do NOT fabricate RERA numbers. No prose, no markdown fences.

## User prompt (template)

```
PROJECT INFO:
{raw_text}

Extract the structured fields. Return ONLY the JSON object.
```

---

## Output schema

```json
{
  "project_name": "string",
  "developer": "string | null",
  "city": "Delhi NCR | Mumbai | Pune | Bangalore",
  "locality": "string | null",
  "config": "string | null",
  "price_min_lakhs": "number | null",
  "price_max_lakhs": "number | null",
  "carpet_area_sqft": "string | null",
  "rera_number": "string | null",
  "possession_date": "string | null",
  "amenities": ["string"],
  "highlights": ["string"]
}
```

## Validation contract (post-extraction, in the n8n Code node)

The Code node downstream of Gemini enforces:

- `project_name` must be non-empty
- `city` must be in the allowed-four list
- All numeric fields are `Number()`-coerced; `NaN` → `null`
- `amenities` and `highlights` default to `[]` if missing

If either required field fails, the webhook returns `{ ok: false, error, extracted }` instead of inserting. The dashboard surfaces the error to the sales head with a `Try again` button — we never silently store a half-extracted record.

---

## Prompt design notes — why each clause is here

| Clause | Reason |
|---|---|
| "Output a single JSON object with the exact keys…" | Gemini sometimes wraps JSON in markdown fences or prose. Naming the keys explicitly cuts down on hallucinated field renames. |
| "must be one of: 'Delhi NCR', …" | Without the constraint Gemini returns "NCR", "Delhi-NCR", "Greater Noida". Downstream city filter breaks. |
| "Indian conventions: 1 Cr = 100 lakhs" | Without this, "1.6Cr" comes back as `price_min_lakhs: 1.6`. With it, comes back as `160`. This single line was responsible for ~40% of v0 eval misses. |
| "If a field is genuinely missing… use `null` (do NOT invent)" | Real estate listings have huge variance — a broker WhatsApp will skip 8 of 12 fields. We need `null`, not invented data. Especially RERA. |
| "Do NOT fabricate RERA numbers" | Said twice on purpose. RERA fabrication is a compliance risk (RERA Act §3) — a fake RERA in our DB could surface in a future ad and create developer liability. |
| "No prose, no markdown fences" | Defensive against Gemini's "Here is the JSON: ```json …```" failure mode. |

---

## Eval set (v1 — to be expanded)

Drop test inputs in `build/prompts/_evals/listing_extraction/` as numbered text files with a sibling `.expected.json`. The Listing Agent eval script (TODO: post-demo) runs each input through the prompt and diffs against expected.

The 10 v0 evals that informed this prompt covered:

1. Plain paragraph from a developer WhatsApp
2. Brochure paste (mixed English + abbreviations)
3. CSV row with quoted-comma fields
4. Listing with price in Cr only
5. Listing with price in lakhs only
6. Listing with no RERA mentioned
7. Listing with multiple configs (2/3/4 BHK)
8. Listing with possession quarter (Q3 2027) not month
9. Mumbai listing with "near" landmarks (locality inference)
10. Bangalore listing with metric area (sq m) — must convert or null

---

## Known limits + post-demo upgrades (from AGENT_AUDIT.md)

- **No confidence score yet.** v2 should ask the model to return a per-field confidence so the dashboard can flag low-confidence rows for manager review before they reach the catalogue.
- **No deduplication.** Two pastes of the same project create two rows. v2 adds upsert by `rera_number` and a fuzzy match on `(project_name, developer, city)` for the no-RERA case.
- **No image extraction.** Brochures are mostly images; v2 should accept image URLs and let Gemini Vision read the spec sheet directly.
- **No source URL captured.** v2 adds an optional `source_url` field so we know whether this came from MagicBricks, 99acres, a broker WhatsApp, or a developer email.
