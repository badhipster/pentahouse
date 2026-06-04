# Strategic Rebuild Workflow — Lead Agent (+ Nurture handoff)

**Author:** Abhishek Ranjan (PM)
**Date:** 2026-06-03
**Scope:** Re-architect the Lead Agent to ingest heterogeneous ad-form data, normalize it into one fixed intent model, score and rank consistently across projects, and route every lead to activation / gap-fill / human.
**Companion doc:** `SPEC_Autonomous_Activation_Loop_v1.1.md` (the gap-fill branch sits on top of this).

---

## 1. Strategic stance: refactor the I/O, keep the brain

This is **not** a greenfield rebuild. The Lead Agent's scoring core is strong and stays. We rebuild what surrounds it.

**Keep (do not touch the internals):**
- RAG retrieval (Gemini embeddings → pgvector `match_properties_for_inquiry`)
- The four-model retry/fallback chain (Flash → Flash → Flash-Lite → Pro)
- `responseSchema`-enforced structured output + clamp/validate
- Trace IDs, `agent_events`, `agent_logs` observability

**Replace / add (the actual rebuild):**
- A **Normalize Intent** layer in front of scoring (handles variable ad forms)
- **Score on the canonical model only**, add Visit Readiness, add the no-inventory guard
- A **decision/routing brain** behind scoring (purpose gate → 3-way branch → Nurture handoff)
- A **canonical Lead Rank Card** surface for rep/head
- The **conversational loop** (inbound reply → re-normalize → re-score)

**Why this order matters:** everything ranks on the canonical model, so normalization is built and validated *first*. The visible payoff (rank card) and the autonomy (routing, gap-fill) are layered on only once the substrate is trustworthy.

---

## 2. Target architecture (new node flow)

```
Webhook (Meta Ingest / direct)
   │
   ▼
Insert Lead  ──────────────►  store raw_fields (JSONB, untouched)
   │
   ▼
Normalize Intent            ① config map by form_id  ② LLM fallback for unmapped/messy
   │                           → canonical fields + provenance + per-field confidence
   ▼
RAG Retrieve Inventory      region + budget band → matches  OR  no_inventory_match=true
   │
   ▼
Score (on canonical)        Fit · Urgency · Visit Readiness · overall · confidence · rationale
   │                        (no inventory → low Fit, no fabricated match, flag)
   ▼
Persist  ──────────────────►  lead_scores (+ visit_readiness) ; update canonical cols
   │
   ▼
Completeness Check          purpose hard-gate + confidence/fit/missing → data_sufficiency, missing_fields[]
   │
   ▼
THREE-WAY BRANCH
   ├─ sufficient + hot ───►  Nurture: ACTIVATION draft (visit/brochure)
   ├─ insufficient ───────►  Nurture: GAP-FILL question (top 1–2 missing) [+escalation if low conf]
   └─ disqualify/escalate ►  escalation only (no buyer message)
   │
   ▼
Emit events + logs + respond (one trace_id)

Loop:  inbound reply → extract/normalize → fill gaps → re-score → re-branch (cap 2 turns)
```

---

## 3. Data model changes

| Object | Change | Why |
|---|---|---|
| `leads.raw_fields` | New JSONB column | Store whatever each ad form sent, untouched |
| `leads.field_provenance` | New JSONB | Per canonical field: `from_form` / `llm_inferred` / `missing` + confidence — powers the card and the gap-fill |
| `form_field_map` | New table keyed by `form_id` | Deterministic mapping of form keys → canonical fields per campaign |
| `lead_scores.visit_readiness_score` | New column (0–100) | The third concept-note score; drives the activation decision |
| `v_lead_rank_card` | New view | Assembles the one consistent card (scores + canonical intent + captured/missing + attribution) |
| `v_lead_queue` | Extend | Sort the single ranked queue off the canonical scores |

Canonical intent columns already exist (`purpose`, `budget_lakhs`, `preferred_config`, `purchase_timeline`, `preferred_locality`, `loan_status`) — they become the *normalized output*, not the *raw input*.

---

## 4. Phased rebuild workflow

Each phase is independently shippable and testable. Build behind a feature flag so the existing flow keeps running until each phase passes its gate.

### Phase 0 — Freeze the canonical contract (0.5 day)
- **Goal:** lock the canonical intent model + scoring output schema so everything downstream builds against a stable contract.
- **Build:** write the canonical field list, value enums (config, purpose, budget bands), and the score schema (Fit/Urgency/Visit Readiness/overall/confidence) into one reference. Add the new columns/tables (migrations).
- **Gate:** migrations apply cleanly; schema doc reviewed.

### Phase 1 — Intent Normalization layer (2 days) — *the unlock*
- **Goal:** any ad form, known or new, produces a clean canonical profile.
- **Build:** `Normalize Intent` node — (1) deterministic map via `form_field_map` for known `form_id`s; (2) Gemini fallback for unmapped keys / messy values, normalizing units and enums; emit provenance + confidence per field. Persist `raw_fields`.
- **Gate:** feed 3 deliberately different mock forms (luxury villa, budget 2BHK, plot/investor) → all produce the same canonical shape; provenance correctly distinguishes mapped vs inferred vs missing.

### Phase 2 — Scoring upgrade (1 day)
- **Goal:** scores are computed on canonical fields only and are cross-project comparable.
- **Build:** point the existing scoring prompt at canonical fields; add `visit_readiness_score` to the responseSchema; add the **no-inventory guard** (zero RAG rows → `no_inventory_match`, low Fit, no fabricated match, flag).
- **Gate:** same buyer intent against two different projects yields comparable, explainable scores; a region with no inventory never returns a fabricated match.

### Phase 3 — Decision & routing brain + Nurture handoff (2 days)
- **Goal:** every scored lead is routed, autonomously.
- **Build:** `Completeness Check` (purpose hard-gate + confidence<50 / fit<40 / >2 missing); the three-way branch; two HTTP calls to Nurture (`activation`, `intent_gap_fill`) with `missing_fields` + `trace_id`; keep escalation in parallel for low-confidence. Add the `intent_gap_fill` template in the Nurture Agent (asks top 1–2 canonical gaps, project-aware, buyer language).
- **Gate:** the four routing acceptance tests from the spec pass; trace_id is unbroken across Lead → Nurture in `v_agent_traces`.

### Phase 4 — Lead Rank Card (1.5 days) — *the visible payoff*
- **Goal:** rep/head see one consistent, sortable card for every lead.
- **Build:** `v_lead_rank_card` + the card UI: heat, three scores + rationale, canonical intent with captured/missing chips, source/project/campaign, completeness % + confidence, recommended next action/question, last activity. Single ranked queue.
- **Gate:** leads from different campaigns render identically and sort on one scale; missing fields visibly map to what gap-fill is chasing.

### Phase 5 — Conversational loop (2 days) — *depends on WhatsApp Cloud API*
- **Goal:** buyer replies fill gaps and re-rank the lead.
- **Build:** `08_inbound_reply` workflow on the **Meta WhatsApp Cloud API** (free tier); extract via `intent_extraction.md` → re-normalize into canonical → fill only empty fields → debounced re-score → re-branch; cap at 2 gap-fill turns then hand to human.
- **Gate:** a reply lifts `intent_fields_count`, writes a new score, and moves the lead's card; a known number maps correctly, an unknown number is logged and dropped.

### Phase 6 — Eval + hardening (1 day)
- **Goal:** prove ranking quality and consistency.
- **Build:** run the 15-lead eval set through the new pipeline; compare ranks to ground truth; measure normalization accuracy (canonical fields correctly extracted) and end-to-end first-draft latency.
- **Gate:** scoring alignment ≥ target on eval set; normalization accuracy reported; <60s auto-draft confirmed.

---

## 5. Sequencing rationale & risk

- **Normalization is the critical path.** Until canonical output is trustworthy, the rank card, gap-fill, and scoring consistency are all untestable. It ships first and is gated hardest.
- **Phase 5 is the only externally-blocked phase** (WhatsApp Cloud API approval / template review has a clock). Start that paperwork on Day 1 in parallel; if it slips, Phases 0–4 + 6 still deliver a fully consistent, autonomously-routing Lead Agent with a working rank card — the conversational reply just lands later.
- **Feature-flag every phase** so the current working demo path is never broken mid-rebuild.
- **Biggest design risk:** the LLM normalization fallback mis-mapping a field (e.g. reading "2-3 BHK" as 2BHK). Mitigation: provenance + confidence on every field, low-confidence normalized fields count as "missing" for the gap-fill so the buyer confirms them, and the rank card flags inferred fields distinctly.

---

## 6. One-line summary

Keep the scoring brain; rebuild the body around it — **normalize any ad form into one fixed intent model, score and rank on that model, route every lead to activation / ask-for-more / human, and show it all on a single canonical rank card** — built normalization-first, behind feature flags, with the WhatsApp reply loop as the only externally-gated phase.
