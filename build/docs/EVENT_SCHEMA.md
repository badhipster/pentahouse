# Agent Event Schema

Closed-loop architecture from PRD §5. Every cross-agent signal flows through `agent_events` so workflows can be debugged, replayed, and observed from the Command Center.

## Event bus contract

- **Table:** `agent_events`
- **Producers:** any agent (write a row)
- **Consumers:** n8n workflows poll/subscribe by `event_name`, then set `processed = true` after handling
- **Persistence:** always retain; this is the audit trail

## Event reference

| Event | Producer | Consumers | Required payload | Trigger |
|---|---|---|---|---|
| `LISTING_SYNCED` | Listing Agent | Ad Agent | `{property_id, fields_extracted}` | New/updated property persisted |
| `LEAD_RECEIVED` | System / Webhook | Lead Agent | `{lead_id, source, raw_text?}` | New row in `leads` from inbound webhook |
| `LEAD_SCORED` | Lead Agent | Nurture Agent, Dashboard | `{lead_id, overall_score, recommended_action}` | Score row written to `lead_scores` |
| `MESSAGE_SENT` | Nurture Agent | Dashboard | `{lead_id, message_id, template}` | Twilio acknowledges send |
| `VISIT_SCHEDULED` | Conversion Agent | Nurture Agent (reminder flow), Dashboard | `{lead_id, visit_id, date, time}` | New visit row created |
| `VISIT_COMPLETED` | Conversion Agent | Lead Agent (rescoring), Nurture Agent (recap) | `{visit_id, objections[], sentiment}` | Visit status set to Completed |
| `VISIT_NO_SHOW` | Conversion Agent | Nurture Agent (rescue flow) | `{visit_id, lead_id}` | Visit status set to No-Show |
| `BOOKING_MADE` | Conversion Agent | All agents (attribution refresh) | `{lead_id, property_id, amount, attribution_chain}` | Booking row created |
| `ESCALATION_TRIGGERED` | Any agent | Dashboard alert + Slack stub | `{lead_id, reason_code, reason_text}` | VIP budget, low confidence, human request |

## Escalation triggers (Story 7)

A `LEAD_SCORED` event becomes an `ESCALATION_TRIGGERED` event when any of:

- `budget_lakhs > 200` (>2Cr) → `reason_code = vip_budget`
- `lead_scores.confidence < 50` → `reason_code = low_confidence`
- Buyer message contains intent to talk to human (regex: `(speak|talk|call).*human|manager|agent`) → `reason_code = human_request`

## Closed-loop feedback edges

```
Conversion Agent
  ├─ VISIT_COMPLETED → Lead Agent (re-score: objection types adjust urgency)
  ├─ VISIT_COMPLETED → Nurture Agent (post-visit recap with objection-aware copy)
  ├─ VISIT_NO_SHOW  → Nurture Agent (rescue flow, T+24h)
  └─ BOOKING_MADE   → Ad Agent (mark this campaign as converting → boost in attribution dashboard)
```

The Lead Agent prompt (see `prompts/lead_scoring.md`) pulls a historical-feedback block from Supabase that aggregates: conversion rate by `source`, objection frequencies by `property_id`, average bookings-per-lead by `campaign_id`. This is the practical closed loop, not magic.
