# Ad Agent — Platform Creative Drafting Prompt

**File version:** `ad_drafting.v1`
**Model:** Gemini 2.5 Flash
**Temperature:** 0.5 (some creative variance, but anchored to facts)
**Response format:** `application/json`
**Where it lives at runtime:** `build/n8n/02_ad_agent.json` → "Code: Build Ad Body" node.

This is the source of truth. The n8n node mirrors it. Bump version on change.

---

## Who reads this prompt

The Ad Agent reads a freshly added property row and drafts three platform-specific ad creatives that a marketing lead reviews before publishing. It does *not* publish. It writes drafts to the `campaigns` table with `status = 'Draft'`, and the dashboard surfaces them for human approval — same trust gate as the Nurture Agent's WhatsApp drafts.

The three platforms we draft for, and why:

| Platform | Why we treat it differently | Character budget |
|---|---|---|
| **Meta** (FB + Instagram) | Mobile feed, emotion-led, scrolling buyer. One sentence has to stop the thumb. | 180 chars ad copy |
| **Google Search** | Intent-led. The buyer typed "3BHK Andheri under 2Cr". We match the query. | 30-char headline · 90-char description |
| **Real-estate portals** (99acres, MagicBricks, Housing.com) | Specs-led. The buyer is comparing 12 listings. They want what-you-get, not vibes. | 60-char headline · 150-char description |

---

## System prompt (canonical)

> You are the Ad Agent for an Indian residential real estate sales platform. Given a property record, draft platform-specific ad creatives that a marketing lead can review and publish. Ground every claim ONLY in the provided property; do not invent prices, possession dates, or amenities. Use Indian conventions (lakhs/Cr; BHK; sqft).
>
> Platform constraints:
> - **meta**: 1-2 punchy sentences, conversational, mobile-first, no emoji (only one at the end if natural). Up to 180 chars.
> - **google**: a 30-char headline AND a 90-char description, concatenated as 'HEADLINE | DESCRIPTION'. Factual, intent-matched.
> - **portal**: a 60-char headline AND a 150-char description, concatenated as 'HEADLINE | DESCRIPTION'. Specs-heavy, what-you-get focused.
>
> For each platform also produce `target_audience`: a single sentence describing age band, household income, geo, and intent signals appropriate to that platform and that property's price tier.
>
> Output a single JSON object with exactly these keys: `{ meta: { ad_copy, target_audience }, google: { ad_copy, target_audience }, portal: { ad_copy, target_audience } }`. No prose, no markdown fences.

## User prompt (template)

```
PROPERTY:
{
  "project_name": "{{ project_name }}",
  "developer": "{{ developer }}",
  "city": "{{ city }}",
  "locality": "{{ locality }}",
  "config": "{{ config }}",
  "price_min_lakhs": {{ price_min_lakhs }},
  "price_max_lakhs": {{ price_max_lakhs }},
  "possession_date": "{{ possession_date }}",
  "highlights": [{{ first 6 highlights }}],
  "amenities": [{{ first 6 amenities }}]
}

Draft the 3 platform creatives. Return ONLY the JSON object.
```

---

## Output schema

```json
{
  "meta":   { "ad_copy": "string ≤180 chars", "target_audience": "string" },
  "google": { "ad_copy": "HEADLINE ≤30 | DESCRIPTION ≤90", "target_audience": "string" },
  "portal": { "ad_copy": "HEADLINE ≤60 | DESCRIPTION ≤150", "target_audience": "string" }
}
```

After Gemini returns, the dashboard parses Google + portal copy on the `|` separator and renders them in platform-accurate previews (`MetaPreview`, `GooglePreview`, `PortalPreview` in `routes/properties.$id.tsx`).

---

## Prompt design notes — why each clause is here

| Clause | Reason |
|---|---|
| "Ground every claim ONLY in the provided property" | Without this Gemini adds "Limited inventory!" and "Special launch price!" even when neither is in the source. Those phrases create RERA Act §11 advertising-claim liability. |
| "do not invent prices, possession dates, or amenities" | Said separately because they're the three fields with the highest compliance risk if hallucinated. |
| Per-platform character budgets in the prompt itself | Letting Gemini count its own characters is unreliable. Putting the budgets in the prompt cuts overrun by ~70%. The Code node downstream still truncates as a safety net. |
| `target_audience` field | The marketing lead's *next* question after seeing copy is always "who is this for?" Bundling audience with copy saves a round-trip and forces the model to align messaging to a buyer mental model. |
| Concatenating Google and portal as `HEADLINE \| DESCRIPTION` | Gemini's structured-output mode is fragile under nested objects. Single-string concatenation parses reliably; we split on `|` after. |

---

## Audience tier guide (informs Gemini's `target_audience` output)

The prompt does not currently hard-code these tiers — Gemini infers from `price_min_lakhs`. v2 will pass these in explicitly so behaviour is reproducible.

| Price band | Implied buyer tier | Typical audience hint |
|---|---|---|
| < 60 lakhs | First-home, EMI-led | 25-35, household income 8-15 LPA, sub-tier metros, intent: rent-to-own |
| 60-150 lakhs | Mid-market upgrader | 32-45, household income 18-40 LPA, primary metros, intent: family-size upgrade |
| 150-400 lakhs | Premium / mid-luxury | 38-55, household income 40-90 LPA, prime localities, intent: lifestyle + school zone |
| 400+ lakhs | Luxury / HNI | 42-65, household income 90+ LPA, signature locations, intent: status + appreciation |

---

## Known limits + post-demo upgrades (from AGENT_AUDIT.md)

- **No prior-campaign context.** Each draft is generated in a vacuum. v2 passes the last 3 campaigns for the property so Gemini can vary angles rather than repeat them.
- **No deterministic seed.** Two clicks of "Generate ads" return two different drafts. v2 will set `temperature: 0.2` and pass a fixed seed surrogate (e.g. property_id) so a regenerate-after-edit is reproducible.
- **No A/B sibling generation.** v2 should ask for 2 variants per platform so the manager picks rather than approves-or-rejects.
- **No CPL projection in this prompt.** The dashboard shows a projected CPL but it's currently a static rule (based on price band + city). v2 should let Gemini also output a `projected_cpl_inr` with reasoning, grounded in historical campaign data from `v_source_roi`.
- **No compliance pre-check.** v2 should run a regex on Gemini's output for banned phrases ("guaranteed return", "100% safe", any percentage promise) before writing to `campaigns`. Compliance is the audit doc's biggest enterprise-readiness gap.
