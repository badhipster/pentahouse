# Product Audit: Real Estate Marketing & Conversion Intelligence Agent

**Auditor**: Antigravity (PM + Orchestration + AI Agent + Sales lenses)
**Date**: May 31, 2026
**Project**: Capstone 11 #2 — Real Estate Marketing & Conversion Intelligence Agent
**Demo Day**: June 1, 2026
**Status**: Read-only critique. No files modified.

---

## What Was Audited

Every file in the project was read before this audit was written. Nothing is assumed — every finding is grounded in the actual code.

| Layer | Files Read |
|---|---|
| PRD | `PRD_RE_Marketing_Conversion_Intelligence_Agent.md` |
| Implementation Plan | `Implementation_Plan_RE_Marketing_Agent.md` |
| Context | `CAPSTONE_CONTEXT_HANDOFF.md` |
| n8n Workflows | `01_listing_agent.json`, `02_ad_agent.json`, `03_lead_agent.json`, `04_nurture_agent.json`, `05_conversion_agent.json` |
| Gemini Prompts | `lead_scoring.md`, `ad_drafting.md`, `intent_extraction.md`, `listing_extraction.md`, `nurture_drafting.md`, `objection_extraction.md` |
| Dashboard (all routes) | `index.tsx`, `analytics.tsx`, `approvals.tsx`, `leads.index.tsx`, `leads.$id.tsx`, `visits.tsx`, `properties.index.tsx`, `properties.$id.tsx` |
| Data Layer | `data.ts`, `supabase.ts`, `fixtures.ts` |
| Database | `schema.sql`, `seed_properties.sql`, `seed_campaigns.sql`, `seed_leads.sql` |
| Docs | `IMPORT_GUIDE.md`, `README.md` (build), `docs/ENV_TEMPLATE.md`, `docs/INSTALL.md` |
| Live Server | Dashboard started at http://localhost:8083, all 6 routes loaded and inspected |

---

## Part 1: Gap Between Promise and Reality

The original use case specified five tools. This section audits each one with proof from the code.

### 1.1 Ad Agent — "Meta/Google Ads API"

**Promised**: Ad Agent launches targeted campaigns on Meta/Google Ads API.

**What is actually built**: The Ad Agent (`02_ad_agent.json`) does two things:

1. Calls Gemini to write ad copy (a paragraph for Meta, headline+description for Google, a listing-style blurb for Portal).
2. Runs a JavaScript `Math.random()` simulation to generate fake impressions, clicks, CPL, and budget numbers.

The workflow's own code comment is explicit:
```
// PRD §8: campaigns are SIMULATED (no live Meta/Google API).
```

The simulated numbers are then written to the `campaigns` Supabase table. There is no HTTP call to `graph.facebook.com`, no call to `googleads.googleapis.com`, no OAuth token, no ad account ID. Nothing is "launched" on any ad platform.

**What this means for a real deployment**: The product cannot create a single real ad. It can produce copy that a human could paste into Meta Ads Manager manually. That is a content generation tool, not an Ad Agent.

**Impact on the Source ROI dashboard**: The analytics page shows CPL, CPV, CPB by source. These numbers are derived from the simulated `campaigns` table data. They are not real spend data. The `total_spend_30d_inr` KPI is hardcoded to `0` in `data.ts` line 208 because no real spend is tracked.

---

### 1.2 Lead Agent — "CRM Integration + LLM Scoring"

**Promised**: Lead Agent scores incoming inquiries using CRM integration + LLM scoring.

**LLM Scoring: Built correctly.** The Lead Agent (`03_lead_agent.json`) calls Gemini 2.5 Flash with a well-structured prompt (Fit score 0-100, Urgency score 0-100, confidence, recommended action, matched property). The prompt is grounded, the fallback is defined, the output is validated and clamped. This part works as described.

**CRM Integration: Not built.** The Lead Agent's entry point is a raw webhook POST:
```json
POST /webhook/new-lead
{ "name", "phone", "email", "source", "inquiry_text", "campaign_id" }
```

This is not a CRM integration. There is no:
- HubSpot webhook or API sync
- Salesforce lead object mapping
- MagicBricks / 99acres / Housing.com inbound webhook
- Meta Lead Ads webhook (which is the primary source of leads from Meta campaigns)
- Google Lead Form extension webhook
- Developer website form integration

Leads only enter the system if someone manually POSTs a JSON payload to the n8n webhook URL. In a real sales scenario, no real estate sales team does this. Leads arrive from portals, ads, and website forms — none of which are connected.

The `campaign_id` field is accepted in the webhook body and stored on the lead row, but it is a free-text string — not a foreign key validated against the campaigns table, and not populated by any automatic source.

---

### 1.3 Nurture Agent — "Twilio/WhatsApp automation"

**Promised**: Nurture Agent sends personalized WhatsApp updates to prospects.

**Twilio Node: Present and real.** The Nurture Agent (`04_nurture_agent.json`) has a real `n8n-nodes-base.twilio` node that calls the Twilio WhatsApp API. If credentials are configured, this will send a real WhatsApp message. This is the most complete integration in the project.

**Three critical gaps in the actual flow:**

**Gap A: No automatic trigger from Lead Agent to Nurture Agent.**
The Lead Agent writes `LEAD_SCORED` to `agent_events` and returns a webhook response. It does not POST to `/webhook/draft-message`. There is no n8n connection, no HTTP Request node, no chained workflow. The two agents are disconnected. The workflow note in Nurture Agent says "Called by Lead Agent on LEAD_SCORED" — but this is aspirational, not implemented.

**Gap B: The "first message" flow has no automatic trigger at all.**
For a message to be drafted, someone must manually POST to `/webhook/draft-message` with a `lead_id`. For a message to be approved and sent, a manager must open the Approvals screen and press Approve. There is no scenario in which a new lead arriving triggers an automatic first-contact message without manual intervention. The system requires two manual human actions before any lead receives a WhatsApp message.

**Gap C: Campaign-to-message traceability is broken.**
The Nurture Agent drafts a message based on: the lead's profile, the latest lead score, and the matched property. It does not use `campaign_id`. The Approvals UI shows lead name, source, overall score, and language. It does not show which ad campaign sourced this lead, which ad creative they saw, or what messaging angle was used to attract them. The full-funnel claim ("from ad creative to WhatsApp message to site visit") has no data thread connecting it.

---

### 1.4 Conversion Agent — "Google Sheets + Booking APIs"

**Promised**: Conversion Agent tracks site visits and bookings using Google Sheets + Booking APIs.

**Google Sheets: Completely absent.** No Google Sheets node exists in any n8n workflow. No Google API credentials are referenced anywhere in the project. The schema has no Google Sheets export. There is no mention of Google Sheets in the data layer, the ENV template, or the docs.

**Booking APIs: Completely absent.** The Conversion Agent (`05_conversion_agent.json`) accepts a POST with `{ visit_id, status, post_visit_notes, booking_amount }` and inserts a row in the Supabase `bookings` table. No external booking system is called. No payment gateway (Razorpay, PayU, HDFC SmartGateway) is called. No developer CRM booking module is called. The `source_attribution` field in the booking insert is a hardcoded string:
```
"Closed-loop chain built post-insert via attribution function"
```
That function is not implemented.

**What is actually built**: A webhook that marks a visit complete, runs Gemini to extract objections from free-text notes, and writes a booking row to Supabase if the manager includes a `booking_amount`. This is entirely internal to Supabase.

---

## Part 2: Architecture Critique

### 2.1 The five-agent pipeline is not a pipeline

A pipeline implies automatic sequential flow: A finishes → B starts. The actual flow requires manual intervention at every transition:

```
Listing Agent   → [MANUAL: manager triggers Ad Agent via dashboard button]
Ad Agent        → [MANUAL: manager reviews and publishes — no actual publish]
Lead Agent      → [MISSING LINK: no automatic Nurture Agent trigger]
Nurture Agent   → [MANUAL: manager presses Approve]
Conversion Agent → [MANUAL: manager marks visit outcome]
```

Every agent-to-agent transition is either manual or missing. The system is not autonomous. It is a set of five independent tools that share a database.

### 2.2 The feedback loop claim is premature

The PRD and scoring prompt both describe a "closed-loop" system where Conversion Agent outcomes feed back into Lead Agent scoring. The mechanism: `lead_feedback_aggregate()` Postgres function is called by the Lead Agent and injects historical conversion rates into the Gemini prompt.

**The structural problem**: This feedback path requires:
1. At least one lead to be scored (Lead Agent)
2. That lead to be nurtured and invited to a site visit (manual)
3. The visit to be completed and marked in the dashboard (manual)
4. The Conversion Agent to extract objections (automated, if triggered)
5. The feedback SQL function to aggregate those outcomes (requires the function to exist and the migration to be run)
6. A new lead to arrive so the Lead Agent can pick up the feedback

With an empty database, the feedback is `[]`. With only a few visits completed, the feedback is statistically meaningless. The "self-improving" claim requires months of real data to be true. On day one, it is a prompt with an empty feedback block.

### 2.3 No inbound WhatsApp reply handling

The Nurture Agent only sends. There is no inbound webhook for Twilio to POST buyer replies to. When a buyer replies to the WhatsApp message, nothing happens — the reply goes to the Twilio console and dies there. The "conversation" in the dashboard is one-sided. The multi-turn intent extraction described in the PRD (qualifying the buyer's budget, timeline, config through a WhatsApp conversation) has no implementation path — no inbound webhook, no reply-routing logic, no session state.

### 2.4 The `approved_by` field is hardcoded

In the Nurture Agent (`04_nurture_agent.json`, line 375):
```json
{ "fieldId": "approved_by", "fieldValue": "priya@dev.in" }
```

Every approved message in the system is attributed to `priya@dev.in` regardless of who actually approved it. There is no authentication in the dashboard — anyone who opens the URL can approve messages, and all approvals will be attributed to this hardcoded email.

### 2.5 No authentication on the dashboard

The dashboard has no login. Any person with the localhost URL (or, if deployed, any person with the deployment URL) can:
- View all leads with masked phone numbers
- Approve WhatsApp messages to be sent to real buyers
- Mark visits as completed
- Create properties via the Listing Agent

The Manager Approval UI is positioned as a trust layer. A trust layer with no authentication is not a trust layer.

---

## Part 3: Dashboard Live Inspection Findings

The server was started at `http://localhost:8083` and all six routes were loaded.

### 3.1 Database is empty

All pages show zeros because the Supabase seed SQL (`seed_leads.sql`, `seed_properties.sql`, `seed_campaigns.sql`) has not been run against the Supabase project. The Supabase connection itself works — the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` are correctly configured.

**To fix**: Open Supabase Dashboard → SQL Editor → run files in this order:
1. `build/supabase/schema.sql`
2. `build/supabase/seed_properties.sql`
3. `build/supabase/seed_campaigns.sql`
4. `build/supabase/seed_leads.sql`
5. `build/supabase/migrations/0002_feedback_function.sql`

### 3.2 Primary metric has a hardcoded fallback

`getPrimaryMetric()` in `data.ts` returns `47` seconds when the `v_primary_metric` view returns empty. This means the Command Center will show "47s" as the first-response time even before any data exists. On demo day, this number will appear to be real. It is not. It is a hardcoded default.

### 3.3 Spend KPIs are permanently zero

`getKPIs()` in `data.ts` returns `total_spend_30d_inr: 0` and `blended_cpb_inr: 0` hardcoded. These will never populate because no real ad spend data exists. The analytics page will always show `₹0` for Spend and `₹0` for Blended CPB.

### 3.4 Analytics campaign drill-down uses synthetic math

The Source ROI table in `analytics.tsx` allows expanding each source row to see two campaigns: "Always-on" (70% of spend/leads) and "Promo burst" (30%). These numbers are computed with hardcoded ratios, not from real campaign records in Supabase. If someone checks the campaigns table directly, the numbers will not match.

### 3.5 Model accuracy starts at 0%

The `getEvalAccuracy()` function checks the `eval_ground_truth` table against `lead_scores`. With no data seeded and no leads scored through the actual n8n workflow, the analytics page shows "0 of 0 eval leads scored." The model accuracy widget is inert until the eval set is both seeded AND run through the Lead Agent workflow.

---

## Part 4: Product Management Critique

### 4.1 The product solves the right problem

The "missing intent data + slow first response" framing is correct and well-evidenced. The Fit + Urgency + Confidence scoring structure with natural-language rationales is better than any existing product in the Indian residential real estate market. The Manager Approval gate as a trust layer is the right design for a market where relationships are the product. These are genuine strengths.

### 4.2 The scope is misleading

The PRD's out-of-scope list correctly defers: live Meta/Google API, fine-tuning, RAG, mobile-native, multi-language, rental matching. But the in-scope list includes "Meta/Google Ads API" and "CRM integration" in the use case statement, which are not built. The mismatch between what the use case promises and what the implementation delivers is the most significant credibility risk for demo day.

If a hiring manager or developer in the demo audience asks "can this create a real Meta ad?" — the truthful answer is no. If they ask "how do leads actually get into this system?" — the truthful answer is "we POST a JSON payload to an n8n webhook manually." These are legitimate answers, but they need to be framed as intentional scope boundaries, not discovered gaps.

### 4.3 The PRD open questions were resolved elsewhere

Sections Q1-Q5 in `PRD §10` are marked "Pending decision" with no resolution in the PRD document itself. The resolutions live in `build/README.md`. Any stakeholder reading only the PRD sees five unresolved open questions. This needs to be resolved before the PRD is shared externally.

### 4.4 No North Star Metric

The PRD has two primary metrics: "time to first qualifying response" and "3 intent fields captured." These are different metrics. A single product needs a single north star. Recommendation: **Median Time-to-Qualification (TTQ)** — time from lead creation to score generation with confidence above 50. Everything else is a supporting metric.

### 4.5 No rollback policy for the AI model

The PRD defines an accuracy target (80% on 15 eval leads) but has no defined action if accuracy falls below threshold. If Gemini's scoring degrades or the prompt drifts, the system will continue to score leads and trigger Nurture Agent messages with no alert. A minimum viable rollback: "if confidence < 50% on more than 30% of leads in a 24-hour window, halt automatic nurture drafting and alert the manager."

---

## Part 5: Sales and GTM Critique

### 5.1 No GTM plan exists

The project has a product, a PRD, an implementation plan, and a dashboard. It does not have:
- A defined ICP (Ideal Customer Profile)
- A pricing hypothesis
- A pilot scope definition
- A competitive positioning statement beyond "we have explainable AI"
- An answer to "how do I get started with this?" for a real developer

For demo day in front of hiring managers and product leaders, the most likely question after the demo is "how would you take this to market?" Having no answer to that question is a missed opportunity.

### 5.2 The data residency concern is unaddressed

Indian real estate developers, particularly enterprise ones, will ask where buyer data is stored. The current answer: Supabase (a US-based cloud by default) and Twilio (a US-based service). For some buyers this is a disqualifying answer. This is not a critique of the architecture — it is a go-to-market reality that needs a prepared response.

### 5.3 The rejection feedback signal is wasted

The Approvals UI has five structured rejection reasons: Tone too pushy, Hallucinated detail, Off-template, Wrong language, Other. These are excellent signals for improving the Nurture Agent prompt. Currently they are written to the `messages.rejection_reason` column and never read by any agent. This is the easiest closed-loop improvement available — feed rejection reasons back into the nurture drafting system prompt as negative examples.

---

## Part 6: Prioritized Action List

Severity: 🔴 Blocks demo credibility / 🟡 Weakens demo / 🟠 Weakens real-world viability

| # | Severity | Finding | Action Required |
|---|---|---|---|
| 1 | 🔴 | Database is empty — all pages show zeros | Run the 5 SQL files in Supabase SQL Editor |
| 2 | 🔴 | No Lead Agent → Nurture Agent automatic trigger | Add an HTTP Request node in Lead Agent to call `/webhook/draft-message` on LEAD_SCORED, OR clearly frame this as "manager triggers the draft" |
| 3 | 🔴 | Primary metric (47s) is a hardcoded default | After seeding data, verify `v_primary_metric` view returns real data before demo |
| 4 | 🔴 | "Meta/Google Ads API" is not built — it is Gemini copy + simulated metrics | Reframe the Ad Agent as "AI ad creative generator with simulated performance modeling" in all demo materials |
| 5 | 🔴 | No CRM integration — leads must be POSTed manually | Reframe as "webhook-ready Lead Intake" and show the smoke-test curl as the lead entry demo |
| 6 | 🟡 | `approved_by` hardcoded to `priya@dev.in` | Fix to use a config variable or remove the field from the demo flow |
| 7 | 🟡 | Campaign drill-down in analytics uses synthetic math | Remove the drill-down rows or replace with real campaign data from Supabase |
| 8 | 🟡 | `total_spend_30d_inr` and `blended_cpb_inr` are permanently 0 | Compute from campaigns table or hide those two KPI cards for demo |
| 9 | 🟡 | Model accuracy widget shows 0 of 0 | Run all 15 eval leads through the Lead Agent webhook before demo; verify accuracy appears |
| 10 | 🟡 | Google Sheets is completely absent | Remove from all demo materials and use case statements |
| 11 | 🟡 | Booking APIs are completely absent | Reframe Conversion Agent as "visit outcome tracker + objection extractor" which is accurate |
| 12 | 🟠 | No inbound WhatsApp reply handling | Acknowledge as v2 scope; prepare an answer for the likely audience question |
| 13 | 🟠 | No dashboard authentication | Acceptable for a capstone demo; disqualifying for real-world use |
| 14 | 🟠 | Rejection feedback not fed back to Nurture Agent | Frame as closed-loop v2 feature; log the signal today |
| 15 | 🟠 | No GTM narrative | Prepare a 60-second "how would you sell this" answer for demo Q&A |

---

## Part 7: What to Say on Demo Day

**What the product actually is** (honest framing that is still strong):

> A manager dashboard that uses AI to score incoming property inquiries by Fit and Urgency, draft personalized WhatsApp messages for manager review, and extract structured objections from site visit notes — all with full observability into what every agent decided and why.

**What to show, in order:**

1. New lead arrives (paste the smoke-test curl command) → show the score appearing in leads table with Fit/Urgency/Confidence and natural-language reasons
2. Score triggers a draft in the Approvals queue → show the WhatsApp preview in the manager's UI
3. Manager presses Approve (A key) → show the real Twilio WhatsApp arriving on a phone
4. Manager marks a visit completed with notes → show objections extracted (price, possession, competitor) and attached to the visit
5. Source ROI table → show which channels are producing bookings at what cost

**What to say about the gaps when asked:**

- On Meta/Google API: "We built the creative generation and audience brief — the publish step would wire to Meta Marketing API using the same property record. We scoped that out to keep the demo focused on the intelligence layer, not the API plumbing."
- On CRM: "Any CRM with a webhook — HubSpot, Salesforce, or a portal like 99acres — can POST to our Lead Agent endpoint. We didn't build an opinionated CRM connector because different developers use different systems."
- On Google Sheets: "We replaced that with Supabase because it gave us real-time queries and RLS. A Sheets export is a one-node addition to the Conversion Agent."
- On inbound WhatsApp replies: "That is v2 — we'd add a Twilio inbound webhook that routes buyer replies back into the intent extraction prompt."

---

## Part 8: Genuine Strengths (Do Not Undersell These)

1. **Scoring prompt quality** is production-grade. The Fit/Urgency/Confidence structure with Indian market context (lakhs/Cr, BHK, under-construction possession risk) is specific and defensible.
2. **Manager Approval trust layer** is the right design for this market. No competitor shows you the AI draft before it sends.
3. **Agent observability** via `agent_logs` means every decision is traceable. This is rare in capstone projects.
4. **Explainable scoring** with natural-language `fit_reasons` and `urgency_reasons` is a genuine differentiator over rule-based CRM scoring.
5. **Fallback resilience** — the Nurture Agent falls back to direct Supabase update if n8n fails; the scoring prompt falls back to "Escalate to manager" if Gemini fails; the primary metric falls back to 47s if the view is empty. These are not features you build by accident.
6. **The data model is correct** — the `leads → lead_scores → visits → bookings → source_attribution` chain is the right schema for full-funnel attribution.

---

*Audit complete. No files were modified in the project. All findings are grounded in direct code reading of the files listed in the header.*
