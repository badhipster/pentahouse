# Pentahouse — Real Estate Marketing & Conversion Intelligence Agent

**Author:** Abhishek Ranjan
**Program:** Product Space Advanced AI Cohort 11 — Capstone
**Status:** v1.0 submission cut

A persona-aware AI sales operations product for mid-tier Indian residential developers. Five AI agents work behind a role-aware dashboard so a Sales Head, Sales Rep, and Marketing Lead each see only what their job demands.

---

## What it does

Pentahouse v1 ingests buyer inquiries from Meta Lead Ads (and direct webhook), scores them in seconds using a RAG-grounded large language model pipeline, drafts personalized WhatsApp follow-ups in English or Hindi for human approval, captures site-visit outcomes with AI-extracted objections, and mirrors everything to a sales-ops Google Sheet.

The moat: a **three-way Activation Loop** — every scored lead is routed autonomously to one of:
1. **Activation draft** (hot lead + matched inventory → site-visit invite)
2. **Gap-fill draft** (insufficient intent → buyer is asked the top 1–2 missing fields)
3. **No-message** (Disqualify / Escalate → manager-only review)

---

## Architecture at a glance

```
INBOUND                  AI AGENTS (n8n)              OUTBOUND
───────                  ──────────────              ────────

Meta Lead Ad   ──►   Meta Lead Ingest
                            │
                            ▼
Direct curl    ──►   Lead Agent          ──►   Supabase
                            │ (if score >= 70)  Google Sheets
                            ▼                   EspoCRM (optional)
                     Nurture Agent       ──►   Twilio WhatsApp (post-approval)
                            │
                            ▼
                     /approvals (human gate)
                            │
                            ▼
                     Visit Calendar      ──►   Google Calendar + Meet
                     Conversion Agent    ──►   Bookings + attribution
                     Ad Agent            ──►   Meta/Google/Portal ad copy
                     Listing Agent       ──►   pgvector embeddings
```

---

## Repo structure

```
Concept_Note_RE_Marketing_Agent.docx          Original capstone concept note
PRD_RE_Marketing_Conversion_Intelligence_Agent.md   PRD v1.0
SPEC_Autonomous_Activation_Loop_v1.1.md       Spec rev. 3 — three-way branch
REBUILD_WORKFLOW_Lead_Agent.md                Strategic rebuild — Normalize Intent layer
AUDIT_RE_Marketing_Agent.md                   Self-audit against canonical workflow
CAPSTONE_CONTEXT_HANDOFF.md                   PM context handoff
Implementation_Plan_RE_Marketing_Agent.md     Day-by-day execution plan
india_proptech_market_research_report.md      Market research (TAM/SAM/SOM)

build/
  PRODUCT_SUMMARY.md                          Current state, what's shipped vs deferred
  n8n/
    01_listing_agent.json                     RERA-grounded listing extraction
    02_ad_agent.json                          Multi-channel ad copy drafting
    03_lead_agent.json                        Lead Agent v3.3 + activation loop
    04_nurture_agent.json                     WhatsApp draft + approve flow
    05_conversion_agent.json                  Visit outcome + objection analysis
    06_meta_lead_ingest.json                  Meta Lead Ads webhook
    07_visit_calendar.json                    Google Calendar event creation
    08_inbound_reply.json                     Twilio inbound + re-score (v1.1)
    09_visit_reminders.json                   Cron-based T-24h + T-2h reminders
  supabase/
    schema.sql                                Base schema (10 tables + 4 views)
    migrations/                               Incremental migrations (0005 → 0019)
    seeds/
      0001_demo_funnel.sql                    10 leads + scores + messages + visits
      0002_demo_personas.sql                  3 personas with assigned leads
  dashboard/                                  React + Vite + TanStack Router
    src/
      lib/auth.tsx                            Role-based access control
      lib/data.ts                             All Supabase queries + n8n calls
      components/                             Reusable UI primitives
      routes/                                 File-based routing (auth-gated)
```

---

## Five AI agents

| Agent | Trigger | AI capability | Status |
|---|---|---|---|
| **Lead** | Webhook | RAG + responseSchema + 4-model retry chain + three-way branch | ✅ Production-ready |
| **Nurture** | Webhook | Multi-language drafting (en/hi) + intent_gap_fill template + human approval gate | ✅ Production-ready |
| **Conversion** | Webhook | Per-objection severity + sentiment + booking sanity check | ✅ Production-ready |
| **Ad** | Webhook (per property) | Few-shot multi-channel creative generation + character-limit enforcement | ✅ Production-ready (drafts only; posting deferred to v2) |
| **Listing** | Webhook (RERA URL) | HTML-to-structured-data extraction + upsert by RERA number | ✅ Production-ready |

---

## Dashboard — persona-aware RBAC

Three roles, three distinct views:

| Persona | Sees | Doesn't see |
|---|---|---|
| **Sales Head (Priya)** | Everything — floor pipeline, KPIs, Live Lead Tester, all routes | — |
| **Sales Rep (Rohit)** | Only leads assigned to him, his visits, his approvals | Inventory, Campaigns, Analytics |
| **Marketing (Meera)** | Campaigns + Creative Approvals + Source Funnel + Inventory | Leads, Visits, Approvals |

Demo credentials (use Gmail plus-aliases on the user's email):
```
arjha97+priya@gmail.com   Pentahouse2026   sales_head
arjha97+rohit@gmail.com   Pentahouse2026   sales_rep
arjha97+meera@gmail.com   Pentahouse2026   marketing
```

---

## Quick start (local)

```bash
# 1. Supabase (cloud, no setup needed)
# Apply migrations in order: schema.sql → migrations/0005…0019.sql → seeds/0001 + 0002

# 2. n8n
N8N_BLOCK_ENV_ACCESS_IN_NODE=false GEMINI_API_KEY=YOUR_KEY n8n start
# Import all 9 workflows from build/n8n/*.json

# 3. Dashboard
cd build/dashboard
npm install
npm run dev
# Opens at http://localhost:8080
```

---

## What's shipped vs. deferred to v2

| Built | Deferred to v2 |
|---|---|
| RAG-grounded lead scoring + retry chain | Real Meta Marketing API posting |
| Three-way Activation Loop (activation/gap-fill/no-message) | Closed-loop ad budget optimization |
| Multi-persona RBAC (Head/Rep/Marketing) | Drip nurture sequences |
| Google Calendar + Sheets + Twilio sandbox integration | Inbound WhatsApp via Cloud API |
| Live curl → score → draft → approve flow | Multi-tenant aggregator portal |
| Agent observability + per-lead journey timeline | Normalize Intent layer (variable ad-form support) |
| Lead deduplication + speed-to-lead measurement | Fine-tuned intent classifier |

See `REBUILD_WORKFLOW_Lead_Agent.md` for the v1.1 → v2 Normalize Intent rebuild plan.

---

## Honest constraints

- **Twilio sandbox** (free) is used for WhatsApp. Production needs Meta WhatsApp Business Cloud API migration for inbound on arbitrary numbers.
- **EspoCRM push** is env-gated and optional — not a dependency for v1.
- **Gemini free tier** rate limits hit during heavy testing; the four-model retry chain handles 429s gracefully.
- **Aggregator persona** is deferred — sidebar shows only Today, labeled "Partner (v2)".

---

## License

This is a capstone project for educational purposes. Production deployment will follow IP/licensing review with Product Space.
