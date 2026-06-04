# Frontend-Only Build Prompt (Lovable + Replit Agent)

**Use this when:** you want to compare pure UI quality between Lovable and Replit Agent without Supabase wiring. The UI will read from a static fixtures file. We will swap to Supabase later by replacing one adapter file (instructions at the bottom).

**How to use:** copy everything below the divider into Lovable's new-project prompt, and into Replit Agent's brief. Do NOT connect Supabase. When prompted, decline.

---

## What we are building

A web dashboard for inside sales managers at Indian residential real-estate developers. It is the human surface for a five-agent AI system (Listing, Ad, Lead, Nurture, Conversion). The dashboard makes the AI's decisions visible, approvable, and observable.

**Primary user:** Sales Manager Priya at a mid-size developer running 2 to 4 active projects with 5 to 20 inside sales executives. She approves all outbound buyer messages and reviews pipeline health daily.

**The hero surface** is the Manager Approval screen. Every other screen serves it.

**This build is frontend-only.** Use the fixtures file as the single source of truth for data. Do not invent additional fields, do not call any external API, do not set up auth.

## Tech constraints

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui primitives (Button, Card, Dialog, Badge, Input, Tabs, Sheet, Toast, Command, ScrollArea, Separator)
- **Data:** import from a single file at `lib/fixtures.ts` (paste the fixtures provided at the bottom of this prompt into that file). All screens read from this file via a thin data layer in `lib/data.ts`.
- **State:** Zustand for cross-screen ephemeral state (focused approval card, pending optimistic mutations). React Server Components are fine for read-only screens.
- **Charts:** Recharts
- **Hindi rendering:** Use the system stack with a Devanagari fallback. Add to `globals.css`:
  ```css
  body { font-family: 'Inter', 'Noto Sans Devanagari', system-ui, sans-serif; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  ```

## The data layer (the only file you'll swap later)

Create `lib/data.ts` exporting these functions. **Every screen calls these and only these.** When we wire Supabase later, only this file changes.

```ts
// lib/data.ts
import { fixtures } from './fixtures'

export async function getLeadQueue() { return fixtures.lead_queue }
export async function getLead(id: string) { return fixtures.lead_queue.find(l => l.lead_id === id) }
export async function getMessages(leadId: string) { return fixtures.messages.filter(m => m.lead_id === leadId) }
export async function getPendingApprovals() { return fixtures.messages.filter(m => m.status === 'pending_approval') }
export async function getVisits(leadId?: string) {
  return leadId ? fixtures.visits.filter(v => v.lead_id === leadId) : fixtures.visits
}
export async function getEscalations() { return fixtures.escalations }
export async function getAgentLogs(limit = 50) { return fixtures.agent_logs.slice(0, limit) }
export async function getAgentEvents() { return fixtures.agent_events }
export async function getKPIs() { return fixtures.kpis }
export async function getPrimaryMetric() { return fixtures.primary_metric }
export async function getSourceROI() { return fixtures.source_roi }
export async function getProperties() { return fixtures.properties }
export async function getEvalAccuracy() { return fixtures.eval_accuracy }

// Mutations (in-memory only for frontend-only build)
export async function approveMessage(id: string) {
  const msg = fixtures.messages.find(m => m.message_id === id)
  if (msg) { msg.status = 'sent'; msg.sent_at = new Date().toISOString() }
  return msg
}
export async function rejectMessage(id: string, reason: string) {
  const msg = fixtures.messages.find(m => m.message_id === id)
  if (msg) { msg.status = 'rejected'; msg.rejection_reason = reason }
  return msg
}
export async function editAndApproveMessage(id: string, newContent: string) {
  const msg = fixtures.messages.find(m => m.message_id === id)
  if (msg) { msg.content = newContent; msg.status = 'sent'; msg.sent_at = new Date().toISOString() }
  return msg
}
```

## Six screens

### 1. `/` Command Center

**Top row, 4 KPI cards** (data from `getPrimaryMetric()` and `getKPIs()`):
- "Time to first qualifying response" — big number in seconds, with industry baseline `4-6h` as small subtitle. Green if under 60s.
- "Leads today vs yesterday" — count + delta arrow
- "Pending approvals" — count, click to navigate to `/approvals`
- "Conversion this week" — `bookings / qualified_leads %`

**Middle row, two columns:**
- **Left 60%:** Agent Activity Feed. List last 50 `agent_logs` rows. Each row shows: agent_name badge (colored), action, output_summary, duration_ms, relative timestamp. Status=warning → amber left border, status=error → rose left border. Title: "Agent Activity Feed (live)".
- **Right 40%:** Escalations card. Show each row from `getEscalations()` where status is `open` or `acknowledged`. Each card shows lead name, reason_code as a badge (vip_budget=gold, low_confidence=amber, human_request=rose), reason_text, "Open lead" link, "Acknowledge" button.

**Bottom row:** "Event funnel (last 7 days)". Bar chart from `getAgentEvents()` grouped by event_name. Use Recharts BarChart.

### 2. `/leads` Lead Pipeline

**Header controls:** search by name/phone, filter by stage, filter by source, filter by city.

**View toggle:** Kanban (default) | Table.

**Kanban columns:** New, Qualified, Visit Scheduled, Visited, Negotiation, Booked, Lost. Each card shows: name, masked phone (first 3 + last 3), source badge, fit/urgency mini-bars (horizontal slim bars 0-100), recommended_action, time-since-created. Drag-and-drop changes the lead's stage in-memory (Zustand).

**Table view columns:** Name, Source, City, Config, Budget (₹L), Fit, Urgency, Recommended Action, Stage, Created. Sortable. Click row navigates to `/leads/[id]`.

**Empty state:** illustration + "No leads in this view. Try clearing filters."

### 3. `/leads/[id]` Lead Detail

**Top header:** name, click-to-copy phone, email, source pill, language pill (EN or HI), stage dropdown.

**Score panel:** four big numbers for fit / urgency / overall / confidence. Recharts RadarChart of those four values. Below: two bulleted lists titled "Why fit" (`fit_reasons`) and "Why urgent" (`urgency_reasons`). Recommended action as a prominent CTA button. Matched project shown as a small card: image, project_name, locality, price band.

**Intent panel:** 3-column key-value grid showing `purpose, budget_lakhs, preferred_config, preferred_city, preferred_locality, purchase_timeline, loan_status, family_size, decision_makers`. Empty values render as "Not captured yet" in grey italic.

**Conversation panel:** WhatsApp-style thread of `getMessages(leadId)` sorted ascending. Outbound right-aligned with `bg-emerald-500/10` bubble. Inbound left-aligned with `bg-zinc-200` bubble. Pending-approval messages get a `border-amber-400 border-2` and inline "Approve / Edit / Reject" buttons. Hindi messages should render with the Devanagari font.

**Activity panel:** rolling `agent_logs` filtered by this lead_id, collapsed by default.

**Visits panel:** `getVisits(leadId)`. Show status badge, objection chips, post-visit notes excerpt, "View" link.

### 4. `/approvals` Manager Approval (HERO SCREEN)

**Layout:** two-pane.

**Left pane (40%):** Queue list from `getPendingApprovals()`. Each row: lead name, project, overall_score chip, relative time, language badge. The first item is auto-focused. Hovering shows the right pane content. Clicking sets focus.

**Right pane (60%):** Focused approval card.
1. Lead context strip at top: name, phone (masked), source, stage, score chip, top reason from `fit_reasons[0]`.
2. WhatsApp preview bubble: rounded green `bg-emerald-500`, white text, time stamp bottom-right, double-tick icon. Devanagari font for Hindi content.
3. Three buttons below: "Approve (A)" green primary, "Edit (E)" outline, "Reject (R)" rose outline.
4. **Edit mode:** clicking E (or pressing `E`) replaces the bubble with a textarea seeded with the content. "Save and Approve" button uses `editAndApproveMessage`.
5. **Reject mode:** clicking R (or pressing `R`) shows an inline form with a Select for reason (options: "Tone too pushy", "Hallucinated detail", "Off-template", "Wrong language", "Other") and an optional notes Textarea. Submit calls `rejectMessage`.

**Single-key shortcuts (capture at the page level when focus is not in an input):**
- `A` → approve focused message
- `E` → enter edit mode
- `R` → open reject form
- `J` or `↓` → next queue item
- `K` or `↑` → previous queue item
- `Esc` → exit edit/reject mode

After Approve or Reject, optimistically remove the item from the queue (200ms transition) and auto-focus the next item. Show a shadcn `toast` confirming the action.

**Empty state:** big check icon + "Inbox zero. All drafts handled."

### 5. `/visits` Site Visit Tracker

**Top:** date picker (date range), default to today + next 7 days.

**Three sections, each a Card:**
1. **Upcoming visits** — `visits where scheduled_date >= today`. Table with columns: lead name, project, slot (date + time), attendees, status badge, reminders sent (two pill icons: 24h ✓ and 2h ✓ each greyed or filled).
2. **Awaiting outcome** — `visits where status in ('Confirmed','Scheduled') AND scheduled_date < today`. Row click opens a side `Sheet` with a form:
   - Select status: Completed / No-Show / Rescheduled / Cancelled
   - Textarea for free-text notes
   - On Completed submit, call `markVisitCompleted(id, notes)` in the data layer, which sets status, post_visit_notes, and writes a stubbed objections array `['price','possession']` for the frontend-only build. Toast "Objections extracted: [price, possession]" to simulate the agent action.
3. **Recent visits** — last 30 days. Read-only. Objections as chips. Sentiment badge (positive=emerald, neutral=zinc, negative=rose).

### 6. `/analytics` Source ROI

**Top strip:** total spend last 30d, leads, qualified, visits, bookings, blended CPB (all from aggregating fixtures).

**Main table:** `getSourceROI()`. Columns: Source, Leads, Qualified, Visits Completed, Bookings, Spend (formatted as ₹X,XX,XXX), CPL, CPV, CPB. Tabular-nums font. Sort by CPB ascending by default. Each row expandable to show per-campaign breakdown from a `campaigns` array in the fixtures.

**Side chart:** Recharts BarChart of bookings per source over last 12 weeks (synthetic data from fixtures).

**Eval widget (Section 8 of PRD):** small Card titled "Model accuracy" showing `eval_accuracy.percent` as a big number with a colored badge: green if ≥80%, amber if 60-79%, rose if <60%. Subtitle: "X of 15 eval leads scored within ±1 band of ground truth."

## Cross-cutting design

**Color system (Tailwind tokens):**
- Primary: `emerald-600`
- Accent: `indigo-600`
- Warning: `amber-500`
- Danger: `rose-600`
- Backgrounds: `zinc-50` light, `zinc-900` dark
- Support both light and dark mode

**Agent badges:**
- Listing → slate, Ad → violet, Lead → emerald, Nurture → blue, Conversion → orange, System → zinc

**Layout shell:** Persistent left sidebar with 5 nav items (Command Center icon: Home, Pipeline: Users, Approvals: CheckCheck, Visits: Calendar, Analytics: BarChart3). Top bar with global search opening a Cmd+K palette (use shadcn `Command`), notifications bell with badge count from open escalations, manager avatar (use initials).

**Empty states everywhere.** Loading: Suspense + skeleton matching each card. Toasts auto-dismiss in 4s.

## What NOT to do

- Do not connect Supabase, do not set up auth, do not add a chatbot widget.
- Do not invent fields not in the fixtures.
- Do not put real phone numbers unmasked except in the copy-to-clipboard interaction on `/leads/[id]`.
- Do not make changes that would force fixtures.ts to change shape. The shape is the contract.

## Acceptance test

Before claiming done, verify:

1. `/approvals` shows exactly 3 pending messages from fixtures (Smita Joshi, Anant Verma, Imran Sheikh in Hindi).
2. Pressing `A` while focused on a card removes it from the queue within 200ms and surfaces a toast.
3. `/leads/lead-28` (Deepak Choudhary) shows his completed visit, booking E-1204, full thread.
4. `/analytics` shows CP Referral with the lowest CPB.
5. `/` shows 9+ items in the activity feed and 3 escalations.
6. Cmd+K palette works and finds "Whitefield".
7. Both light and dark mode render cleanly.

---

## FIXTURES FILE — paste this into `lib/fixtures.ts`

```ts
// lib/fixtures.ts
// SOURCE OF TRUTH for the frontend-only build.
// Shape matches the Supabase views v_lead_queue, v_source_roi, v_primary_metric
// plus raw tables messages, visits, escalations, agent_logs, agent_events.
// When we wire Supabase later, ONLY lib/data.ts changes — this file is unused.

export const fixtures = {
  primary_metric: {
    median_sec_to_first_response_today: 47,
    industry_baseline_sec: 18000,
  },
  kpis: {
    leads_today: 12,
    leads_yesterday: 9,
    pending_approvals: 3,
    weekly_conversion_pct: 11.4,
    total_spend_30d_inr: 2630000,
    leads_30d: 30,
    qualified_30d: 24,
    visits_completed_30d: 5,
    bookings_30d: 2,
    blended_cpb_inr: 1315000,
  },
  eval_accuracy: {
    percent: 87,
    matches: 13,
    total: 15,
  },
  properties: [
    { id: 'prop-1', project_name: 'Skyline Residences', developer: 'DLF', city: 'Delhi NCR', locality: 'Sector 76, Gurugram', config: '2BHK, 3BHK', price_min_lakhs: 95, price_max_lakhs: 185, possession_date: 'Dec 2027', image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00' },
    { id: 'prop-2', project_name: 'Oceanic Heights', developer: 'Lodha', city: 'Mumbai', locality: 'Lower Parel', config: '2BHK, 3BHK, 4BHK', price_min_lakhs: 320, price_max_lakhs: 740, possession_date: 'Jun 2026', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688' },
    { id: 'prop-3', project_name: 'Greens of Kharadi', developer: 'Kolte-Patil', city: 'Pune', locality: 'Kharadi', config: '2BHK, 3BHK', price_min_lakhs: 78, price_max_lakhs: 142, possession_date: 'Mar 2027', image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6' },
    { id: 'prop-4', project_name: 'Whitefield Verdant', developer: 'Prestige', city: 'Bangalore', locality: 'Whitefield, ITPL Road', config: '2BHK, 3BHK, 3.5BHK', price_min_lakhs: 105, price_max_lakhs: 215, possession_date: 'Sep 2027', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c' },
    { id: 'prop-5', project_name: 'Noida Sky Park', developer: 'Godrej', city: 'Delhi NCR', locality: 'Sector 150, Noida', config: '3BHK, 4BHK', price_min_lakhs: 175, price_max_lakhs: 410, possession_date: 'Dec 2028', image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9' },
  ],
  lead_queue: [
    { lead_id: 'lead-7',  name: 'Ananya Pillai',     phone: '+919810012307', source: 'Meta Ad',     stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 440, preferred_config: '3BHK',   preferred_city: 'Mumbai',     purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(3),  fit_score: 95, urgency_score: 96, overall_score: 96, confidence: 96, fit_reasons: ['Budget 4.4Cr matches Oceanic 3BHK premium tier','Pre-approved with HDFC'], urgency_reasons: ['Ready-to-move + immediate timeline'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-2', matched_project: 'Oceanic Heights' },
    { lead_id: 'lead-12', name: 'Divya Nair',         phone: '+919810012312', source: 'Walk-in',     stage: 'Visit Scheduled', purpose: 'buy',  budget_lakhs: 195, preferred_config: '3.5BHK', preferred_city: 'Bangalore',  purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(3),  fit_score: 93, urgency_score: 94, overall_score: 94, confidence: 95, fit_reasons: ['Returning walk-in: prior site visit','3.5BHK matches Verdant top tier'], urgency_reasons: ['Immediate timeline','Loan pre-approved'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-4', matched_project: 'Whitefield Verdant' },
    { lead_id: 'lead-28', name: 'Deepak Choudhary',   phone: '+919810012328', source: 'Meta Ad',     stage: 'Booked',          purpose: 'buy',  budget_lakhs: 175, preferred_config: '3BHK',   preferred_city: 'Bangalore',  purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(15), fit_score: 93, urgency_score: 95, overall_score: 94, confidence: 94, fit_reasons: ['3BHK Verdant exact match','Loan pre-approved'], urgency_reasons: ['Immediate timeline','Closed in 3 days'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-4', matched_project: 'Whitefield Verdant' },
    { lead_id: 'lead-1',  name: 'Rahul Mehra',        phone: '+919810012301', source: 'Meta Ad',     stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 160, preferred_config: '3BHK',   preferred_city: 'Delhi NCR',  purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(7),  fit_score: 92, urgency_score: 95, overall_score: 93, confidence: 94, fit_reasons: ['Budget 1.6Cr matches Skyline 3BHK range','City and locality exact match'], urgency_reasons: ['Timeline: Immediately','Loan pre-approved'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-1', matched_project: 'Skyline Residences' },
    { lead_id: 'lead-22', name: 'Anant Verma',        phone: '+919810012322', source: 'CP Referral', stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 170, preferred_config: '3BHK',   preferred_city: 'Bangalore',  purchase_timeline: '3 months',    language: 'en', intent_fields_count: 7, created_at: hoursAgo(5),  fit_score: 93, urgency_score: 90, overall_score: 92, confidence: 94, fit_reasons: ['Budget 1.7Cr exact match for Verdant 3BHK','Named CP referral'], urgency_reasons: ['3-month timeline','Pre-approved'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-4', matched_project: 'Whitefield Verdant' },
    { lead_id: 'lead-13', name: 'Arvind Patil',       phone: '+919810012313', source: 'CP Referral', stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 130, preferred_config: '3BHK',   preferred_city: 'Pune',       purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(1),  fit_score: 91, urgency_score: 93, overall_score: 92, confidence: 94, fit_reasons: ['Budget 1.3Cr matches Kharadi 3BHK','Named CP referral context'], urgency_reasons: ['Visit requested this weekend','Loan applied'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-3', matched_project: 'Greens of Kharadi' },
    { lead_id: 'lead-29', name: 'Priyanka Das',       phone: '+919810012329', source: 'CP Referral', stage: 'Booked',          purpose: 'buy',  budget_lakhs: 132, preferred_config: '3BHK',   preferred_city: 'Pune',       purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: daysAgo(13), fit_score: 91, urgency_score: 94, overall_score: 92, confidence: 94, fit_reasons: ['3BHK Kharadi exact match','CP-referred'], urgency_reasons: ['Closed in 48h after visit'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-3', matched_project: 'Greens of Kharadi' },
    { lead_id: 'lead-21', name: 'Smita Joshi',        phone: '+919810012321', source: 'Meta Ad',     stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 330, preferred_config: '2BHK',   preferred_city: 'Mumbai',     purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 7, created_at: hoursAgo(6),  fit_score: 92, urgency_score: 88, overall_score: 90, confidence: 93, fit_reasons: ['Budget 3.3Cr matches Oceanic 2BHK premium','Possession in 13 months satisfies buyer'], urgency_reasons: ['Immediate timeline','Loan applied'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-2', matched_project: 'Oceanic Heights' },
    { lead_id: 'lead-8',  name: 'Karthik Iyer',       phone: '+919810012308', source: 'Meta Ad',     stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 125, preferred_config: '3BHK',   preferred_city: 'Pune',       purchase_timeline: '3 months',    language: 'en', intent_fields_count: 7, created_at: daysAgo(2),  fit_score: 90, urgency_score: 88, overall_score: 89, confidence: 92, fit_reasons: ['Budget 1.25Cr fits Kharadi 3BHK range','Walk-to-work to EON IT Park'], urgency_reasons: ['3-month shift timeline','Loan applied'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-3', matched_project: 'Greens of Kharadi' },
    { lead_id: 'lead-9',  name: 'Meera Krishnan',     phone: '+919810012309', source: 'Google Ad',   stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 160, preferred_config: '3BHK',   preferred_city: 'Bangalore',  purchase_timeline: '6 months',    language: 'en', intent_fields_count: 7, created_at: daysAgo(2),  fit_score: 86, urgency_score: 55, overall_score: 73, confidence: 88, fit_reasons: ['Budget 1.6Cr matches Verdant 3BHK','Schools-nearby USP aligns'], urgency_reasons: ['6-month decision anchored to school year'], recommended_action: 'Send brochure', matched_property_id: 'prop-4', matched_project: 'Whitefield Verdant' },
    { lead_id: 'lead-19', name: 'Imran Sheikh',       phone: '+919810012319', source: 'WhatsApp',    stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 70,  preferred_config: '2BHK',   preferred_city: 'Pune',       purchase_timeline: '3 months',    language: 'hi', intent_fields_count: 6, created_at: daysAgo(1),  fit_score: 82, urgency_score: 75, overall_score: 79, confidence: 90, fit_reasons: ['Hindi-language buyer, locality + config match','Budget 70L fits Wagholi/Kharadi 2BHK'], urgency_reasons: ['3-month timeline'], recommended_action: 'Schedule site visit', matched_property_id: 'prop-3', matched_project: 'Greens of Kharadi' },
    { lead_id: 'lead-4',  name: 'Vikram Sethi',       phone: '+919810012304', source: 'CP Referral', stage: 'Qualified',       purpose: 'invest', budget_lakhs: 250, preferred_config: '4BHK',  preferred_city: 'Mumbai',     purchase_timeline: '3 months',    language: 'en', intent_fields_count: 5, created_at: daysAgo(4),  fit_score: 88, urgency_score: 62, overall_score: 75, confidence: 76, fit_reasons: ['Budget 2.5Cr fits Oceanic 4BHK band','Multi-unit interest signals investor profile'], urgency_reasons: ['Timeline 3 months','Multi-unit raises stakes'], recommended_action: 'Escalate to manager', matched_property_id: 'prop-2', matched_project: 'Oceanic Heights' },
    { lead_id: 'lead-11', name: 'Rajesh Subramanian', phone: '+971501234567', source: 'WhatsApp',    stage: 'Qualified',       purpose: 'invest', budget_lakhs: 400, preferred_config: '3BHK',  preferred_city: 'Mumbai',     purchase_timeline: '3 months',    language: 'en', intent_fields_count: 5, created_at: daysAgo(1),  fit_score: 85, urgency_score: 58, overall_score: 73, confidence: 72, fit_reasons: ['NRI multi-unit fits luxury portfolio play','Mumbai/NCR coverage available'], urgency_reasons: ['3-month window for finalisation'], recommended_action: 'Escalate to manager', matched_property_id: 'prop-2', matched_project: 'Oceanic Heights' },
    { lead_id: 'lead-10', name: 'Sunil Yadav',        phone: '+919810012310', source: 'Portal',      stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 60,  preferred_config: '2BHK',   preferred_city: 'Delhi NCR',  purchase_timeline: '6 months',    language: 'en', intent_fields_count: 6, created_at: daysAgo(1),  fit_score: 72, urgency_score: 32, overall_score: 55, confidence: 84, fit_reasons: ['Budget 60L fits Faridabad Greens 2BHK','City match'], urgency_reasons: ['2-3 year possession horizon is fine for buyer'], recommended_action: 'Send brochure', matched_property_id: null, matched_project: 'Faridabad Greens' },
    { lead_id: 'lead-15', name: 'Sameer Joshi',       phone: '+919810012315', source: 'Meta Ad',     stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 110, preferred_config: '2BHK',   preferred_city: 'Bangalore',  purchase_timeline: '6 months',    language: 'en', intent_fields_count: 6, created_at: daysAgo(5),  fit_score: 74, urgency_score: 30, overall_score: 54, confidence: 87, fit_reasons: ['Budget 1.1Cr fits Verdant 2BHK','Locality match'], urgency_reasons: ['6-month decision stated upfront'], recommended_action: 'Send brochure', matched_property_id: 'prop-4', matched_project: 'Whitefield Verdant' },
    { lead_id: 'lead-14', name: 'Pooja Sharma',       phone: '+919810012314', source: 'Google Ad',   stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 140, preferred_config: '3BHK',   preferred_city: 'Delhi NCR',  purchase_timeline: '6 months',    language: 'en', intent_fields_count: 6, created_at: daysAgo(5),  fit_score: 68, urgency_score: 28, overall_score: 49, confidence: 86, fit_reasons: ['Budget 1.4Cr roughly aligns','Locality match'], urgency_reasons: ['6-12 month research horizon'], recommended_action: 'Long-term nurture', matched_property_id: 'prop-1', matched_project: 'Skyline Residences' },
    { lead_id: 'lead-6',  name: 'Neha Goyal',         phone: '+919810012306', source: 'Google Ad',   stage: 'Qualified',       purpose: 'buy',  budget_lakhs: 100, preferred_config: '4BHK',   preferred_city: 'Delhi NCR',  purchase_timeline: '3 months',    language: 'en', intent_fields_count: 6, created_at: daysAgo(4),  fit_score: 55, urgency_score: 58, overall_score: 57, confidence: 80, fit_reasons: ['Budget 1Cr is below 4BHK floor in this micro-market','Locality match'], urgency_reasons: ['Timeline 3 months'], recommended_action: 'Send brochure', matched_property_id: 'prop-1', matched_project: 'Skyline Residences' },
    { lead_id: 'lead-3',  name: 'Sonia Bhatt',        phone: '+919810012303', source: 'Housing.com', stage: 'New',             purpose: 'rent', budget_lakhs: null, preferred_config: '2BHK',  preferred_city: 'Bangalore',  purchase_timeline: 'Immediately', language: 'en', intent_fields_count: 4, created_at: daysAgo(5),  fit_score: 12, urgency_score: 80, overall_score: 46, confidence: 90, fit_reasons: ['Rent intent on a sales-only product','Unit type matches but transaction type does not'], urgency_reasons: ['Immediate move-in requested'], recommended_action: 'Disqualify', matched_property_id: null, matched_project: null },
    { lead_id: 'lead-2',  name: 'Aman Khurana',       phone: '+919810012302', source: '99acres',     stage: 'New',             purpose: 'browse', budget_lakhs: null, preferred_config: null,  preferred_city: 'Delhi NCR',  purchase_timeline: 'Exploring',   language: 'en', intent_fields_count: 2, created_at: daysAgo(6),  fit_score: 22, urgency_score: 18, overall_score: 20, confidence: 82, fit_reasons: ['No budget signal','No config preference shared'], urgency_reasons: ['Stated "just exploring"'], recommended_action: 'Long-term nurture', matched_property_id: null, matched_project: null },
    { lead_id: 'lead-5',  name: 'Unknown Caller',     phone: '+919810012305', source: 'WhatsApp',    stage: 'New',             purpose: 'not_sure', budget_lakhs: null, preferred_config: null, preferred_city: null,       purchase_timeline: null,          language: 'en', intent_fields_count: 0, created_at: hoursAgo(6),  fit_score: 8,  urgency_score: 12, overall_score: 10, confidence: 38, fit_reasons: ['No fit signals extractable'], urgency_reasons: ['Single ambiguous message'], recommended_action: 'Escalate to manager', matched_property_id: null, matched_project: null },
  ],
  messages: [
    // Sent + inbound for lead-1
    { message_id: 'msg-1',  lead_id: 'lead-1',  direction: 'outbound', content: 'Hi Rahul, thanks for the interest in Skyline Residences. Quick check: 2BHK or 3BHK, and what is your move-in timeline?', language: 'en', status: 'sent',     created_at: daysAgo(7), sent_at: daysAgo(7) },
    { message_id: 'msg-2',  lead_id: 'lead-1',  direction: 'inbound',  content: '3BHK. Want to shift in 2 months. Loan pre-approved with ICICI.',                                                              language: 'en', status: 'delivered',created_at: daysAgo(7) },
    { message_id: 'msg-3',  lead_id: 'lead-1',  direction: 'outbound', content: 'Great, Rahul. Skyline 3BHK fits your budget. We have slots Sat 10:00 / 11:30 and Sun 16:00. Which works?',                   language: 'en', status: 'sent',     created_at: daysAgo(7), sent_at: daysAgo(7) },
    // PENDING APPROVAL (the 3 demo cards)
    { message_id: 'msg-21', lead_id: 'lead-21', direction: 'outbound', content: 'Hi Smita, Oceanic Heights 2BHK in your 3-3.5Cr range has 28F+ sea-view units. Possession is Jun 2026 (13 months). I can hold Sat 16:00 or Sun 11:30 for a site visit. Which works for you?', language: 'en', status: 'pending_approval', created_at: minutesAgo(5) },
    { message_id: 'msg-22', lead_id: 'lead-22', direction: 'outbound', content: 'Hi Anant, thanks to Mohit for the intro. Whitefield Verdant 3BHK (1380 sqft) at 1.7Cr is a clean fit. Site visit Saturday 11:30 or Sunday 10:00?', language: 'en', status: 'pending_approval', created_at: minutesAgo(3) },
    { message_id: 'msg-19', lead_id: 'lead-19', direction: 'outbound', content: 'नमस्ते Imran जी, Greens of Kharadi में 2BHK 78-95 लाख रेंज में है। 70 लाख बजट के लिए Wagholi Springs भी देख सकते हैं। दोनों के brochures भेज दूं?',                          language: 'hi', status: 'pending_approval', created_at: minutesAgo(2) },
    // post-visit + booking thanks
    { message_id: 'msg-25', lead_id: 'lead-25', direction: 'outbound', content: 'Hi Geeta, thanks for visiting Skyline. Sharing the Dec 2027 possession clause with penalty terms here: [pdf]. Happy to set a call once your Bangalore consult is done.', language: 'en', status: 'sent', created_at: daysAgo(4), sent_at: daysAgo(4) },
    { message_id: 'msg-28', lead_id: 'lead-28', direction: 'outbound', content: 'Welcome to Whitefield Verdant family, Deepak. Unit E-1204 is yours. Onboarding pack and registration steps coming up tomorrow.', language: 'en', status: 'sent', created_at: daysAgo(13), sent_at: daysAgo(13) },
    // rejected
    { message_id: 'msg-30', lead_id: 'lead-30', direction: 'outbound', content: 'Hi Faisal, we revised Oceanic Heights possession timeline. Worth a 10-min call this week?', language: 'en', status: 'rejected', rejection_reason: 'Too pushy for a lost lead; needs softer reactivation tone', created_at: daysAgo(18) },
  ],
  visits: [
    { id: 'visit-25', lead_id: 'lead-25', property_id: 'prop-1', scheduled_date: daysAgoDate(5), scheduled_time: '11:30', status: 'Completed', attendees: 'Self + Spouse + Parents', objections: ['decision-maker','possession'], post_visit_notes: 'Liked the layout. Joint family wants to consult uncle in Bangalore before deciding. Concerned about Dec 2027 possession; needs documentation on penalty clauses.', sentiment: 'positive' },
    { id: 'visit-26', lead_id: 'lead-26', property_id: 'prop-2', scheduled_date: daysAgoDate(4), scheduled_time: '17:30', status: 'Completed', attendees: 'Self + Spouse',           objections: ['price','configuration'],     post_visit_notes: 'Loved the sea view from 28F+. Asked for revised pricing on corner units. Wants 4BHK with separate study; pure 4BHK feels tight.',                                       sentiment: 'positive' },
    { id: 'visit-27', lead_id: 'lead-27', property_id: 'prop-3', scheduled_date: daysAgoDate(9), scheduled_time: '10:00', status: 'Completed', attendees: 'Self + Spouse',           objections: ['price','financing'],         post_visit_notes: 'Negotiating discount on floor-rise. Wants assistance switching loan from SBI to lower-rate option.',                                                                   sentiment: 'neutral'  },
    { id: 'visit-28', lead_id: 'lead-28', property_id: 'prop-4', scheduled_date: daysAgoDate(13),scheduled_time: '16:00', status: 'Completed', attendees: 'Self + Spouse',           objections: [],                            post_visit_notes: 'Booking confirmed at visit. Selected E-1204, 3BHK 1380 sqft, south-east facing.',                                                                                       sentiment: 'positive' },
    { id: 'visit-29', lead_id: 'lead-29', property_id: 'prop-3', scheduled_date: daysAgoDate(11),scheduled_time: '11:30', status: 'Completed', attendees: 'Self + Spouse',           objections: [],                            post_visit_notes: 'Booking confirmed within 48h of visit. Selected B-805, 3BHK 1240 sqft.',                                                                                                sentiment: 'positive' },
    { id: 'visit-12', lead_id: 'lead-12', property_id: 'prop-4', scheduled_date: daysFromNowDate(2), scheduled_time: '11:30', status: 'Confirmed', attendees: 'Self + Spouse',        objections: [], post_visit_notes: null, sentiment: null, reminder_24h_sent: false, reminder_2h_sent: false },
    { id: 'visit-23', lead_id: 'lead-23', property_id: 'prop-3', scheduled_date: daysFromNowDate(3), scheduled_time: '10:00', status: 'Scheduled', attendees: 'Self + Spouse + Parents', objections: [], post_visit_notes: null, sentiment: null, reminder_24h_sent: false, reminder_2h_sent: false },
    { id: 'visit-24', lead_id: 'lead-24', property_id: 'prop-4', scheduled_date: daysFromNowDate(4), scheduled_time: '16:00', status: 'Scheduled', attendees: 'Self + Spouse',           objections: [], post_visit_notes: null, sentiment: null, reminder_24h_sent: false, reminder_2h_sent: false },
  ],
  escalations: [
    { id: 'esc-1', lead_id: 'lead-4',  lead_name: 'Vikram Sethi',       reason_code: 'vip_budget',     reason_text: 'Budget 2.5Cr triggers >2Cr VIP threshold; investor profile, multi-unit interest', recommended_action: 'Priya to call within 30 min', status: 'open',         created_at: daysAgo(4) },
    { id: 'esc-2', lead_id: 'lead-5',  lead_name: 'Unknown Caller',     reason_code: 'low_confidence', reason_text: 'Single-message lead with insufficient signal (confidence 38%)',                  recommended_action: 'Manual qualifier call',       status: 'open',         created_at: hoursAgo(6) },
    { id: 'esc-3', lead_id: 'lead-11', lead_name: 'Rajesh Subramanian', reason_code: 'vip_budget',     reason_text: 'NRI multi-unit, 3-5Cr per unit; loan complexity',                                 recommended_action: 'Loop in NRI desk + Priya',    status: 'acknowledged', created_at: daysAgo(1) },
  ],
  agent_logs: [
    { agent_name: 'Nurture Agent',    action: 'drafted_message',     input_summary: 'Lead lead-19 LEAD_SCORED event (HI)',                output_summary: 'intake_qualifier drafted HI',                                lead_id: 'lead-19', duration_ms: 1180, status: 'ok',      created_at: minutesAgo(2) },
    { agent_name: 'Nurture Agent',    action: 'drafted_message',     input_summary: 'Lead lead-22 LEAD_SCORED event',                     output_summary: 'site_visit_invite drafted EN',                              lead_id: 'lead-22', duration_ms: 1080, status: 'ok',      created_at: minutesAgo(3) },
    { agent_name: 'Nurture Agent',    action: 'drafted_message',     input_summary: 'Lead lead-21 LEAD_SCORED event',                     output_summary: 'site_visit_invite drafted EN',                              lead_id: 'lead-21', duration_ms: 1120, status: 'ok',      created_at: minutesAgo(5) },
    { agent_name: 'Lead Agent',       action: 'scored_lead',         input_summary: 'Lead lead-21 reply with budget+timeline',            output_summary: 'fit=92 urgency=88 action=Schedule site visit',              lead_id: 'lead-21', duration_ms: 1750, status: 'ok',      created_at: minutesAgo(6) },
    { agent_name: 'Lead Agent',       action: 'escalated',           input_summary: 'Lead lead-5 ambiguous text',                         output_summary: 'Confidence 38% < 50% threshold',                            lead_id: 'lead-5',  duration_ms: 310,  status: 'warning', created_at: hoursAgo(6) },
    { agent_name: 'Lead Agent',       action: 'escalated',           input_summary: 'Lead lead-4 budget 2.5Cr',                           output_summary: 'VIP threshold exceeded; routed to Priya',                   lead_id: 'lead-4',  duration_ms: 420,  status: 'warning', created_at: daysAgo(4) },
    { agent_name: 'Conversion Agent', action: 'extracted_objections',input_summary: 'Visit visit-25 notes (217 chars)',                   output_summary: 'objections=[decision-maker, possession] sentiment=positive', lead_id: 'lead-25', duration_ms: 1390, status: 'ok',      created_at: daysAgo(5) },
    { agent_name: 'Nurture Agent',    action: 'drafted_message',     input_summary: 'Lead lead-1 LEAD_SCORED event',                      output_summary: 'site_visit_invite drafted EN, 312 chars',                   lead_id: 'lead-1',  duration_ms: 1120, status: 'ok',      created_at: daysAgo(7) },
    { agent_name: 'Lead Agent',       action: 'scored_lead',         input_summary: 'Lead lead-1 intake reply',                           output_summary: 'fit=92 urgency=95 action=Schedule site visit',              lead_id: 'lead-1',  duration_ms: 1840, status: 'ok',      created_at: daysAgo(7) },
    { agent_name: 'Conversion Agent', action: 'booking_recorded',    input_summary: 'Lead lead-28 unit E-1204',                           output_summary: 'Attribution chain: Meta Ad > Score 94 > Visit > Booking',   lead_id: 'lead-28', duration_ms: 680,  status: 'ok',      created_at: daysAgo(13) },
    { agent_name: 'Ad Agent',         action: 'simulated_campaign',  input_summary: 'Property prop-2 launched on Meta',                   output_summary: 'impressions=510000 leads=286 cpl=1329',                     lead_id: null,      duration_ms: 520,  status: 'ok',      created_at: daysAgo(21) },
  ],
  agent_events: [
    { event_name: 'LEAD_RECEIVED',        count: 30 },
    { event_name: 'LEAD_SCORED',          count: 19 },
    { event_name: 'MESSAGE_SENT',         count: 6  },
    { event_name: 'VISIT_SCHEDULED',      count: 8  },
    { event_name: 'VISIT_COMPLETED',      count: 5  },
    { event_name: 'BOOKING_MADE',         count: 2  },
    { event_name: 'ESCALATION_TRIGGERED', count: 3  },
    { event_name: 'LISTING_SYNCED',       count: 15 },
  ],
  source_roi: [
    { source: 'CP Referral',  leads: 4,  qualified: 4, visits_completed: 1, bookings: 1, total_spend_inr: 0,       cost_per_lead: null,    cost_per_visit: null,    cost_per_booking: 0       },
    { source: 'Meta Ad',      leads: 11, qualified: 9, visits_completed: 2, bookings: 1, total_spend_inr: 1330000, cost_per_lead: 120909,  cost_per_visit: 665000,  cost_per_booking: 1330000 },
    { source: 'Google Ad',    leads: 5,  qualified: 4, visits_completed: 1, bookings: 0, total_spend_inr: 700000,  cost_per_lead: 140000,  cost_per_visit: 700000,  cost_per_booking: null    },
    { source: 'Housing.com',  leads: 2,  qualified: 1, visits_completed: 0, bookings: 0, total_spend_inr: 0,       cost_per_lead: null,    cost_per_visit: null,    cost_per_booking: null    },
    { source: '99acres',      leads: 2,  qualified: 1, visits_completed: 0, bookings: 0, total_spend_inr: 120000,  cost_per_lead: 60000,   cost_per_visit: null,    cost_per_booking: null    },
    { source: 'Walk-in',      leads: 2,  qualified: 2, visits_completed: 1, bookings: 0, total_spend_inr: 0,       cost_per_lead: null,    cost_per_visit: null,    cost_per_booking: null    },
    { source: 'WhatsApp',     leads: 2,  qualified: 1, visits_completed: 0, bookings: 0, total_spend_inr: 0,       cost_per_lead: null,    cost_per_visit: null,    cost_per_booking: null    },
    { source: 'Portal',       leads: 2,  qualified: 2, visits_completed: 0, bookings: 0, total_spend_inr: 50000,   cost_per_lead: 25000,   cost_per_visit: null,    cost_per_booking: null    },
  ],
}

// helpers
function daysAgo(n: number)    { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString() }
function hoursAgo(n: number)   { const d = new Date(); d.setHours(d.getHours() - n); return d.toISOString() }
function minutesAgo(n: number) { const d = new Date(); d.setMinutes(d.getMinutes() - n); return d.toISOString() }
function daysAgoDate(n: number)     { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function daysFromNowDate(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
```

---

## When you are ready to wire Supabase later

Only `lib/data.ts` changes. Replace each function body with a Supabase query. Example:

```ts
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function getLeadQueue() {
  const { data } = await supabase.from('v_lead_queue').select('*').order('overall_score', { ascending: false })
  return data ?? []
}
// ...same shape, real data
```

Zero UI changes. That's the whole point of the data-layer indirection.
