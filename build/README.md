# Build artifacts — RE Marketing & Conversion Intelligence Agent

> **Capstone reviewer? Start here:** [`CAPSTONE_SUBMISSION.md`](./CAPSTONE_SUBMISSION.md) — 8-min case study, then the runbooks and audit.

This directory is the execution layer for the [PRD](../PRD_RE_Marketing_Conversion_Intelligence_Agent.md) and [Implementation Plan](../Implementation_Plan_RE_Marketing_Agent.md). Demo day was 2026-06-01 — cancelled, replaced by a Loom recording (see [`RECORDING_SCRIPT.md`](./RECORDING_SCRIPT.md)) and a written commercial thesis. Reasoning in [`docs/COMMERCIAL_THESIS.md`](./docs/COMMERCIAL_THESIS.md).

## Submission entry points (read in this order)

| File | What it is | Time |
|---|---|---|
| [`CAPSTONE_SUBMISSION.md`](./CAPSTONE_SUBMISSION.md) | Front-door case study | 8 min |
| [`SUBMISSION_DAY_CHECKLIST.md`](./SUBMISSION_DAY_CHECKLIST.md) | Pre-submit verification | 2 min |
| [`docs/AGENT_AUDIT.md`](./docs/AGENT_AUDIT.md) | Per-agent audit + v2 plan | 25 min |
| [`docs/COMMERCIAL_THESIS.md`](./docs/COMMERCIAL_THESIS.md) | Founder-mode buyer + pricing thesis | 12 min |
| [`docs/PILOT_PROPOSAL.md`](./docs/PILOT_PROPOSAL.md) | One-page pilot offer | 2 min |
| [`n8n/CHANGELOG_v2.md`](./n8n/CHANGELOG_v2.md) | Audit Week 1 changes per workflow | 5 min |
| [`docs/META_SETUP.md`](./docs/META_SETUP.md), [`docs/ESPO_SETUP.md`](./docs/ESPO_SETUP.md), [`docs/GSHEETS_SETUP.md`](./docs/GSHEETS_SETUP.md) | Integration setup runbooks | 10 min each |
| [`docs/CONTENT_GUIDE.md`](./docs/CONTENT_GUIDE.md) | Voice rules for every screen and toast | 8 min |
| [`docs/V2_ROADMAP.md`](./docs/V2_ROADMAP.md) | Phase 1-3 sequencing | 6 min |
| [`docs/TEST_CASES.md`](./docs/TEST_CASES.md) | 26 user-journey test cases | reference |
| [`RECORDING_SCRIPT.md`](./RECORDING_SCRIPT.md) | 3-min Loom script | reference |

## What's here

```
build/
├── README.md                ← you are here
├── supabase/
│   ├── schema.sql           ← 12 tables + 3 views + RLS + helper trigger
│   ├── seed_properties.sql  ← 15 projects (5 hero + 10 lighter) + visit_slots
│   ├── seed_campaigns.sql   ← 15 simulated Meta/Google/Portal campaigns
│   └── seed_leads.sql       ← 30 leads (15 eval + 15 demo) + scores + visits + 2 bookings + messages + escalations + logs + events
├── n8n/                     ← workflow JSON exports + IMPORT_GUIDE.md
├── prompts/                 ← Gemini prompt files: lead_scoring, intent_extraction, nurture_drafting, objection_extraction
├── seed/                    ← eval CSV + DATA_PROVENANCE.md
├── ui-handoff/
│   ├── FRONTEND_ONLY_PROMPT.md ← Day 2: UI A/B test on Lovable vs Replit (frontend only, fixtures-backed)
│   ├── LOVABLE_PROMPT.md       ← Day 5-6: Supabase-wired version of the chosen tool
│   ├── REPLIT_NOTES.md         ← platform-specific tips (both phases)
│   └── demo-fallback.json      ← Day 9-10: served when NEXT_PUBLIC_DEMO_MODE=true (live-demo failsafe)
└── docs/
    ├── EVENT_SCHEMA.md      ← agent_events contract + closed-loop feedback edges
    ├── ENV_TEMPLATE.md      ← every env var with where it's used
    ├── INSTALL.md           ← first-run runbook (Supabase, n8n, ngrok, smoke test)
    └── DEMO_RUNBOOK.md      ← live WhatsApp choreography for June 1 demo
```

## Resolved decisions (Q1-Q5 from PRD §10)

| | Decision |
|---|---|
| Q1 hero data | 5 hero projects (one per city + 1 extra) + 10 lighter ones, 15 total |
| Q2 approval UX | Single-key A / E / R shortcuts, buttons visible for discoverability |
| Q3 escalation | In-app alert card + Slack webhook stub; email v2 |
| Q4 language | Auto-detect EN/HI from inbound, English by default for opening message |
| Q5 visit slots | Developer-provided via `visit_slots` table, agent proposes, manager confirms |

## 10-day plan and where we are

| Day | Date | Status | Deliverables |
|---|---|---|---|
| 1-2 | May 22-23 | **DONE (Day 1)** | Supabase schema + seeds + UI handoff + infra docs |
| 3-4 | May 24-25 | next | n8n workflows for Lead Agent + Conversion Agent + Gemini prompts + eval CSV |
| 5-6 | May 26-27 | | Nurture Agent + Twilio sandbox integration + dashboard MVP from Lovable |
| 7-8 | May 28-29 | | Command Center + Pipeline + Source ROI + feedback loops wired |
| 9-10 | May 30-31 | | Rehearsal + offline fallback + Loom backup + demo deck |
| Demo | Jun 1   | | Live to ~1000 participants |

## How to start Day 2

1. Open [INSTALL.md](docs/INSTALL.md) and complete steps 1-2: create the Supabase project, run all four SQL files in order, install n8n via npm.
2. Confirm seed counts in Supabase Table Editor (see INSTALL.md step 1.5).
3. Paste [LOVABLE_PROMPT.md](ui-handoff/LOVABLE_PROMPT.md) into Lovable. Connect to the Supabase project. Let it scaffold while you start n8n workflows.
4. Run the smoke test from INSTALL.md step 5. If anything fails, the failure mode lives in `agent_logs` or the n8n execution log.

## Next files to land (Day 3-4)

- `prompts/lead_scoring.md` — the exact Gemini prompt with historical-feedback block (see `EVENT_SCHEMA.md` closed-loop section for what gets injected)
- `prompts/intent_extraction.md` — multi-turn extractor used by Lead Agent on each inbound WhatsApp reply
- `prompts/nurture_drafting.md` — message drafter grounded in property record
- `prompts/objection_extraction.md` — Conversion Agent post-visit extractor
- `n8n/03_lead_agent.json` — webhook → extractor → score → write → maybe-escalate
- `n8n/05_conversion_agent.json` — visit-status → objections → event → re-score
- `seed/eval_15_leads.csv` — flat export of the eval set for ground-truth review outside Supabase

## Operating notes for future Claude sessions

- The UI lives outside this conversation. Do not write `.tsx` / Tailwind classes / Next.js pages inline. Update `ui-handoff/LOVABLE_PROMPT.md` instead and let Abhishek regenerate.
- All schema mutations belong in a new versioned migration file in `supabase/migrations/NNNN_name.sql`. Do not edit `schema.sql` once a Supabase project is live with seed data — write a migration.
- Demo discipline: any feature that endangers the Manager Approval flow on June 1 gets cut. The trust layer is the demo.
