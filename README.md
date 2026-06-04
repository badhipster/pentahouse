# Pentahouse

A persona-aware AI sales operations product for mid-tier Indian residential developers. Five AI agents work behind a role-aware dashboard so a Sales Head, Sales Rep, and Marketing Lead each see only what their job demands.

---

## What it does

Pentahouse ingests buyer inquiries from Meta Lead Ads (and direct webhook), scores them in seconds using a RAG-grounded LLM pipeline, drafts personalized WhatsApp follow-ups in English or Hindi for human approval, captures site-visit outcomes with AI-extracted objections, and mirrors everything to a sales-ops Google Sheet.

The moat is a **three-way Activation Loop** — every scored lead is routed autonomously to one of:

1. **Activation draft** — hot lead + matched inventory → site-visit invite
2. **Gap-fill draft** — insufficient intent → buyer is asked the top 1–2 missing fields
3. **No-message** — Disqualify or Escalate → manager-only review

---

## Architecture

```
INBOUND                  AI AGENTS (n8n)              OUTBOUND
───────                  ──────────────              ────────

Meta Lead Ad   ──►   Meta Lead Ingest
                            │
                            ▼
Direct curl    ──►   Lead Agent          ──►   Supabase
                            │                   Google Sheets
                            │ (if hot)          EspoCRM (optional)
                            ▼
                     Nurture Agent       ──►   Twilio WhatsApp
                            │                   (post-approval)
                            ▼
                     /approvals (human gate)
                            │
                            ▼
                     Visit Calendar      ──►   Google Calendar + Meet
                     Conversion Agent    ──►   Bookings + attribution
                     Ad Agent            ──►   Meta / Google / Portal ad copy
                     Listing Agent       ──►   pgvector embeddings
```

---

## Repo structure

```
build/
  n8n/                                          n8n workflow exports
    01_listing_agent.json                       RERA-grounded listing extraction
    02_ad_agent.json                            Multi-channel ad copy drafting
    03_lead_agent.json                          Lead Agent with RAG + activation loop
    04_nurture_agent.json                       WhatsApp draft + approve flow
    05_conversion_agent.json                    Visit outcome + objection analysis
    06_meta_lead_ingest.json                    Meta Lead Ads webhook
    07_visit_calendar.json                      Google Calendar event creation
    08_inbound_reply.json                       Twilio inbound + re-score
    09_visit_reminders.json                     Cron T-24h + T-2h reminders
  supabase/
    schema.sql                                  Base schema (10 tables + 4 views)
    migrations/                                 Incremental migrations
    seeds/                                      Demo data seeds
  dashboard/                                    React + Vite + TanStack Router
    src/
      lib/auth.tsx                              Role-based access control
      lib/data.ts                               Supabase queries + n8n calls
      components/                               Reusable UI primitives
      routes/                                   File-based routing (auth-gated)
  docs/                                         Setup runbooks (Meta, EspoCRM, Sheets)
  prompts/                                      Gemini system prompts
  scripts/                                      Embedding compute, seeding utilities
```

---

## Five AI agents

| Agent | Trigger | AI capability |
|---|---|---|
| **Lead** | Webhook | RAG + responseSchema + 4-model retry chain + three-way branch |
| **Nurture** | Webhook | Multi-language drafting (en/hi) + intent_gap_fill template + human approval gate |
| **Conversion** | Webhook | Per-objection severity + sentiment + booking sanity check |
| **Ad** | Webhook (per property) | Few-shot multi-channel creative generation + character-limit enforcement |
| **Listing** | Webhook (RERA URL) | HTML-to-structured-data extraction + upsert by RERA number |

---

## Dashboard — persona-aware RBAC

Three roles, three distinct views:

| Persona | Sees | Doesn't see |
|---|---|---|
| **Sales Head** | Everything — floor pipeline, KPIs, Live Lead Tester, all routes | — |
| **Sales Rep** | Only leads assigned to him, his visits, his approvals | Inventory, Campaigns, Analytics |
| **Marketing** | Campaigns + Creative Approvals + Source Funnel + Inventory | Leads, Visits, Approvals |

---

## Quick start (local)

```bash
# 1. Supabase (cloud)
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

## Stack

- **Orchestration**: n8n (workflow engine, self-hosted via npm)
- **Database**: Supabase Postgres + pgvector + Auth + RLS
- **LLM**: Google Gemini 2.5 Flash + Flash-Lite + Pro (four-model retry chain)
- **Messaging**: Twilio WhatsApp sandbox (production target: Meta WhatsApp Business Cloud API)
- **Frontend**: React + Vite + TanStack Router + Tailwind + shadcn/ui
- **Calendar**: Google Calendar API v3
- **Mirror**: Google Sheets API v4

---

## Honest constraints

- Twilio sandbox (free) is used for WhatsApp. Production needs Meta WhatsApp Business Cloud API migration for inbound on arbitrary numbers.
- EspoCRM push is env-gated and optional — not a required dependency.
- Gemini free tier rate limits hit during heavy testing; the four-model retry chain handles 429s gracefully.

---

## License

Capstone project for educational purposes.
