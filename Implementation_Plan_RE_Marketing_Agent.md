# Implementation Plan: Real Estate Marketing & Conversion Intelligence Agent

**Status**: Final, Ready for Execution (Updated post-PM Review)
**Author**: Alex (PM Agent) for Abhishek Ranjan  
**Date**: May 22, 2026  
**Capstone**: Product Space Advanced AI Program, Cohort 11  
**Demo Day**: June 1, 2026 (10 calendar days) | **Format**: Live demo, 1000 participants

---

## Resolved Decisions (All Blockers Cleared)

| Question | Decision | Rationale |
|----------|----------|-----------|
| LLM | **Gemini 2.5 Flash** (free, 1500 RPD) + **Gemini Pro** (user's paid account) | Zero cost for development; Flash handles scoring volume, Pro for complex qualification |
| Database/CRM | **Supabase** (cloud, free tier) | No Docker needed, PostgreSQL + auto REST API, 500MB storage, professional dashboard |
| n8n | **npm install** (no Docker) | `npm install -g n8n && n8n start` on Mac, runs on localhost:5678 |
| WhatsApp | **Twilio sandbox** (already configured) | Already set up by user |
| Ad Agent | **Simulated** with realistic data | No Meta/Google API keys needed; demonstrates workflow pattern |
| UI | **Next.js** | Routing, SSR, API routes built-in |
| Property data | **Kaggle CSV** + manual enrichment | Free, realistic, can enrich with RERA fields |
| Team | Solo | All tasks sized for one person |
| Demo | Live, 1000 participants | Requires hardening, fallbacks, rehearsal |

---

## 1. Problem Statement (Approved)

Indian real estate developers spend INR 700-4,500 per lead across portals, Meta/Google, and CPs, but cannot measure cost per qualified site visit or cost per booking. The funnel fractures after inquiry: slow response (4-6hr avg), manual qualification, fragmented channels, site-visit no-shows, and zero attribution.

**Wedge**: An AI conversion layer that turns fragmented inquiries into qualified site visits and bookings with full-funnel attribution.

---

## 2. Zero-Cost Tech Stack

> [!TIP]
> Every tool in this stack is either free-tier or already available. Total cost to build and demo: **INR 0**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ARCHITECTURE OVERVIEW                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              ORCHESTRATION: n8n (npm, localhost)               │  │
│  │         Installed via: npm install -g n8n && n8n start        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│       │            │            │            │            │         │
│  ┌────▼───┐  ┌─────▼────┐ ┌────▼───┐  ┌────▼────┐ ┌─────▼─────┐  │
│  │LISTING │  │   AD     │ │ LEAD   │  │NURTURE  │ │CONVERSION │  │
│  │ AGENT  │  │  AGENT   │ │ AGENT  │  │ AGENT   │ │  AGENT    │  │
│  │        │  │          │ │        │  │         │ │           │  │
│  │Extract │  │Simulated │ │Gemini  │  │Twilio   │ │Track &    │  │
│  │listings│  │campaigns │ │scoring │  │WhatsApp │ │extract    │  │
│  └────┬───┘  └─────┬────┘ └────┬───┘  └────┬────┘ └─────┬─────┘  │
│       │            │           │            │            │         │
│  ┌────▼────────────▼───────────▼────────────▼────────────▼─────┐  │
│  │              DATABASE: Supabase (Cloud, Free Tier)           │  │
│  │    PostgreSQL + Auto REST API + Auth + Real-time + Storage  │  │
│  │    500MB DB | Unlimited API | No Docker Required            │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │                  FRONTEND: Next.js App                       │  │
│  │  Dashboard | Lead Pipeline | Visit Tracker | Manager Apprvl │  │
│  │  Reads from Supabase via @supabase/supabase-js              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Supabase Database Schema

> [!NOTE]
> Supabase provides a PostgreSQL database with an auto-generated REST API, real-time subscriptions, and a professional-looking built-in table editor suitable for the demo.

### Tables

#### `properties`
```sql
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  developer TEXT,
  city TEXT NOT NULL,       -- Demo data: Delhi NCR, Mumbai, Pune, Bangalore
  locality TEXT,
  config TEXT,              -- "2BHK, 3BHK, 4BHK"
  price_min NUMERIC,        -- in lakhs
  price_max NUMERIC,        -- in lakhs
  carpet_area_sqft TEXT,    -- "650-1100"
  rera_number TEXT,
  possession_date TEXT,
  status TEXT DEFAULT 'Active',  -- Active, Sold Out, Upcoming
  amenities TEXT[],
  brochure_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `leads`
```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,              -- "99acres", "Housing.com", "Meta Ad", "Google Ad", "WhatsApp", "CP Referral", "Walk-in"
  inquiry_text TEXT,
  interested_project TEXT,
  budget_lakhs NUMERIC,
  preferred_config TEXT,    -- "3BHK"
  preferred_city TEXT,
  purchase_timeline TEXT,   -- "Immediately", "3 months", "6 months", "Exploring"
  loan_status TEXT,         -- "Pre-approved", "Applied", "Planning", "Not sure"
  stage TEXT DEFAULT 'New', -- New, Qualified, Visit Scheduled, Visited, Negotiation, Booked, Lost
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `lead_scores`
```sql
CREATE TABLE lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  fit_score INTEGER,         -- 0-100
  urgency_score INTEGER,     -- 0-100
  overall_score INTEGER,     -- weighted average
  fit_reasons TEXT[],        -- ["Budget matches 3BHK range", "Location: same city"]
  urgency_reasons TEXT[],    -- ["Timeline: 3 months", "Loan pre-approved"]
  recommended_action TEXT,   -- "Schedule site visit", "Send brochure", "Long-term nurture"
  matched_property_id UUID REFERENCES properties(id),
  scored_by TEXT DEFAULT 'Gemini AI',
  scored_at TIMESTAMPTZ DEFAULT now()
);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  channel TEXT DEFAULT 'WhatsApp', -- WhatsApp, Email, SMS
  direction TEXT,            -- "outbound", "inbound"
  template_name TEXT,        -- "acknowledgment", "brochure", "visit_reminder", "post_visit_recap"
  content TEXT,
  status TEXT DEFAULT 'pending_approval', -- pending_approval, sent, delivered, read, failed, rejected
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `visits`
```sql
CREATE TABLE visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  property_id UUID REFERENCES properties(id),
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'Scheduled', -- Scheduled, Confirmed, Completed, No-Show, Rescheduled, Cancelled
  attendees TEXT,            -- "Self + Spouse"
  objections TEXT[],         -- Extracted by Gemini: ["Price too high", "Possession delay concern"]
  post_visit_notes TEXT,
  next_action TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `bookings`
```sql
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  property_id UUID REFERENCES properties(id),
  visit_id UUID REFERENCES visits(id),
  unit_number TEXT,
  booking_amount NUMERIC,
  booking_date DATE,
  source_attribution TEXT,   -- Full chain: "Meta Ad > Lead Score 85 > Visit > Booking"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `campaigns`
```sql
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  platform TEXT,             -- "Meta", "Google", "Portal"
  campaign_name TEXT,
  ad_copy TEXT,
  target_audience TEXT,
  budget_inr NUMERIC,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  cpl_inr NUMERIC,
  status TEXT DEFAULT 'Active', -- Active, Paused, Completed
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `agent_logs` (Observability Layer)
```sql
CREATE TABLE agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT,         -- "Lead Agent", "Nurture Agent", etc.
  action TEXT,             -- "scored_lead", "sent_message", "extracted_objections"
  input_summary TEXT,      -- What the agent received
  output_summary TEXT,     -- What the agent produced
  lead_id UUID REFERENCES leads(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Multi-Agent Event Schema & Feedback Loops

To ensure this operates as a true multi-agent system rather than disconnected scripts, agents communicate via a shared event schema logged in Supabase:

- **LISTING_SYNCED** → Listing Agent emits → Ad Agent listens
- **LEAD_RECEIVED** → Webhook emits → Lead Agent listens
- **LEAD_SCORED** → Lead Agent emits → Nurture Agent listens
- **MESSAGE_SENT** → Nurture Agent emits → logged in `messages`
- **VISIT_SCHEDULED** → Conversion Agent emits → Nurture Agent listens (reminder flow)
- **VISIT_COMPLETED** → Conversion Agent emits → Nurture Agent (recap) + Lead Agent (closes feedback loop for scoring)
- **VISIT_NO_SHOW** → Conversion Agent emits → Nurture Agent (rescue flow)
- **BOOKING_MADE** → Conversion Agent emits → All agents (updates ROI, closes loop)
- **ESCALATION_TRIGGERED** → Any agent emits → Manager Dashboard alert

**Closed-Loop Feedback**: Conversion Agent outcomes (Visits completed, Bookings) feed directly back into the Lead Agent's Gemini context prompt, allowing it to dynamically adjust source quality and urgency weightings over time.

---

## 5. Gemini-Powered Lead Scoring

### Scoring Prompt (for n8n Gemini node)

```
You are a real estate lead scoring agent for Indian residential properties.
Given the lead inquiry, available property listings, and historical conversion feedback, score this lead:

HISTORICAL FEEDBACK:
[Include aggregated conversion rates by source/config from Supabase]

LEAD DATA:
{lead_data_json}

AVAILABLE PROPERTIES:
{properties_json}

Score the lead and return a JSON response with this exact structure:
{
  "fit_score": <0-100>,
  "urgency_score": <0-100>,
  "fit_reasons": ["reason 1", "reason 2"],
  "urgency_reasons": ["reason 1", "reason 2"],
  "recommended_action": "<one of: 'Schedule site visit', 'Send brochure', 'Disqualify'>",
  "matched_property": "<project name or null>",
  "qualification_message": "<draft WhatsApp message, professional but warm>"
}
```

---

## 6. Five-Agent n8n Workflows (Detailed)

### Agent 1: Listing Agent (with AI Extraction)
```
[Webhook: Raw Property Data (Messy CSV/Text)] 
    → [Gemini Flash: Extract structured fields (name, config, price, RERA)]
    → [Supabase: Check Duplicate by RERA] 
    → [IF: Duplicate?]
        → Yes: [Supabase: Update existing]
        → No: [Supabase: Insert new property]
    → [Supabase: Log Event LISTING_SYNCED]
```

### Agent 2: Ad Agent (Simulated)
```
[Trigger: Event LISTING_SYNCED]
    → [Gemini Flash: Generate platform-specific ad copy]
    → [Code Node: Simulate campaign metrics (impressions, clicks, CPL)]
    → [Supabase: Insert campaign record]
```

### Agent 3: Lead Agent (Core with Escalations)
```
[Webhook: New Lead Inquiry]
    → [Supabase: Insert/Update lead]
    → [Supabase: Fetch properties + historical conversion feedback]
    → [Gemini Flash: Score lead (JSON output)]
    → [Supabase: Insert lead_score + update lead stage]
    → [IF: Escalation Trigger?]
        → VIP Lead (>2Cr) OR Confidence < 50% → [Log Event ESCALATION_TRIGGERED]
        → Normal → [Log Event LEAD_SCORED]
```

### Agent 4: Nurture Agent (with Human-in-the-loop)
```
[Trigger: Event LEAD_SCORED OR VISIT_SCHEDULED]
    → [Gemini Flash: Draft personalized message]
    → [Supabase: Insert into `messages` with status = 'pending_approval']
    → [WAIT: Webhook from Next.js Manager Apprvl UI]
    → [IF: Approved?]
        → Yes: [Twilio WhatsApp: Send message] → [Supabase: Update status 'sent']
        → No: [Supabase: Update status 'rejected']
```

### Agent 5: Conversion Agent (with AI Objection Extraction)
```
[Trigger: Visit status updated manually via UI]
    → [IF: Status = Completed]
        → [Gemini Flash: Extract structured objections from free-text notes]
        → [Supabase: Update visit record with structured objections]
        → [Log Event VISIT_COMPLETED]
    → [IF: Status = Booking]
        → [Supabase: Create booking + build attribution chain]
        → [Log Event BOOKING_MADE]
```

---

## 7. Next.js Dashboard Design

### Screen Architecture

```
/                     → Command Center (metrics, agent_logs feed, escalations)
/leads                → Lead Pipeline (kanban + table)
/leads/[id]           → Lead Detail (score radar chart, history)
/approvals            → Manager Approval UI (Review drafted WhatsApps before send)
/visits               → Site Visit Tracker
/analytics            → Source ROI Dashboard
```

### The Manager Approval UI (Trust Layer)
**Crucial for Demo:** This screen shows all messages drafted by the Nurture Agent with `status = 'pending_approval'`. The Sales Manager clicks "Approve" (fires webhook to n8n to send via Twilio) or "Edit". This solves the #1 industry concern: bots sending hallucinated or inappropriate messages to high-value leads.

---

## 8. Model Validation (Eval Protocol)

To prove agent effectiveness during the demo, we will implement a basic eval protocol:
1. Curate a test set of **15 varied leads** (Walk-ins, Portal junk, Meta Ads, CP referrals).
2. Establish a "Ground Truth" expected score/action for each.
3. Run through the Lead Agent.
4. Output a simple **Validation Report** on the Dashboard comparing Gemini's score to Ground Truth, calculating a basic accuracy/alignment %.

---

## 9. MVP Scope (Capstone-Final)

### P0: Must Ship (Demo Day non-negotiable)
| # | Feature | Effort |
|---|---------|--------|
| 1 | Supabase schema + Agent Event logs + seed data | S |
| 2 | Next.js Manager Approval UI (Human-in-the-loop) | M |
| 3 | n8n Lead Agent (Scoring) | M |
| 4 | n8n Nurture Agent (Twilio WhatsApp) | M |
| 5 | n8n Conversion Agent (Visit tracking) | M |
| 6 | Next.js Command Center & Pipeline dashboards | L |

### P1: Should Ship (if time permits)
| # | Feature | Effort |
|---|---------|--------|
| 7 | Gemini objection extraction from visit notes | S |
| 8 | Closed-loop feedback (Outcomes → Lead Agent context) | M |
| 9 | Listing Agent data extraction | S |
| 10 | Next.js Source ROI dashboard | M |

---

## 10. 10-Day Build Plan

**Day 1-2: Infrastructure (May 22-23)**
- Create Supabase project & execute schema (incl. agent_logs).
- Curate demo data covering **Delhi NCR, Mumbai, Pune, Bangalore**.
- Install n8n via npm (`npm install -g n8n`).
- Init Next.js project.

**Day 3-4: Core Intelligence (May 24-25)**
- Build Lead Agent n8n workflow.
- Build Conversion Agent n8n workflow + objection extraction.
- Create the 15-lead Model Validation test set.

**Day 5-6: Nurture & Trust Layer (May 26-27)**
- Build Manager Approval UI in Next.js.
- Build Nurture Agent n8n workflow (Pending Approval -> Send).
- Twilio sandbox integration testing.

**Day 7-8: Dashboard & Feedback Loops (May 28-29)**
- Command Center UI + Agent Activity Feed.
- Lead Pipeline UI.
- Wire feedback loops (Visits → Scoring context).

**Day 9-10: Rehearsal & Demo Hardening (May 30-31)**
- Pre-load perfect demo data (full journey examples).
- Setup offline JSON fallbacks for UI in case of network issues.
- Record backup Loom video.

---

## 11. Live Demo Hardening (1000 Participants)

> [!CAUTION]
> Defense-in-depth strategy for live presentation.

1. **Pre-loaded Data**: 15 properties, 30 leads, 5 completed journeys ready.
2. **The "Wow" Flow**: 
   - Show live lead submission → Gemini scores in 3s.
   - Jump to Manager Approval UI → Click Approve.
   - Show WhatsApp arriving on phone.
   - Show structured objections extracted from visit notes.
3. **Offline Fallbacks**: `DEMO_MODE` flag in Next.js serves local JSON if APIs fail.

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini produces hallucinated property data | Low | High | Grounding: Only include exact DB properties in prompt; validate output fields. |
| AI messaging sounds robotic/inappropriate | Medium | High | Manager Approval UI ensures human-in-the-loop before any send. |
| Lead scoring diverges from sales reality | Medium | Medium | Closed-loop feedback: Agent receives visit/booking outcomes to auto-correct. |
| Supabase free tier pauses | Medium | High | Keep project active; use offline JSON fallbacks for UI. |
| Twilio sandbox limitations | Low | Medium | Register the presenter's phone number as verified in Twilio. |

---

## 13. Future Roadmap (v2 / Post-Capstone)

*Not in scope for current 10-day sprint, but documented for architectural completeness.*
- **RAG Layer**: Vector indexing for project brochures, floor plans, and RERA legal documents once property count exceeds 50.
- **Fine-Tuning Pipeline**: Transition from Gemini Flash prompt engineering to a fine-tuned classifier once 500+ scored leads with verified outcomes are collected.
- **Vector Memory**: For long-running WhatsApp nurtures (months-long journeys), replacing simple DB history with semantic retrieval.

---

## No Remaining Blockers

All decisions resolved. Architecture validated against product principles. Ready to start execution immediately.
