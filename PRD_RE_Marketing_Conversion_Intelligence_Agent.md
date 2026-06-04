# Product Requirements Document
## Real Estate Marketing & Conversion Intelligence Agent

**Author:** Abhishek Ranjan (PM)
**Status:** Approved for Build
**Date:** May 22, 2026
**Version:** 1.0
**Capstone:** Product Space Advanced AI Program, Cohort 11

---

## 1. Executive Summary

We are building a closed-loop, five-agent AI system that turns fragmented real estate inquiries into qualified site visits and bookings, with full-funnel attribution. The primary user is the inside sales manager at a residential developer in Delhi NCR, Mumbai, Pune, or Bangalore. The system captures buyer intent through a WhatsApp-first qualifier, scores leads with explainable AI rationale, drafts personalized nurture messages for manager approval, schedules and tracks site visits, extracts structured objections from outcomes, and feeds those outcomes back into scoring and message selection. Success is measured by lift in lead-to-visit conversion and time-to-first-qualifying-response, both of which today are bottlenecked by missing intent data and slow manual qualification.

---

## 2. Problem Statement

### Who has this problem
Inside sales managers and their executives at Indian residential developers and broker firms managing 50 to 500 weekly leads per active project across Delhi NCR, Mumbai, Pune, and Bangalore.

### What is the problem
Leads arrive with only name, phone, email, and project name. Sales teams do not know the buyer's purpose (buy, rent, invest, or browse), budget, configuration, timeline, financing readiness, or visit willingness. Without this intent data, executives call in sequence, send generic WhatsApp messages, and lose serious buyers to follow-up lag while wasting time on tire-kickers.

### Why is it painful
Indian developers spend INR 700 to 4500 per lead across portals, Meta, Google, and channel partners. Average first response time is 4 to 6 hours. The funnel fractures after inquiry through manual qualification, fragmented channels, site-visit no-shows, and zero source-to-booking attribution. The result is lead decay, not lead supply scarcity.

### Evidence
This is captured from the concept note's market research, validated by the senior PM reviewer who confirmed the missing-intent-data framing as the correct root cause. Specific buyer-side and seller-side observations live in the project's market research document.

---

## 3. Target Users & Personas

### Primary Persona: Sales Manager Priya
Head of inside sales at a mid-size residential developer running 2 to 4 active projects with a team of 5 to 20 inside sales executives. Owns approval power over outbound buyer communication and is accountable for visit and booking conversion. Logs in daily to triage hot leads, approve nurture messages, and review pipeline health. Wants AI assistance but will not trust unsupervised bot communication with high-value leads.

### Secondary Persona: Inside Sales Executive Rohit
Daily user managing 50 to 100 active leads. Needs ranked lead queue with intent context and recommended next action. Wants drafted messages he can approve and send fast.

### Secondary Persona: Marketing Lead Anjali
Owns ad spend across Meta, Google, and portals. Needs source attribution and campaign quality feedback. Logs in 2 to 3 times per week.

### Jobs-to-be-Done
- *Manager:* When I have 500 leads per week across my team, I want to know which leads are slipping and ensure outbound message quality so I can protect brand and hit visit targets.
- *Executive:* When I have 90 raw leads and an 8-hour day, I want to know which 10 leads to call first and what to say so I can hit my visit target.
- *Marketing:* When I am spending lakhs per month on lead acquisition, I want to know which sources actually produce bookings so I can re-allocate spend.

---

## 4. Strategic Context

### Capstone goal
Demonstrate a multi-agent AI product that goes beyond workflow automation, applies LLM reasoning, retrieval, and human-in-the-loop trust patterns to a real Indian B2B sales problem, and is defensible against the senior PM reviewer's critique that thin-AI projects become "process automation rather than meaningful AI products."

### Market opportunity
Indian residential real estate is a multi-billion-dollar primary sales market. There are an estimated 8000+ active RERA-registered residential projects across the four target cities. Mid-size developers (the SOM) typically operate without modern CRM intelligence and rely on portals plus channel partners. AI-native sales tools have not yet won this segment.

### Competitive context
Sell.Do, Anarock, Square Yards offer CRM + WhatsApp but with rule-based scoring and template messaging. Generic stacks (Zoho or HubSpot + WhatsApp Business + Excel) dominate small developers. None of these provide explainable AI scoring with natural-language rationale, RAG-grounded message generation, or closed-loop conversion attribution.

### Why now
WhatsApp Business API is mature in Indian sales. Buyers already use WhatsApp to compare projects. LLMs are now capable enough to extract intent from short informal replies. Post-COVID property discovery has shifted online. RERA transparency demands documented communication. Mid-market launches in NCR and Mumbai produce lead volumes small teams cannot manually qualify.

---

## 5. Solution Overview

A five-agent closed-loop system orchestrated through n8n, backed by Supabase as the shared data plane, with a Next.js dashboard for human interaction and Twilio for WhatsApp delivery. Gemini (Flash for high-volume tasks, Pro for complex qualification) powers the AI layer.

### The five agents and what each does
**Listing Agent** ingests property data (CSV, structured fields, or extracted text from project documents) and writes normalized Property records to Supabase.

**Ad Agent** generates platform-specific ad copy from project data and produces simulated campaign performance records to demonstrate the marketing surface and feed lead-source attribution.

**Lead Agent** receives inbound leads, runs a WhatsApp-first intent qualifier, extracts structured intent fields via Gemini, and produces Fit and Urgency scores with natural-language rationales and a recommended action per lead.

**Nurture Agent** drafts personalized WhatsApp messages from lead profile plus project context, queues them in the Manager Approval UI, and sends via Twilio only after manager approval. Tracks conversation history per lead.

**Conversion Agent** schedules and tracks site visits, extracts structured objection categories from sales notes using Gemini, logs booking outcomes, builds source-to-booking attribution chains, and emits feedback events back into the Lead and Nurture agents.

### The closed-loop architecture
Forward edges: Listing → Ad → Lead → Nurture → Conversion.
Feedback edges: Conversion outcomes feed back into Lead Agent scoring context, Nurture Agent message selection, and Ad Agent campaign attribution.
Shared state: Supabase tables (properties, leads, lead_scores, messages, visits, bookings, campaigns, agent_logs).
Event schema: LISTING_SYNCED, LEAD_RECEIVED, LEAD_SCORED, MESSAGE_SENT, VISIT_SCHEDULED, VISIT_COMPLETED, VISIT_NO_SHOW, BOOKING_MADE, ESCALATION_TRIGGERED.

### The hero user surface
The Manager Approval UI. Every outbound buyer message drafted by the Nurture Agent passes through this queue. Manager approves with one keystroke, edits and approves, or rejects. This is the trust layer that makes sales managers willing to deploy AI on their relationships.

### The AI capabilities demonstrated
LLM-based structured extraction (intent fields from WhatsApp replies, objection categories from sales notes, structured fields from listing inputs). LLM-reasoned scoring with natural-language rationales (Fit, Urgency, recommended action). LLM-drafted personalized outbound messages grounded in property context. Closed-loop feedback where outcome data shapes future agent decisions. Observable per-decision agent_logs for traceability and debugging.

---

## 6. Success Metrics

### Primary Metric
**Time from lead creation to first qualifying WhatsApp response with at least three intent fields captured.**
- Current baseline (industry): 4 to 6 hours.
- Target with the system: under 60 seconds.
- Rationale: every downstream conversion metric is bottlenecked by this.

### Secondary Metrics
- Lead-to-site-visit conversion rate, measured per source.
- Site-visit-to-booking conversion rate.
- Lead intent completion rate (percentage of leads with purpose, budget, timeline, configuration captured before sales handoff).
- Manager approval throughput (messages approved per minute, target above 20).
- AI scoring alignment with manual ground truth (target above 80 percent on the 15-lead eval set).

### Guardrail Metrics
- Manager rejection rate of AI-drafted messages (should trend downward; above 30 percent indicates draft quality issues).
- Hallucinated property claims in approved messages (target zero, verified by spot audit).
- Buyer opt-out rate on WhatsApp (should not exceed 5 percent).

---

## 7. User Stories & Requirements

### Epic Hypothesis
We believe that a closed-loop, five-agent AI system with WhatsApp-first intent capture, LLM-reasoned scoring, and manager-approved nurture messaging will reduce time-to-first-qualifying-response from hours to seconds and improve lead-to-visit conversion measurably, because the missing intent data and trust gap are the root causes of funnel decay in Indian residential sales.

### Story 1: Lead Intake and Intent Capture
**As an** inbound lead from a portal, Meta ad, or referral,
**I want to** be greeted on WhatsApp within seconds with a clear qualifying question,
**so that** my interest is understood and I am routed correctly.

*Acceptance criteria:* Inbound lead webhook triggers Lead Agent within 5 seconds. WhatsApp opening message sent within 30 seconds. Branches by purpose (buy, rent, invest, not sure). Captures at least three intent fields within first three buyer replies. Writes structured fields to Supabase leads table.

### Story 2: Explainable Lead Scoring
**As a** sales executive looking at my lead queue,
**I want to** see each lead's Fit score, Urgency score, and a one-line plain-language reason for each,
**so that** I can trust the ranking and know what to address in my outreach.

*Acceptance criteria:* Lead Agent produces fit_score (0 to 100), urgency_score (0 to 100), fit_reasons array, urgency_reasons array, and recommended_action. Rationale is generated by Gemini from lead profile and matched property context, not hardcoded. Scores update when new buyer replies arrive. Visible on lead detail screen as a score breakdown with reasons.

### Story 3: Manager-Approved Nurture Messages
**As a** sales manager,
**I want to** review every AI-drafted WhatsApp message before it is sent to a buyer,
**so that** brand voice is protected and no hallucinated facts reach the buyer.

*Acceptance criteria:* Nurture Agent writes drafted messages to Supabase messages table with status pending_approval. Approval UI shows queue ordered by lead priority. Keyboard shortcuts: A approve, E edit, R reject. Approve action triggers Twilio send and updates status to sent. Reject updates status to rejected and logs reason.

### Story 4: Site Visit Lifecycle Management
**As a** sales executive,
**I want to** schedule a site visit, send a confirmation and route, send a reminder before, and log the outcome after,
**so that** no-shows are reduced and outcomes flow back into the system.

*Acceptance criteria:* Visit record created in Supabase visits table. Confirmation WhatsApp sent via Nurture Agent (manager-approved). T-24h and T-2h reminders sent. Post-visit outcome captured (Scheduled, Confirmed, Completed, No-Show, Rescheduled, Cancelled). Free-text notes captured.

### Story 5: AI Objection Extraction and Feedback Loop
**As a** sales manager,
**I want to** see structured objection categories extracted from free-text visit notes and aggregated by project,
**so that** I can spot patterns and adjust pitch and message.

*Acceptance criteria:* When visit status set to Completed, Conversion Agent calls Gemini to extract structured objection categories (price, location, configuration, decision-maker, competitor, possession, financing, other) into visits.objections array. VISIT_COMPLETED event emitted with outcome payload. Lead Agent receives event and updates lead scoring context.

### Story 6: Source-to-Booking Attribution
**As a** marketing lead,
**I want to** see the full chain (source → campaign → lead → score → visit → booking) for each booking and aggregated by source,
**so that** I can re-allocate ad spend to channels that actually convert.

*Acceptance criteria:* Bookings table stores source_attribution as full chain string and structured references. Source ROI dashboard view aggregates leads, qualified leads, visits, bookings, and cost-per-stage by source.

### Story 7: Escalation Handling
**As a** sales manager,
**I want to** be alerted when a lead requires my direct attention,
**so that** high-value or uncertain situations are not missed.

*Acceptance criteria:* Lead Agent emits ESCALATION_TRIGGERED when budget exceeds INR 2 Cr OR scoring confidence falls below 50 percent OR buyer requests human contact. Escalations appear in dashboard as a distinct alert card with reason and recommended action.

### Story 8: Agent Observability
**As a** PM operating the system,
**I want to** see every agent decision logged with inputs, outputs, and timing,
**so that** I can debug, audit, and improve agent behavior.

*Acceptance criteria:* Every agent action writes a row to agent_logs (agent_name, action, input_summary, output_summary, lead_id, duration_ms). Command Center dashboard surfaces a live activity feed of agent actions.

---

## 8. Out of Scope

**Not in this release (deferred to v2):**

*Live Meta and Google Ads integration.* Campaign launch is simulated. Real API integration adds compliance and credential complexity not justified by capstone scope.

*RAG layer over property documents.* Project knowledge grounding currently uses Gemini prompt context with structured property data from Supabase. Vector indexing of brochures, RERA filings, and price sheets is documented as v2, to be added once property count and document volume justify it.

*Fine-tuned intent classifier.* Current intent classification uses Gemini prompt engineering. Fine-tuned small model is documented as v2, contingent on accumulating 500+ scored leads with verified outcomes.

*Vector memory for long-running buyer threads.* Current conversation memory uses Supabase message history. Semantic retrieval over long threads is documented as v2.

*Multi-language WhatsApp support beyond English and Hindi.* Regional languages are v2.

*Live rental inventory routing.* Rental intent is detected and tagged as parked. Active rental matching is v2.

*Mobile-native dashboard.* Web responsive only in v1.

---

## 9. Dependencies & Risks

### Technical Dependencies
- Supabase project with PostgreSQL and REST API (free tier).
- n8n running locally via npm with webhook endpoints reachable.
- Twilio WhatsApp sandbox with verified test numbers.
- Gemini API key (Flash + Pro access).
- Next.js development environment.

### External Dependencies
- Public RERA listings and Kaggle property datasets for demo content covering Delhi NCR, Mumbai, Pune, Bangalore.
- ngrok or equivalent tunneling for inbound WhatsApp webhook delivery to localhost n8n during testing.

### Risks and Mitigations

*Gemini produces hallucinated property facts in buyer messages.* Mitigation: every prompt grounded only in Supabase property records passed as structured context; manager approval gate before send; output field validation.

*AI-drafted messages sound robotic or inappropriate.* Mitigation: Manager Approval UI catches before send; rejection feedback should be logged for prompt iteration; tone calibrated through sample evaluation.

*Lead scoring diverges from sales reality.* Mitigation: closed-loop feedback from Conversion outcomes into Lead Agent context; 15-lead eval set as baseline accuracy check; manager override capability.

*Twilio sandbox limits prevent broad WhatsApp testing.* Mitigation: pre-register all test numbers; document upgrade path to Twilio production WhatsApp for post-capstone.

*Solo execution creates single-point delivery risk.* Mitigation: prioritized P0 vs. P1 scope; modular agent design so any one agent can be cut without breaking others.

---

## 10. Open Questions

*Q1: Hero project set for demo data.* Will Abhishek manually curate 5 hero projects (one per target city plus one additional) from public sources, or should the system seed with 15+ projects from Kaggle without per-project depth? **Pending decision.**

*Q2: Manager Approval UI shortcut model.* Single-key (A/E/R) versus button-click only. **Recommend single-key for speed; needs confirmation.**

*Q3: Escalation routing.* Should ESCALATION_TRIGGERED route to a Slack notification, an email, an in-app alert only, or all three? **Pending decision.**

*Q4: WhatsApp opening message tone and language detection.* Default to English with Hindi fallback if buyer replies in Hindi, or detect from inbound message language? **Recommend auto-detect; needs confirmation.**

*Q5: Visit scheduling source of truth.* Does the developer provide available slots via Supabase configuration, or does the agent propose any reasonable slot for the manager to confirm with the buyer? **Pending decision.**

---

## Appendix A: Agent Contract Summary

| Agent | Type | Inputs | Outputs | Decision Boundary |
|---|---|---|---|---|
| Listing | Tool-using | Property data (CSV, text, structured fields) | Supabase Property record + LISTING_SYNCED event | Autonomous on extraction; escalates ambiguous fields |
| Ad | Reasoning | Property record, target audience | Ad copy + simulated campaign metrics + campaign record | Autonomous on copy + simulation; no live spend |
| Lead | Conversational + Reasoning | Inbound lead webhook | Structured lead profile + Fit/Urgency scores + rationales + recommended action | Autonomous on scoring; escalates VIP or low-confidence |
| Nurture | Reasoning | Lead state, project context, conversation history | Drafted WhatsApp message queued for approval | Autonomous on drafting; manager approves all sends |
| Conversion | Tool-using + Reasoning | Visit and booking events, sales notes | Visit lifecycle updates + structured objections + attribution chain + feedback events | Autonomous on scheduling, reminders, extraction |

## Appendix B: Tech Stack Summary

| Layer | Tool | Rationale |
|---|---|---|
| Orchestration | n8n (local npm) | Fellowship requirement; workflow-based agent orchestration |
| Database | Supabase (free tier) | PostgreSQL + REST API + no Docker; professional dashboard |
| LLM | Gemini 2.5 Flash + Pro | Free tier covers dev; Flash for volume, Pro for complex |
| Messaging | Twilio WhatsApp Sandbox | Already configured; sufficient for build and test |
| Frontend | Next.js | SSR, API routes, modern UI |
| Observability | agent_logs table + Command Center | Per-decision traceability |

---

**End of PRD.**
