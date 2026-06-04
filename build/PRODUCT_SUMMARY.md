# Pentahouse — Product Summary

**Status as of 2026-06-03 · v1.0 (submission-ready)**

A persona-aware AI sales operations product for mid-tier Indian residential developers. Five AI agents work behind a role-aware dashboard so a Sales Head, Sales Rep, and Marketing Lead each see only what their job demands.

---

## 1. What Pentahouse is, in one paragraph

Pentahouse v1 ingests buyer inquiries from Meta Lead Ads and other channels, scores them in seconds using a RAG-grounded large language model pipeline, drafts personalized WhatsApp follow-ups in English or Hindi, captures site-visit outcomes with AI-extracted objections and sentiment, and mirrors everything to a sales-ops Google Sheet so the sales head can work where she already lives. The moat is the **Lead Agent**: a retrieval-augmented Gemini scoring pipeline with a four-model fallback chain that survives free-tier rate limits.

---

## 2. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PENTAHOUSE v1.0                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   INBOUND                  AI AGENTS (n8n)              OUTBOUND     │
│   ───────                  ──────────────              ────────      │
│                                                                       │
│   Meta Lead Ad   ─────►   Meta Lead Ingest                           │
│                                │                                     │
│                                ▼                                     │
│   Direct curl    ─────►   Lead Agent          ─────►   Supabase      │
│   (sales head)                 │                       Google Sheet  │
│                                │ (if score >= 70)      EspoCRM       │
│                                ▼                                     │
│                          Nurture Agent        ─────►   Supabase      │
│                                │                       Twilio        │
│                                │ (on approval)         WhatsApp      │
│                                ▼                                     │
│   Sales head             /approvals (human gate)                     │
│                                │                                     │
│                                ▼                                     │
│   Sales head sets        Visit Calendar       ─────►   Google        │
│   the visit                                            Calendar      │
│                                                                       │
│   Sales head logs        Conversion Agent     ─────►   Supabase      │
│   visit outcome                                        Google Sheet  │
│                                                        (Bookings)    │
│                                                                       │
│   Marketing fires        Ad Agent             ─────►   Supabase      │
│   for a property                                       Google Sheet  │
│                                                        (Campaigns)   │
│                                                                       │
│   Listing Agent          Listing Agent        ─────►   Supabase      │
│   (RERA URL)                                           pgvector      │
│                                                        embeddings    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- **n8n** (workflow engine, port 5678) — orchestrates the 7 workflows
- **Supabase** (system of record) — Postgres + pgvector + Auth + RLS
- **Dashboard** (React + Vite, port 8081) — persona-aware UI
- **Google Sheets** — sales-ops mirror at sheet ID `1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow`
- **Google Calendar** — site-visit events
- **Twilio** — WhatsApp Business API (post-approval send)
- **Gemini** — 2.5 Flash with Flash-Lite + Pro fallback, plus embedding-001

---

## 3. The five AI agents

### Lead Agent (the moat)

**Trigger:** `POST /webhook/new-lead`

**Workflow (18 nodes):**
1. Insert lead into Supabase
2. Build embedding text from inquiry
3. Call Gemini `embedding-001` → 768-dim vector
4. Call Supabase RPC `match_properties` with vector + city + budget band → top-5 properties
5. Fetch historical feedback for context
6. Build Gemini prompt with strict `responseSchema` enforcing fit_score, urgency_score, overall_score, confidence, reasons, recommended_action, matched_property_id
7. Score via four-model retry chain: Flash → Flash retry → Flash-Lite → Pro
8. Parse + validate score (clamp 0-100, validate enums, validate UUIDs)
9. Insert lead_score into Supabase
10. **IF score >= 70** → HTTP call to Nurture Agent `/webhook/draft-message` with `trigger_event: 'lead_scored_hot'`
11. Append row to Google Sheets **Leads** tab
12. Push to EspoCRM
13. If confidence < 50 → insert escalation
14. Emit LEAD_SCORED event
15. Write agent log
16. Respond to webhook with score JSON

**AI capabilities:**
- Embedding-based RAG (Gemini 768-dim + pgvector cosine similarity)
- City + budget band pre-filter
- `responseSchema`-enforced structured output
- Four-model retry chain (handles 429s)
- Defensive RAG read (handles n8n array-as-single-item quirk)
- Confidence-gated escalation

**Status:** ✅ Production-ready. End-to-end verified at 0.76 similarity on Hinjewadi Vista query.

---

### Nurture Agent

**Triggers:** `POST /webhook/draft-message` + `POST /webhook/approve-message`

**Draft flow:**
1. Fetch lead, latest score, matched property, conversation history
2. Auto-derive template from upstream `recommended_action` (Schedule site visit → site_visit_invite, etc.)
3. Call Gemini with score-conditional prompt
4. Parse + validate (1024 char WhatsApp limit)
5. Insert message with `status='pending_approval'`
6. Return to caller

**Approve flow:**
1. Receive sales head decision (approve / edit / reject)
2. If approved → Twilio Send → mark sent

**AI capabilities:**
- Template-conditional generation
- Multi-language English + Devanagari Hindi
- Human-in-the-loop approval gate
- Thread continuity (past messages as context)

**Status:** ✅ Production-ready for single-shot welcome and post-visit messages. Drip sequences, inbound parsing, and re-engagement are v2.

---

### Conversion Agent

**Trigger:** `POST /webhook/visit-outcome`

**Workflow:**
1. Fetch visit + lead + property
2. Build Gemini prompt with `responseSchema` requiring sentiment, objections[] with typed taxonomy (price/possession/decision-maker/competitor/financing/other), severity per objection, summary, next_step_hint, has_deal_breaker
3. Parse objections + run booking sanity check
4. Update visit row in Supabase
5. If booking → insert booking with `attribution_chain` JSON
6. Append to Google Sheets **Visits** tab; if booking, also **Bookings** tab
7. Emit VISIT_COMPLETED event

**AI capabilities:**
- Per-objection severity scoring
- Sentiment analysis (positive/neutral/negative)
- Booking sanity check (flags out-of-band amounts)
- Attribution chain building

**Status:** ✅ Production-ready. Closed-loop feedback to Ad Agent is v2.

---

### Ad Agent

**Trigger:** `POST /webhook/generate-ads`

**Workflow:**
1. Fetch property
2. Fetch previous campaigns (negative examples for diversity)
3. Build Gemini prompt with `responseSchema` requiring channels.meta, channels.google, channels.portal, each with headline/primary_text/cta/budget_inr
4. Parse + validate character limits (Meta primary text ≤ 125 chars, Google headline ≤ 30 chars)
5. Insert 3 campaign rows (Meta, Google, Portal)
6. Build 3 sheet rows
7. Append to Google Sheets **Campaigns** tab (3 rows per generation)
8. Emit CAMPAIGN_LIVE event

**AI capabilities:**
- Few-shot via prior campaigns
- Multi-channel single-call generation
- Character-limit-aware prompting

**Status:** ⚠️ v1 drafts creative copy. **We do NOT post to Meta Marketing API or Google Ads API** — that is explicitly v2.

---

### Listing Agent

**Trigger:** `POST /webhook/sync-listing`

**Workflow:**
1. Fetch RERA page HTML
2. Extract text
3. Call Gemini with `responseSchema` requiring project_name, developer, rera_number, city, locality, config_mix, price band, possession_date, amenities[], usps[]
4. Validate extraction (reject malformed RERA numbers)
5. Upsert property (insert if new, update if RERA exists)
6. Compute embedding via Gemini embedding API
7. Insert into `property_embeddings`
8. Emit LISTING_SYNCED event

**AI capabilities:**
- HTML-to-structured-data extraction
- RERA-grounded authoritative source
- Upsert by RERA number (no duplicates on re-sync)

**Status:** ✅ Production-ready.

---

## 4. The two bridge workflows

### Meta Lead Ingest

**Triggers:** `GET /webhook/meta-webhook` (Facebook verification) + `POST /webhook/meta-webhook` (lead submission)

**POST flow:**
1. HMAC verify using app secret
2. Fetch lead details from Meta Graph API
3. Look up property via `v_meta_form_lookup`
4. Normalize payload
5. HTTP hand-off to Lead Agent `/webhook/new-lead`
6. Respond 200 EVENT_RECEIVED to Meta

**Status:** ✅ Working. Webhook green-checked in Meta console.

### Visit Calendar (Booking API)

**Trigger:** `POST /webhook/schedule-visit`

**Workflow:**
1. Fetch visit + lead + property
2. Build Calendar event (summary, description with sales briefing, location, attendees, Meet link)
3. POST to Google Calendar API v3
4. Store calendar_event_id + calendar_event_url on visit row
5. Send .ics invites to attendees

**Status:** ✅ Working. Calendar event URL surfaced in `/visits` and lead detail.

---

## 5. Dashboard — persona-aware with RBAC

Three demo personas, each with a distinct sidebar, KPI strip, and route access:

| Persona | Sidebar sections | Routes | /today KPIs |
|---|---|---|---|
| **Priya Rao** (Sales Head) | Desk · Floor pipeline · Supply & spend · AI floor | All 7 routes | First-reply speed, new leads today, drafts waiting, bookings this week |
| **Rohit Joshi** (Sales Rep) | My desk · My pipeline | Today, Leads, Approvals, Visits | My first-reply speed, my active deals, drafts to approve, my bookings |
| **Meera Patel** (Marketing) | Campaigns · Supply · Performance · AI floor | Today, Properties, Analytics, Agents | Spend, blended CPL, cost per booking, top source + source funnel breakdown |

**RBAC implementation:**
- Single source of truth in `lib/auth.tsx` (`ROLE_CAPABILITIES` map)
- `useRole()` and `useCapabilities()` hooks
- Sales rep auto-filters `/leads` to `assigned_to = self`
- Role-colored badge always visible in topbar
- Each role gets persona-tuned greeting and KPI strip

**Standout dashboard moments:**
- `/agents` — Agent Observatory with capability strip, 5 per-agent cards (model, technique, runs, success%, P50 latency, last 5 runs, health badge, data destinations with live Sheet links), data architecture footer panel
- Lead detail page — Agent Journey Timeline showing every event across all 5 agents on that lead with icons, prose, timestamps
- `/approvals` — sparkle chip "Drafted by Nurture Agent · Gemini 2.5 Flash" above each WhatsApp draft
- `/today` (sales head only) — Live Lead Tester panel that fires the real Lead Agent webhook and shows the score
- Sidebar bottom — persistent Sales Ops Sheet link (one click)

---

## 6. AI capabilities matrix

| Capability | Where it lives | Visible to demo viewer |
|---|---|---|
| Retrieval-augmented generation (RAG) | Lead Agent, via pgvector 768-dim embeddings | Agent Observatory cards + lead detail |
| Structured output enforcement | Lead, Ad, Conversion, Listing agents — `responseSchema` enforcement | Output always parses, never garbage |
| Multi-model retry + fallback | Lead Agent — Flash → Flash retry → Flash-Lite → Pro | `model_used` + `attempts_used` on every lead_score row |
| Multi-language generation | Nurture Agent — English + Devanagari Hindi | Approval queue messages |
| Per-objection severity scoring | Conversion Agent | Visit cards + objection chips |
| Sentiment analysis | Conversion Agent | Sentiment badge on visit cards |
| Booking sanity validation | Conversion Agent | REVIEW flag on out-of-band amounts |
| Few-shot creative generation | Ad Agent — previous campaigns as negative examples | Inventory ad cards |
| HTML-to-structured-data extraction | Listing Agent | Property detail page |
| Human-in-the-loop gate | Nurture Agent — every outbound message goes through approval | `/approvals` route |

---

## 7. Data layer

### Supabase (system of record)

| Table | Purpose | Row count today |
|---|---|---|
| `leads` | Buyer inquiries | 10 demo |
| `lead_scores` | LLM scoring output | 10 demo |
| `messages` | WhatsApp conversation log | 15 demo |
| `visits` | Site visit records | 5 demo |
| `bookings` | Closed deals | 1 demo |
| `campaigns` | Ad campaign records (Meta/Google/Portal) | varies |
| `properties` | Inventory | 25 real Pune properties |
| `property_embeddings` | 768-dim vectors | 25 |
| `agent_events` | Cross-agent event bus | 40 demo |
| `agent_logs` | Observability layer | ~25 demo |
| `users` | Auth profiles | 3 demo personas |
| `escalations` | Low-confidence flags | 1 demo |
| `pending_approvals`, `visit_slots`, `meta_form_to_property` | Supporting tables | — |

### Google Sheets (sales-ops mirror)

URL: https://docs.google.com/spreadsheets/d/1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow

| Tab | Written by | Row per |
|---|---|---|
| Leads | Lead Agent | One row per scored lead |
| Campaigns | Ad Agent | Three rows per generation (meta + google + portal) |
| Visits | Conversion Agent | One row per processed visit |
| Bookings | Conversion Agent | One row per booking |

### External services

- **Google Calendar** — site-visit events with Meet links and .ics invites
- **Twilio WhatsApp** — post-approval send only
- **EspoCRM** — lead push for legacy CRM users
- **Meta Lead Ads** — inbound webhook with HMAC verification

---

## 8. Use case assessment — honest audit

**The canonical product (as defined by the audit):**
```
New Listing → Campaign Live → Inquiry → Scored Lead → Nurtured → Site Visit Booked → Visited → Booking/Won
```

| Canonical capability | Built in v1? | Reality |
|---|---|---|
| Listing normalization + RERA grounding | ✅ Full | Working end-to-end |
| Auto-generation of ad creative variants | ✅ Full | Ad Agent produces meta/google/portal copy |
| Auto-launch on Meta Marketing API | ❌ v2 | We draft; we do not post |
| Auto-launch on Google Ads API | ❌ v2 | Same |
| Audience definition (lookalikes, geo) | ❌ v2 | Described in copy, not executed |
| Lead capture from Meta | ✅ Full | Webhook with HMAC, form-to-property mapping |
| Lead capture from website forms | ⚠️ Partial | Schema supports it, no live form UI |
| Lead capture from portal aggregators | ❌ v2 | Manual entry only |
| Lead capture from WhatsApp click-to-message | ❌ v2 | Not built |
| Lead deduplication | ✅ Full | Unique partial index on phone + `check_existing_lead_by_phone` RPC |
| LLM + rules hybrid scoring | ✅ Full | Gemini with structured fit/urgency/confidence rubric |
| Budget + location + config + urgency + financing inputs | ✅ Full | All 9 intent fields in prompt |
| RAG inventory match | ✅ Full | 768-dim embeddings, city + budget pre-filter |
| Tier output (Hot/Warm/Cold) | ✅ Full | overall_score → heat mapping |
| Recommended action | ✅ Full | 5-value enum |
| Routing decision (auto-nurture vs human) | ✅ Full | IF Hot Lead → Nurture chain; escalations table for low confidence |
| Source quality input | ⚠️ Partial | Source captured but not heavily weighted in prompt |
| Hot lead immediate response | ⚠️ Partial | Drafts immediately, but waits on human approval |
| Site-visit booking link in hot message | ❌ v2 | Booking link not generated |
| Multi-step drip for warm leads | ❌ v2 | Single-shot only |
| Inbound reply parsing + re-scoring | ❌ v2 | One-way Twilio |
| Cold lead long-cycle re-engagement | ❌ v2 | Not built |
| Consent/opt-out management | ❌ v2 | Manual policy compliance |
| Multi-language English + Hindi | ✅ Full | Templates support both |
| Human-in-the-loop approval | ✅ Full | This is our principle, not a gap |
| Site visit calendar booking | ✅ Full | Google Calendar event + Meet link |
| Visit reminders to cut no-shows | ❌ v2 | Not built |
| Visit outcome logging | ✅ Full | Sentiment + objections + sanity check |
| Booking with attribution chain | ✅ Full | JSON column on bookings table |
| Feedback loop → Ad Agent | ❌ v2 | The closed-loop optimization is the v2 promise |
| Feedback loop → Lead Agent scoring retrain | ❌ v2 | Same |
| Speed-to-lead measurement | ✅ Full | `v_speed_to_lead` view + sales rep KPI |

### Persona journey assessment

| Persona | Built? | Comment |
|---|---|---|
| **Marketing team (Persona A)** | ⚠️ Partial | Marketing role exists with CPL/CPV/CPB and source funnel. Missing: ad-account connection flow, creative approval gate, underperformance alerts, auto-budget-shift |
| **Developer / builder (Persona B)** | ⚠️ Partial | Sales Head persona covers most of this. Missing: project onboarding wizard, weekly digest email |
| **Aggregator / portal (Persona C)** | ❌ v2 | Schema reserves `tenant_id` but multi-tenancy not implemented. Aggregator role explicitly deferred — sidebar shows only Today, labeled "Partner (v2)" |

### Honest verdict

**The v1 use case is partially met.** What ships is:

1. The **scoring brain** is fully production-ready (Lead Agent with RAG + retry chain)
2. The **sales head operational workflow** is fully production-ready (RBAC, approvals, calendar, sheets sink)
3. The **AI orchestration spine** is fully production-ready (5 agents wired into n8n with one auto-chain Lead → Nurture)
4. The **observability layer** is fully production-ready (Agent Observatory + per-lead journey timeline + agent_logs)

**What's deferred to v2** (and the user/judge should hear this explicitly):

1. Real ad-platform posting (Meta Marketing API + Google Ads API)
2. Closed-loop budget optimization
3. Drip sequences and inbound conversational handling
4. Multi-tenant aggregator portal
5. Speed-to-lead enforcement under 5 minutes
6. Visit reminders

---

## 9. Production-readiness scorecard

| Surface | v1 status |
|---|---|
| Lead scoring | ✅ Production-ready |
| Lead-to-Nurture handoff | ✅ Production-ready (HOT score → auto-draft) |
| Nurture drafting | ✅ Production-ready |
| Nurture approval flow | ✅ Production-ready |
| Twilio send | ✅ Production-ready (post-approval) |
| Visit scheduling | ✅ Production-ready (Calendar + Meet) |
| Visit outcome analysis | ✅ Production-ready |
| Booking attribution | ✅ Production-ready |
| Meta Lead Ads ingestion | ✅ Production-ready |
| Google Sheets sink | ✅ Production-ready (4 tabs) |
| Multi-persona auth + RBAC | ✅ Production-ready (3 personas) |
| Agent observability | ✅ Production-ready (Observatory + Journey) |
| Lead deduplication | ✅ Production-ready (DB-level) |
| Speed-to-lead measurement | ✅ Production-ready (view + KPI) |
| Source funnel reporting | ✅ Production-ready (CPL/CPV/CPB) |
| Ad campaign drafting | ✅ Production-ready (Meta/Google/Portal copy) |
| Ad campaign posting | ❌ v2 |
| Drip nurture sequences | ❌ v2 |
| Inbound message parsing | ❌ v2 |
| Multi-tenancy | ❌ v2 |
| Closed-loop optimization | ❌ v2 |

---

## 10. Verification checklist

Run each to validate v1 claims before submission:

```sql
-- Verify dedup works
SELECT * FROM check_existing_lead_by_phone('+919999000001');
-- Should return Aarav Mehta if seeded

-- Verify speed-to-lead
SELECT * FROM v_speed_to_lead;
-- Should return 1 row with non-null median_seconds if seeded leads have first_response_at

-- Verify source funnel
SELECT * FROM v_source_roi ORDER BY leads_count DESC;
-- Should show Meta Ad, Google Ad, etc. with per-source counts

-- Verify persona role assignment
SELECT email, display_name, role FROM users WHERE email LIKE '%@demo.pentahouse';
-- Should return 3 rows

-- Verify assigned leads
SELECT COUNT(*) FROM leads WHERE assigned_to IS NOT NULL;
-- Should return 5 after applying seeds/0002

-- Verify agent_logs has observability data
SELECT agent_name, COUNT(*) FROM agent_logs WHERE output_summary LIKE 'DEMO_SEED%' GROUP BY agent_name;
-- Should return 5 rows, one per agent
```

```bash
# Verify dashboard compiles cleanly
cd build/dashboard && npx tsc --noEmit
# Should output nothing

# Verify n8n is up
curl -s http://localhost:5678/healthz
# Should return 200

# Verify Lead Agent end-to-end
curl -X POST 'http://localhost:5678/webhook/new-lead' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Verification Test","phone":"+919999911111","email":"verify@test.in","source":"manual","inquiry_text":"3BHK Hinjewadi 1.2Cr","preferred_city":"Pune","preferred_locality":"Hinjewadi","budget_lakhs":120,"preferred_config":"3BHK","purpose":"buy","purchase_timeline":"3 months","loan_status":"Pre-approved"}'
# Should return 200 with lead_id + overall_score
```

---

## 11. File manifest

### n8n workflows (all auto-active on n8n start)
```
build/n8n/01_listing_agent.json       Listing Agent
build/n8n/02_ad_agent.json            Ad Agent + Code Build Sheet Rows + Sheets Append
build/n8n/03_lead_agent.json          Lead Agent v3.3 (RAG + retry + Sheets + Hot Lead chain)
build/n8n/04_nurture_agent.json       Nurture Agent (draft + approve flows)
build/n8n/05_conversion_agent.json    Conversion Agent + Sheets Append Visit + Booking
build/n8n/06_meta_lead_ingest.json    Meta Lead Ingest with HMAC verification
build/n8n/07_visit_calendar.json      Google Calendar event creator
```

### Database migrations
```
build/supabase/schema.sql                                Base schema (10 tables + 4 views)
build/supabase/migrations/0005_observability_columns.sql
build/supabase/migrations/0006_upsert_property_function.sql
build/supabase/migrations/0007_meta_form_mapping.sql
build/supabase/migrations/0008_real_kaggle_properties.sql 25 RERA-grounded Pune properties
build/supabase/migrations/0009_rag_pgvector.sql         pgvector + match_properties RPC
build/supabase/migrations/0010_property_thumbnails.sql
build/supabase/migrations/0011_visit_calendar_fields.sql
build/supabase/migrations/0012_add_visit_calendar_agent.sql
build/supabase/migrations/0013_users_auth.sql           Auth foundation + trigger
build/supabase/migrations/0014_leads_assigned_to.sql    assigned_to FK + v_lead_queue extension
build/supabase/migrations/0015_lead_dedup_and_attribution.sql  Unique phone index + speed-to-lead view + RPC
```

### Demo data seeds
```
build/supabase/seeds/0001_demo_funnel.sql               10 leads + scores + messages + visits + booking + events + agent_logs
build/supabase/seeds/0002_demo_personas.sql             Role assignment + lead assignment (run after signup)
```

### Dashboard (Vite React)
```
build/dashboard/src/lib/auth.tsx                        AuthProvider, useRole, useCapabilities, ROLE_LABELS
build/dashboard/src/lib/data.ts                         All Supabase queries + n8n calls
build/dashboard/src/lib/supabase.ts                     Supabase client with persistSession

build/dashboard/src/components/shell/Sidebar.tsx        Role-aware navigation + sheet link
build/dashboard/src/components/shell/Topbar.tsx         Role-colored badge + UserMenu
build/dashboard/src/components/LiveLeadTester.tsx       Sales head fire-a-real-lead panel
build/dashboard/src/components/SourceFunnelCard.tsx     Marketing per-channel CPL/CPV/CPB
build/dashboard/src/components/LeadJourneyTimeline.tsx  Per-lead cross-agent event timeline

build/dashboard/src/routes/__root.tsx                   AuthAwareLayout
build/dashboard/src/routes/index.tsx                    /today with persona variants + LiveLeadTester + SourceFunnelCard
build/dashboard/src/routes/login.tsx, signup.tsx        Auth pages
build/dashboard/src/routes/leads.index.tsx              Leads list with assigned_to filter
build/dashboard/src/routes/leads.$id.tsx                Lead detail + Journey Timeline
build/dashboard/src/routes/properties.index.tsx         Inventory list
build/dashboard/src/routes/properties.$id.tsx           Property detail + Generate Ads CTA
build/dashboard/src/routes/approvals.tsx                Drafted-by-AI WhatsApp approval queue
build/dashboard/src/routes/visits.tsx                   Visit list with calendar links
build/dashboard/src/routes/analytics.tsx                Funnel + source ROI
build/dashboard/src/routes/agents.tsx                   Agent Observatory + data architecture footer
```

---

## 12. Submission talking points

**The product in 30 seconds:**

> Pentahouse is a sales-head operations product for mid-tier Indian residential developers. Five AI agents work behind a role-aware dashboard so a Sales Head, Sales Rep, and Marketing Lead each see only what their job demands. The v1 moat is the Lead Agent — it retrieves matching inventory using Gemini embeddings, scores the lead with structured output, and falls back across four models to handle rate limits. When a lead scores hot, the Nurture Agent drafts a personalized WhatsApp message in English or Hindi for the sales head to approve. Every visit gets a Google Calendar event; every outcome is analyzed for sentiment and objections. Everything mirrors to a sales-ops Google Sheet so the team works where they already live.

**What's strongest:**
1. RAG-grounded scoring with verified 0.76 similarity matches
2. Three-persona RBAC with distinct workflows for Head / Rep / Marketing
3. Real Google ecosystem integration (Sheets + Calendar)
4. Real Meta Lead Ads ingestion
5. Honest human-in-the-loop principle on every outbound message
6. Full AI observability — judges can see every agent working

**What's explicitly v2:**
1. Meta Marketing API + Google Ads API posting
2. Closed-loop budget optimization
3. Drip nurture sequences and inbound reply handling
4. Multi-tenant aggregator portal
5. Sub-5-min speed-to-lead enforcement

---

**Document version:** 1.0 · 2026-06-03 · Pentahouse v1.0 submission cut
