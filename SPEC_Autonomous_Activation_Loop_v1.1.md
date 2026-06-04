# Feature Spec — Autonomous Activation Loop (Pentahouse v1.1)

**Author:** Abhishek Ranjan (PM)
**Status:** Draft for build
**Date:** 2026-06-03 (rev. 3 — intent-gap branching + decisions locked + WhatsApp Cloud API)
**Parent product:** Pentahouse — RE Marketing & Conversion Intelligence Agent
**Related docs:** `build/PRODUCT_SUMMARY.md`, `PRD_RE_Marketing_Conversion_Intelligence_Agent.md`, `build/n8n/*.json`

---

## Context: why this spec exists

Pentahouse v1.0 shipped five strong AI agents that share a Supabase data plane. But a code review found that the agents do **not** auto-chain. The `PRODUCT_SUMMARY.md` claims a Lead→Nurture auto-trigger exists and is "production-ready," but `03_lead_agent.json` contains no node that calls the Nurture Agent. Every agent-to-agent transition except Meta→Lead is manual. As a result, the product's headline promise — *catch every inquiry and respond in under 60 seconds* — is structurally impossible today, because nothing automatically starts the nurture step after a lead is scored.

This spec defines the **Activation Loop**: the event-driven connective tissue that turns five tools into one autonomous, observable funnel, and closes the conversational and reminder gaps that make the "intent intelligence" claim real rather than asserted.

**The corrected mental model (rev. 2).** Leads arrive from ad campaigns with whatever the ad form captured — often partial. The Lead Agent's job is to score on that data and then decide one of two things: if the captured intent is rich enough to act on, draft an **activation** message (visit invite / brochure); if it is too thin to score confidently, draft a **gap-fill** message that asks the buyer for the specific missing fields in the simplest, most engaging way possible. WhatsApp is therefore a *gap-filler the scoring agent triggers when data is missing*, not a cold qualifier sent to every lead. The buyer's reply is parsed, fills the gaps, and re-scores the lead — which may then cross into the activation path. This is a tighter, lower-spam design than the concept note's "send the first question to everyone" model and it reuses ad-captured data instead of re-asking for it.

This is **v1.1**, scoped to be buildable in ~1 week on the existing stack (n8n + Supabase + Gemini + Twilio). It does not introduce new infrastructure.

---

## Problem Statement

A scored hot lead currently sits inert until a human manually fires the Nurture Agent webhook, so the median first-response time the product is sold on cannot be achieved, and the "<60 second WhatsApp reply" claim is unsupported by the workflow. Separately, buyer replies have nowhere to land (no inbound Twilio webhook), scheduled visits get no reminders, and manager rejection reasons are recorded but never used — so three of the loops the product advertises are open. Every week this stays true, the demo metric is a number on a slide rather than a behavior of the system, and a judge or pilot customer testing end-to-end will hit the gap immediately.

---

## Goals

1. **Make the funnel autonomous.** A new lead that scores at or above the hot threshold results in a drafted WhatsApp message in the approval queue with zero human action in between, in under 60 seconds end to end (measured `lead.created_at` → `messages.created_at`).
2. **Make the headline metric real and measured, not hardcoded.** Replace the hardcoded 47s with a value computed from `v_speed_to_lead` over real workflow runs, and have it reflect the auto-activation path.
3. **Close the conversation loop.** A buyer's WhatsApp reply is ingested, parsed for intent fields, written to the lead, and triggers a re-score — so intent completeness rises over a conversation instead of being frozen at intake.
4. **Cut no-shows with reminders.** Every scheduled visit receives a T-24h and T-2h reminder draft, gated through the same approval surface, with a measurable reduction target on no-show rate.
5. **Turn rejection signal into model improvement.** Manager rejection reasons feed back into the nurture drafting prompt as negative examples, lowering the rejection rate over successive drafts.

---

## Non-Goals

1. **Real ad-platform posting (Meta Marketing / Google Ads API).** Remains v2. This spec is about the inquiry→booking activation loop, not ad publishing.
2. **Multi-tenancy / aggregator portal.** A separate infrastructure initiative; activation logic should be written tenant-agnostic but multi-tenancy is not built here.
3. **Full conversational AI agent over WhatsApp (open-ended chat).** v1.1 parses replies for intent and re-scores; it does not hold a free-form multi-turn negotiation. Bounded scope keeps the approval gate meaningful.
4. **Dashboard authentication overhaul.** RBAC exists; replacing the hardcoded `approved_by` is in scope (small), but a full auth/SSO rework is not.
5. **Closed-loop ad budget optimization.** Depends on real spend data, which depends on ad posting (v2).

---

## User Stories

### Sales Head (Priya)
- As a sales head, I want a hot lead to automatically produce a drafted WhatsApp reply in my approval queue, so that I can approve a response within seconds instead of remembering to trigger anything.
- As a sales head, I want the approval queue to show which trigger produced each draft (hot score, buyer reply, visit reminder), so that I understand why the system is messaging this buyer.
- As a sales head, I want approvals attributed to the actual logged-in approver, so that my MD's audit trail is true.

### Sales Rep (Rohit)
- As a sales rep, I want a buyer's WhatsApp reply to update the lead's intent fields and score automatically, so that my queue re-ranks as buyers reveal budget, timeline, and config.
- As a sales rep, I want visit reminders to go out automatically (after approval), so that fewer of my booked visits no-show.

### Marketing Lead (Meera)
- As a marketing lead, I want the first-response-time metric to reflect real automated runs, so that the number I report upward is defensible.

### System / PM (observability)
- As the PM, I want every activation hop (`LEAD_SCORED → DRAFT_REQUESTED`, `REPLY_RECEIVED → LEAD_RESCORED`, `REMINDER_DUE → DRAFT_REQUESTED`) emitted as an `agent_event` with a shared `trace_id`, so that the journey timeline shows an unbroken chain.

---

## Requirements

### P0 — Must-have (the funnel is not autonomous without these)

**P0-1: Lead → Nurture activation with intent-gap branching**
After `Code: Parse and Validate Score`, the Lead Agent classifies the lead into one of three outcomes and, for two of them, calls the Nurture Agent's `/webhook/draft-message` with the appropriate template. This replaces the naive "score ≥ 70 → send visit invite" idea with the gap-fill-aware branch.

**Step A — Missing-information detector (new node `Code: Intent Completeness`).**
Evaluate the intent fields and produce `missing_fields[]`, `critical_missing_count`, and a `data_sufficiency` verdict (`sufficient` | `insufficient`). The verdict logic, per the resolved decisions:

- **`purpose` is a hard gate.** Without purpose the agent cannot branch or score meaningfully, so if `purpose` is null → `insufficient`, regardless of anything else, and `purpose` is asked first. This is the primary "needs more info" trigger.
- Beyond purpose, the verdict also considers the **score signals**: mark `insufficient` if `confidence < 50` **OR** `fit_score < FIT_FLOOR` (default 40) **OR** `critical_missing_count > 2` across the remaining fields (`budget_lakhs`, `preferred_config`, `purchase_timeline`, `preferred_locality`/city, `loan_status`).
- Otherwise → `sufficient`.
- Field ask-priority order: **purpose → budget → timeline → config → locality → loan.**

**Step A.1 — No-inventory guard (RAG reality).** RAG is only useful when matching inventory exists for the buyer's region/budget. If `HTTP: RAG Match Properties` returns zero rows (no projects in the buyer's preferred city/region), set `no_inventory_match = true`. In that case the agent must **not** fabricate a match: `matched_property_id` stays null, fit is scored low, and the lead is flagged for manager review rather than pushed down the activation path. (Still ask for `purpose` if missing — knowing what they want is useful even when current inventory can't serve it.)

**Step B — Three-way branch:**

1. **Activation path** — `data_sufficiency = sufficient` AND `recommended_action ∈ {Schedule site visit, Send brochure}` AND `overall_score >= HOT_THRESHOLD` (default 70):
   - Call `/webhook/draft-message` with `{ lead_id, desired_template: <derived from recommended_action>, trigger_event: 'lead_scored_hot', missing_fields: [], trace_id }`.

2. **Gap-fill path** — `data_sufficiency = insufficient` AND `recommended_action ≠ Disqualify`:
   - Call `/webhook/draft-message` with `{ lead_id, desired_template: 'intent_gap_fill', trigger_event: 'intent_gap', missing_fields, ask_limit: MAX_QUESTIONS_PER_TURN (default 2), trace_id }`.
   - The Nurture Agent drafts a short, warm WhatsApp message asking only the top 1–2 missing fields (priority order: purpose → budget → timeline → config → locality → loan), not all of them.

3. **No-message path** — `recommended_action ∈ {Disqualify, Escalate to manager}`, or the lead was routed to the escalations table:
   - No draft. Escalations still flow to the manager via the existing escalation branch.

**Shared requirements:**
- Failure handling: `neverError` true; on failure write an `agent_log` row with status `warning` and still respond to the original webhook. A failed handoff must never black-hole the lead.
- Every draft carries the originating `trace_id` so `v_agent_traces` shows an unbroken chain.
- `missing_fields` and `data_sufficiency` are written to the `LEAD_SCORED` event payload for observability.

*Acceptance criteria:*
- Given a lead with purpose+budget+config+timeline present, confidence 70, score 82, action "Schedule site visit" → an **activation** draft (`trigger_event='lead_scored_hot'`) appears in the approval queue within 60s, no human action.
- Given a lead with only purpose+budget present (4 critical fields missing) → a **gap-fill** draft (`trigger_event='intent_gap'`, `desired_template='intent_gap_fill'`) appears, and its body asks at most 2 questions, prioritized as specified.
- Given a lead with action "Disqualify" → no draft is created.
- Given the data is insufficient *and* confidence < 50 → the lead still also lands in the escalations table (gap-fill and escalation are not mutually exclusive; manager sees it AND the buyer gets asked). *(Confirm this is desired — see Open Questions.)*
- Given the Nurture webhook is down → the lead is still scored and an `agent_log` warning is recorded.

**P0-1b: `intent_gap_fill` nurture template (new in `04_nurture_agent.json` / `prompts/nurture_drafting.md`).**
A draft mode whose goal is qualification, not selling. Inputs: `lead` profile, `missing_fields`, `ask_limit`, matched property (for light personalization), buyer language. Prompt rules: ask only the top `ask_limit` missing fields; one short message; warm and specific to the project they enquired about; give an easy reply path (e.g. ranges to pick from for budget); never invent project facts; output must fit the approved WhatsApp template format (see P0-1c). Status written as `pending_approval` like every other draft.

*Acceptance criteria:*
- Given `missing_fields=[budget_lakhs, purchase_timeline, loan_status]` and `ask_limit=2` → the draft asks about budget and timeline only, in ≤ ~300 characters, referencing the enquired project by name.
- Given the buyer's `language='hi'` → the question is drafted in Hindi.

**P0-1c: WhatsApp business-initiated template constraint.**
A gap-fill message to a lead from an ad form is a **business-initiated** message — a Meta lead form does not open a 24-hour customer-service window. The gap-fill draft must therefore map to a **pre-approved WhatsApp template** with variable slots, not free-form text. Define one parameterized template (e.g. `qualify_v1` with slots for project name + the 1–2 questions) and submit it for WhatsApp approval. Free-form generation is allowed only *after* the buyer replies (inside the opened 24-hour session — see P0-2).

*Acceptance criteria:*
- Given no prior buyer reply → the outbound gap-fill send uses the approved template, not raw Gemini text.
- Given the buyer has replied within 24h → subsequent drafts may be free-form.

**P0-2: Inbound WhatsApp reply ingestion + intent re-score**
New workflow `08_inbound_reply.json`. Inbound webhook from the **Meta WhatsApp Cloud API** (free tier; Twilio sandbox only for local dev) → identify lead by phone → run the existing `intent_extraction.md` prompt over the reply → upsert any newly captured intent fields onto the lead → recompute `intent_fields_count` → call the Lead Agent re-score path (debounced, per resolved decision 6).

- Lead lookup by normalized phone (reuse `check_existing_lead_by_phone`). If no match, log and drop (do not create a ghost lead in v1.1).
- Only overwrite an intent field if it was previously null/empty (never clobber a confirmed value with a lower-confidence parse).
- Persist the inbound message to `messages` with direction `inbound`.
- Emit `REPLY_RECEIVED` and `LEAD_RESCORED` events with `trace_id`.
- **Continue the gap-fill loop after re-score:** the re-score re-runs the P0-1 branch. If now `sufficient` → activation draft. If still `insufficient` → draft the *next* gap-fill question for the remaining `missing_fields`. Enforce a hard cap `MAX_GAP_FILL_TURNS` (default 2): after the cap, stop asking and route the lead to a human instead of nagging. Free-form drafting is permitted here because the buyer's reply opened a 24-hour session.

*Acceptance criteria:*
- Given a known lead replies "3BHK, ready in 6 months, loan pre-approved", when the webhook fires, then `preferred_config`, `purchase_timeline`, and `loan_status` populate if previously empty, and a new `lead_scores` row is written.
- Given an unknown number replies, when the webhook fires, then the message is logged and no lead is created.
- Given a field already held a value, when a reply contradicts it, then the original value is preserved and the conflict is noted in the message payload.

**P0-3: De-hardcode the approval identity and the primary metric**
- Replace `approved_by: "priya@dev.in"` in `04_nurture_agent.json` with the approver identity passed from the dashboard approve action (fall back to a config var, not a person's email).
- Replace `median = 47` fallback in `data.ts` with the real `v_speed_to_lead` value; if the view is empty, show an explicit empty state ("No measured responses yet"), not a fabricated number.

*Acceptance criteria:*
- Given two different users approve two messages, when the rows are inspected, then `approved_by` differs and matches the actual approver.
- Given an empty metrics view, when `/today` loads, then no hardcoded latency number is shown.

### P1 — Should-have (fast follow, high value)

**P1-1: Scheduled visit reminders (T-24h, T-2h)**
New workflow `09_visit_reminders.json` on a Schedule Trigger (every 15 min). Query visits where status is Scheduled/Confirmed and `scheduled_at` falls in the 24h or 2h window and the corresponding reminder has not been sent. For each, call `/webhook/draft-message` with a reminder template. Add `reminder_24h_sent` / `reminder_2h_sent` booleans to `visits` via migration.

*Acceptance criteria:*
- Given a visit scheduled 24h out with no reminder sent, when the scheduler runs, then exactly one reminder draft is queued and the flag flips.
- Given the scheduler runs twice in the window, then no duplicate reminder is queued.

**P1-2: Rejection feedback into nurture prompt**
When a draft is rejected with a structured reason, append the (reason, rejected draft) pair to the negative-examples block of the next `nurture_drafting` prompt for that lead/template. Read the last N rejections for the template at draft time.

*Acceptance criteria:*
- Given a draft was rejected "Tone too pushy", when the next draft for that lead is generated, then the prompt context includes that rejection as a negative example.
- Rejection rate per template is queryable over time.

### P2 — Future considerations (design for, don't build now)

- **Booking link in hot message** (depends on Calendar slot availability surfacing).
- **Drip sequences for warm leads** (state machine over `lead.stage`; design the event names now so they slot in).
- **Consent / opt-out management** (DPDP) — reserve a `consent_status` field on lead now.
- **Cold-lead long-cycle re-engagement.**

---

## Success Metrics

### Leading indicators (days)
- **Auto-activation rate:** % of hot leads that produce a draft with no manual trigger. Target: 100% of qualifying leads. Method: count `messages` rows with `trigger_event='lead_scored_hot'` ÷ hot leads.
- **End-to-end first-draft latency:** median `lead.created_at` → `messages.created_at` for the auto path. Target: < 60s. Success threshold: < 90s; stretch: < 30s.
- **Reply-to-rescore rate:** % of inbound replies that result in a new `lead_scores` row. Target: > 95% for known leads.
- **Intent completion lift:** average `intent_fields_count` at intake vs. after first reply. Target: +2 fields.

### Lagging indicators (weeks)
- **No-show rate** on reminded vs. non-reminded visits. Target: relative reduction ≥ 20%.
- **Draft rejection rate** trend after rejection-feedback ships. Target: downward, < 30%.
- **Median first-response time** reported to leadership, now backed by `v_speed_to_lead`.

---

## Resolved Decisions (rev. 3 — locked)

1. **"Needs more info" trigger:** `purpose` missing is the hard gate (always gap-fill, ask purpose first). Beyond that, `insufficient` when `confidence < 50` OR `fit_score < 40` OR more than 2 of the remaining critical fields absent. Confidence and fit score are first-class inputs, not just field counts.
2. **Approval vs auto-send:** auto-send the *first* gap-fill question (approved template, low risk); route any free-form follow-up after the buyer replies through manager approval.
3. **Gap-fill cap:** `MAX_GAP_FILL_TURNS = 2`, then hand to a human.
4. **Escalation + gap-fill:** do both — an insufficient + low-confidence lead lands in the escalations table *and* gets a gap-fill question. Manager is aware, buyer is asked, in parallel.
5. **RAG scope:** RAG is purely inventory matching and is only authoritative when projects exist in the buyer's region. No regional inventory → `no_inventory_match = true`, no fabricated match, flag for manager (see Step A.1).
6. **Re-score debounce:** yes — re-score at most once per lead per short window to protect free-tier quota.
7. **Messaging provider — free only:** use the **Meta WhatsApp Cloud API free tier** for business-initiated templates (the realistic free path for real lead numbers; the Twilio sandbox can't message arbitrary leads). Keep the Twilio sandbox for local dev/testing only. Gemini stays on its free tier; the debounce in (6) keeps re-scoring inside free limits.
8. **CRM:** EspoCRM is **not connected** and is not a dependency for v1.1. The existing EspoCRM push node stays optional/no-op (env-gated); do not let any activation logic depend on it. `HOT_THRESHOLD` is therefore an internal Pentahouse value (default 70), not inherited from EspoCRM.

## Open Questions (remaining, non-blocking)

- **[Data] Reminder windows:** are T-24h/T-2h the right intervals for Indian site visits, or is same-morning more effective? Revisit with pilot data.
- **[Product] Very-high-confidence auto-send of activation messages:** gap-fill auto-sends; should a 95/90 *activation* (selling) message ever auto-send, or always wait for approval? Default: always approve selling messages. Confirm with pilot.

---

## Timeline / Phasing

One build week on the existing stack, sequenced so the demo-critical gap closes first:

- **Day 1–2 (P0-1):** Missing-information detector + three-way branch (activation / gap-fill / no-message) + `intent_gap_fill` template + the approved WhatsApp template (P0-1c) + trace propagation. This makes the `PRODUCT_SUMMARY.md` claim true, the <60s metric achievable, and implements the gap-fill flow as the corrected activation path.
- **Day 2 (P0-3):** De-hardcode `approved_by` and the 47s metric (small, do alongside).
- **Day 3–4 (P0-2):** Inbound reply workflow + intent re-score, gated on resolving the Twilio routing and debounce questions.
- **Day 5 (P1-1):** Scheduled reminders + migration.
- **Day 6 (P1-2):** Rejection-feedback into the prompt.
- **Day 7:** End-to-end verification — run a fresh lead through Meta-ingest → score → auto-draft → approve → send → reply → re-score → visit → reminder → outcome, confirming one unbroken `trace_id` chain in `v_agent_traces`.

**Dependency note:** P0-2 may pull the WhatsApp Business Cloud API migration forward; if the sandbox cannot receive inbound, do P0-1, P0-3, P1-1, P1-2 first and treat inbound as the migration's first feature.

---

## Definition of done

A lead created via the Meta-ingest or `/webhook/new-lead` path results, with no human intervention, in: a score, a completeness verdict, and either an **activation** draft (data sufficient + hot) or a **gap-fill** draft asking for the top missing fields (data insufficient) — or neither, if disqualified/escalated — all sharing one observable `trace_id`. A buyer reply parses into the missing fields, re-scores, and either advances to activation or asks the next gap-fill question, capped so the buyer is never nagged. Scheduled visits generate reminders. Rejections shape the next draft. The `PRODUCT_SUMMARY.md` scorecard line "Lead-to-Nurture handoff ✅" is backed by a node that actually exists, and every metric the dashboard shows is computed, not hardcoded.
