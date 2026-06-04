# n8n Workflow Changelog — v2 (Audit Implementation)

This document captures every n8n workflow change made to implement the Week 1 quick wins from `build/docs/AGENT_AUDIT.md`. Use it to:

1. Know what to re-import in your n8n instance.
2. Understand which audit items each change closes.
3. Run targeted smoke tests for each agent.

Demo on 2026-06-01 was cancelled in favour of getting to pilot-ready first. These v2 changes are now safe to deploy.

---

## Prerequisites (run before re-importing the workflows)

Apply these migrations to Supabase in order:

1. `supabase/migrations/0005_observability_columns.sql` — adds `trace_id`, `confidence`, `model_used`, `latency_ms`, `prompt_version` to `agent_events` + `v_agent_traces` view.
2. `supabase/migrations/0006_upsert_property_function.sql` — adds the `upsert_property(...)` RPC the Listing Agent now calls.

Both are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`).

Also ensure `SUPABASE_URL` is set as an n8n environment variable (used by the Listing Agent's new HTTP node for the RPC call). The existing `supabaseApi` credential continues to be used everywhere else.

---

## 01_listing_agent.json — v2

**Audit items closed:** 1.1, 1.2, 1.3, 1.6, Day 5 (trace_id).

| Change | Node | Why |
|---|---|---|
| System prompt expanded with per-field `confidence` (0-100) + `review_needed` + `review_reason` schema | `Code: Build Extraction Body` | 1.3, 1.6: low-confidence rows are now held as `status = 'Upcoming'` until a human reviews. |
| `trace_id` generated at start, latency timer started, `prompt_version` bumped to `listing_extraction.v2` | `Code: Build Extraction Body` | Day 5: foundation for tracing. |
| Confidence + review parsing, status decision (Active vs Upcoming), latency calc, trace propagation | `Code: Parse & Validate` | Same. |
| Direct Insert replaced with HTTP call to `upsert_property` RPC. Returns `{ id, action_taken, matched_on }`. | `Supabase: Upsert Property (RPC)` (new name, same node id) | 1.1, 1.2: dedup by RERA first, fuzzy match by (project_name + developer + city) second, else INSERT. |
| Downstream nodes (`Emit LISTING_SYNCED`, `Log Success`, `Respond`) read `$('Supabase: Upsert Property (RPC)').first().json[0].id` instead of `.json.id` | Multiple | RPC returns an array; first row has the resolved property id and action taken. |
| `LISTING_SYNCED` event now writes `trace_id`, `confidence`, `model_used`, `latency_ms`, `prompt_version` + a payload that includes `action_taken`, `matched_on`, `review_needed`, `confidence_by_field`. | `Supabase: Emit LISTING_SYNCED` | Day 5 + observability. |
| Log status flips to `warning` when `review_needed` is true even if RERA is present. | `Supabase: Log Success` | Surfaces low-confidence rows in the activity feed. |

**Smoke test:**
- Paste a known-good project text → expect `action_taken: 'insert'` and `Active` status.
- Paste the same text again → expect `action_taken: 'update_by_rera'` and the same `property_id` returned.
- Paste a deliberately ambiguous text ("a 2BHK somewhere in NCR maybe") → expect `review_needed: true`, `status: 'Upcoming'`, log row tagged `warning`.

---

## 02_ad_agent.json — v2

**Audit items closed:** 2.1, 2.5, Day 5 (trace_id).

| Change | Node | Why |
|---|---|---|
| New node: pulls the most recent 6 campaigns for the property. | `Supabase: Get Previous Campaigns` (new) | 2.1: gives Gemini context on what it has already drafted. |
| Prompt expanded with `PREVIOUS_CAMPAIGNS` block. Banned phrases listed explicitly (RERA Act §11). Output schema adds `novelty_note`. | `Code: Build Ad Body` | 2.1 + compliance hardening. |
| Temperature dropped from 0.5 to 0.2. Combined with deterministic seed (below), regenerating ads twice in a row returns the same output. | `Code: Build Ad Body` (`generationConfig`) | 2.5 + reproducibility. |
| Simulation now uses a Mulberry32 PRNG seeded by `(property_id + ISO date + platform)`. Same inputs → same metrics. | `Code: Parse & Simulate` | 2.5: demo + eval reproducibility. |
| Trace propagation: `trace_id`, `model_used`, `latency_ms`, `prompt_version` baked into the `CAMPAIGN_LIVE` event. Payload includes `prev_campaign_count` and `novelty_note`. | `Supabase: Emit CAMPAIGN_LIVE` | Day 5 + observability. |
| Connection updated: `Get Property` → `Get Previous Campaigns` → `Code: Build Ad Body`. | `connections` map | Structural change. |

**Smoke test:**
- Generate ads for a brand-new property (no campaigns yet) → `prev_campaign_count: 0`, `novelty_note: 'first campaign for this property'`.
- Generate ads for the same property a second time → `prev_campaign_count: 3` (the just-inserted ones), `novelty_note` should mention varying from the prior set.
- Generate ads twice without changing the date → metrics should match exactly between runs.

---

## 03_lead_agent.json — v2

**Audit items closed:** 3.3, Day 5 (trace_id).

| Change | Node | Why |
|---|---|---|
| Property filter now also applies a budget-band overlap (`lead.budget_lakhs ±20%` overlaps `[price_min_lakhs, price_max_lakhs]`). Skipped if the filter would leave zero candidates. | `Code: Build Context` | 3.3: cuts Gemini context size + sharpens the match. |
| Trace generation: `traceId`, `promptStartedAt`, `promptVersion` (now `lead_scoring.v2`), plus a `filterDiagnostics` block (how many candidates survived each step). | `Code: Build Context` | Day 5 + debugging. |
| `LEAD_SCORED` and `ESCALATION_TRIGGERED` events write `trace_id`, `confidence` (scaled 0-1), `model_used`, `prompt_version`. Payload now includes `filter_diagnostics`. | `Supabase: Emit LEAD_SCORED`, `Supabase: Emit ESCALATION_TRIGGERED` | Day 5 + observability. |

**Smoke test:**
- Submit a lead with `preferred_city = 'Pune'` and `budget_lakhs = 100`. Expect Gemini to score against only Pune properties in roughly the 80-120 lakh band.
- Check the `LEAD_SCORED` event payload's `filter_diagnostics` to confirm `after_city_filter` and `after_budget_filter` make sense.
- Query `v_agent_traces` for the trace_id from this lead — should see one event so far.

---

## 04_nurture_agent.json — no v2 changes yet

Audit items 4.1, 4.4, 4.6, 4.7, 4.9 are big-bet items deferred to v2 phase 1. The trust gate (manager approval) is untouched. Trace propagation for this agent will require fetching the lead's existing trace_id from the most recent `agent_event`, which adds a node we'll do in the phase-1 pass alongside the conversation-summarisation work.

---

## 05_conversion_agent.json — v2

**Audit items closed:** 5.1, 5.5, Day 5 (trace_id).

| Change | Node | Why |
|---|---|---|
| Gemini prompt now requires structured objections: `{ category, severity, evidence }` per item, with severity from `{deal_breaker, negotiation, minor}`. | `Gemini: Extract Objections` (`jsonBody`) | 5.1: makes downstream nurture + escalation decisions data-driven. |
| Parse node returns both `objections` (flat array for the existing `visits.objections TEXT[]` column) and `objections_structured` (full objects). Backwards-compatible. | `Code: Parse Objections` | Preserves existing schema while adding new data. |
| Booking sanity check: `booking_amount / price_mid` must fall between 10% and 50%. Out-of-band bookings get `sanity_check.passed = false` and `needs_review = true` in the `BOOKING_MADE` payload. The booking row still gets created (we never block legit data) but it gets flagged for human review. | `Code: Parse Objections` + `Supabase: Emit BOOKING_MADE` | 5.5: brand and revenue safety at scale. |
| `VISIT_COMPLETED` event payload now includes `objections_structured`, `has_deal_breaker`, `next_step_hint`. Trace + observability columns written. | `Supabase: Emit VISIT_COMPLETED` | Day 5 + 5.1. |
| `BOOKING_MADE` payload extended with `sanity_check` block and `needs_review` flag. | `Supabase: Emit BOOKING_MADE` | 5.5. |

**Smoke test:**
- POST a visit outcome with notes like "Buyer loved the view but cannot move on price; she has a competing offer in Hiranandani." → expect at least one objection with `severity: 'deal_breaker'` or `negotiation` and `has_deal_breaker` correctly set.
- POST a visit outcome with `booking_amount = 50000` for a 2Cr property → expect `sanity_check.passed: false`, `reason: 'token_too_low'`, `needs_review: true` in the BOOKING_MADE event.
- POST a normal booking_amount (e.g. 5% of price band midpoint) → wait, that's < 10%, also flags. Try 15% → `sanity_check.passed: true`.

---

## Re-import procedure in n8n

For each of the 4 changed workflows:

1. In the n8n editor, open the existing workflow.
2. Workflow menu → **Import from File** → pick the updated `.json` from `build/n8n/`.
3. n8n will overwrite the nodes (IDs are preserved so the connection map stays sane).
4. **Re-bind credentials.** All `supabaseApi` nodes will show `REPLACE_AFTER_IMPORT` again. Pick your Supabase account from the dropdown on each.
5. For the Listing Agent's new HTTP node (`Supabase: Upsert Property (RPC)`), ensure the credential dropdown shows your Supabase account too.
6. **Click Publish.** Production runs the last-published snapshot, not the editor canvas. This is the most common cause of "manual works but production fails" — see `memory/n8n_gotchas.md`.

---

## Tracing a buyer journey end-to-end (the v2 payoff)

Once trace propagation is wired all the way through (Lead → Nurture → Conversion needs the Nurture pass, which is phase-1), a single SQL query gives you the full chain:

```sql
SELECT trace_id, event_chain, agents_touched, span_ms / 1000 AS span_seconds, avg_confidence
  FROM v_agent_traces
 WHERE lead_id = '<some-lead-uuid>'
 ORDER BY started_at DESC;
```

For now (Lead + Conversion threading done, Nurture pending) you get the lead-side trace and the visit-side trace separately. Phase 1 stitches them by fetching the lead's trace_id when the Nurture Agent draft starts.

---

## What this changelog does NOT cover

- Multi-tenant data isolation (audit 3g + commercial blocker)
- WhatsApp Business Cloud API migration (audit 4.9)
- Meta Marketing API push (audit 2.4)
- Identity resolution / Contacts table (audit 3.1)
- Re-score on inbound buyer reply (audit 3.2)

These are the v2 phase 1 big bets. They land after a paid pilot is signed, per the commercial thesis in `build/docs/COMMERCIAL_THESIS.md`.
