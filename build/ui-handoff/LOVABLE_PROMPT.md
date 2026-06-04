# Lovable / Replit Agent — Build Prompt (SUPABASE-WIRED)

> **Phase:** Day 5-6 of the build plan. Use this AFTER you've picked a winner between Lovable and Replit using the frontend-only build (`FRONTEND_ONLY_PROMPT.md`). This version wires the chosen tool to the live Supabase project.
>
> **If you are still in the UI A/B comparison phase, do not use this file.** Use `FRONTEND_ONLY_PROMPT.md` instead.

Copy everything below this line into Lovable's "New project" prompt box, or into Replit Agent's initial brief. Both will produce the same Next.js + Supabase dashboard. Connect Supabase using the URL + anon key when prompted.

---

## What we are building

A web dashboard for inside sales managers at Indian residential real-estate developers. It is the human surface for a five-agent AI system (Listing, Ad, Lead, Nurture, Conversion) that lives in n8n + Supabase. The dashboard's job is to make the AI's decisions visible, approvable, and observable.

**Primary user:** Sales Manager Priya at a mid-size developer running 2 to 4 active projects with 5 to 20 inside sales executives. She approves all outbound buyer messages and reviews pipeline health.

**The hero surface** is the Manager Approval screen. Every other screen serves it.

## Tech constraints

- **Framework:** Next.js 14 (App Router), TypeScript, server components where data is read-only.
- **Styling:** Tailwind CSS. Use shadcn/ui for primitives (Button, Card, Dialog, Badge, Input, Tabs, Sheet, Toast, Command).
- **Data:** Supabase (PostgreSQL). Use `@supabase/supabase-js` with the anon key on the client and the service role on server actions only. Read from views (`v_lead_queue`, `v_source_roi`, `v_primary_metric`) wherever possible.
- **Realtime:** Subscribe to `messages` (for pending_approval inserts), `agent_logs` (for the activity feed), and `escalations` (for the alert badge) using Supabase Realtime channels.
- **State:** React Server Components for first paint, then client components with Supabase Realtime for live updates. No Redux. Use Zustand only if you need cross-screen ephemeral state (e.g., currently focused queue item).
- **Charts:** Recharts.
- **Hindi rendering:** Use the system stack with a Devanagari fallback (`font-family: Inter, "Noto Sans Devanagari", system-ui`). Some messages and inquiry text will be in Hindi.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
N8N_APPROVAL_ENDPOINT             # POST here when manager approves a message
N8N_APPROVAL_CALLBACK_TOKEN       # send as X-Approval-Token header
NEXT_PUBLIC_DEMO_MODE             # if "true", serve /public/demo-fallback.json instead of Supabase
```

## Database — read this before generating

The Supabase project already has these tables (schema fully in `build/supabase/schema.sql`):

- `properties` — 15 active projects across Delhi NCR, Mumbai, Pune, Bangalore
- `leads` — buyer records with intent fields (purpose, budget_lakhs, preferred_config, etc.)
- `lead_scores` — fit/urgency/overall (0-100), confidence, reasons arrays, recommended_action, matched_property_id, raw_response JSONB
- `messages` — WhatsApp queue, key statuses: `pending_approval`, `sent`, `rejected`; direction = inbound/outbound
- `visits` — scheduled/completed visits, objections array (price/location/configuration/decision-maker/competitor/possession/financing/other), post_visit_notes
- `bookings` — closed deals with source_attribution string + attribution_chain JSONB
- `campaigns` — simulated Meta/Google/Portal campaigns with budget, impressions, clicks, cpl_inr
- `agent_logs` — observability stream (agent_name, action, input_summary, output_summary, duration_ms, status)
- `agent_events` — event bus (LEAD_SCORED, MESSAGE_SENT, VISIT_COMPLETED, BOOKING_MADE, ESCALATION_TRIGGERED, etc.)
- `escalations` — open alerts requiring manager attention
- `eval_ground_truth` — 15-lead validation set for the model accuracy widget

**Convenience views to prefer:**
- `v_lead_queue` — lead + latest score joined, ordered by overall_score desc
- `v_source_roi` — per-source leads/qualified/visits/bookings + CPL/CPV/CPB
- `v_primary_metric` — time-to-first-response and time-to-qualification in seconds

## Six screens

### 1. `/` Command Center

**Purpose:** First thing Priya sees in the morning. Pipeline pulse + agent activity + alerts.

**Top row (4 KPI cards):**
- Time to first qualifying response — median seconds today vs industry baseline 4-6h. Pull from `v_primary_metric`. Big number, green if under 60s.
- Leads today vs yesterday — count + delta arrow.
- Pending approvals — count from `messages where status = 'pending_approval'`. Click to deep link to `/approvals`.
- Conversion this week — bookings / qualified leads %.

**Middle, two columns:**
- **Left (60%):** Agent Activity Feed. Live tail of `agent_logs` ordered desc, last 50 rows. Each row: agent_name badge (color per agent), action, output_summary, duration_ms, relative timestamp. Status = error → red left border. Realtime subscription so new rows fade in.
- **Right (40%):** Escalations card. List all `escalations where status in ('open','acknowledged')`. Each card: lead name, reason_code badge (vip_budget = gold, low_confidence = amber, human_request = red), reason_text, "Open lead" link to `/leads/[id]`, "Acknowledge" button (writes acknowledged_at + status).

**Bottom row:**
- Event funnel: bar chart of last-7-days events counts grouped by event_name from `agent_events`. Helps Priya see system throughput.

### 2. `/leads` Lead Pipeline

**Purpose:** Where Rohit (executive) lives. Ranked queue.

**Header controls:** search by name/phone, filter by stage, filter by source, filter by city.

**View toggle:** Kanban (default) | Table.

**Kanban columns:** New, Qualified, Visit Scheduled, Visited, Negotiation, Booked, Lost. Each card shows: name, phone (last 4 masked), source badge, fit/urgency mini-bars, recommended_action, time-since-created. Drag-and-drop changes `leads.stage` and writes an `agent_logs` row with agent_name='System'.

**Table view columns:** Name, Source, City, Config, Budget, Fit, Urgency, Recommended Action, Stage, Created. Sortable. Click row → `/leads/[id]`.

**Empty state:** illustration + "No leads in this view. Try clearing filters."

### 3. `/leads/[id]` Lead Detail

**Purpose:** Single-buyer deep dive.

**Top:** name, phone (click to copy), email, source pill, language pill (EN/HI), stage selector (writes back on change).

**Score panel:** big numbers for fit / urgency / overall / confidence. Radar chart of the four. Below: two bulleted lists — "Why fit" (`fit_reasons`) and "Why urgent" (`urgency_reasons`). Recommended action as a prominent CTA button. Show matched project as a small card with image, project_name, locality, price band.

**Intent panel:** key-value grid of `purpose, budget_lakhs, preferred_config, preferred_city, preferred_locality, purchase_timeline, loan_status, family_size, decision_makers`. Empty fields shown as "Not captured yet" in grey italic.

**Conversation panel:** WhatsApp-style thread of `messages where lead_id = $id` sorted ascending. Outbound right-aligned green, inbound left-aligned grey. Pending approval messages get a yellow border and an inline "Approve / Edit / Reject" trio. Hindi messages render with the Devanagari font.

**Activity panel:** rolling `agent_logs` filtered by this lead_id. Collapse by default.

**Visits panel:** all `visits` for this lead, status badge, objections chips, post-visit notes excerpt, "View" link.

### 4. `/approvals` Manager Approval (THE HERO SCREEN)

**Purpose:** Approve, edit, or reject every AI-drafted message before it goes to a buyer. Single-key shortcuts make this fast.

**Layout:** Two-pane.

- **Left pane (40%):** Queue list. Pull from `messages where status = 'pending_approval'` ordered by created_at desc, joined to `v_lead_queue` for lead name and overall_score. Each row: lead name, project, score chip, "5m ago", language badge. Realtime: new pending messages appear at top with a soft toast "1 new draft from Nurture Agent".

- **Right pane (60%):** Focused approval card.
  - Lead context strip at top: name, phone, source, stage, score, top reason.
  - WhatsApp preview bubble of `messages.content` styled like a phone (rounded green bubble, time stamp, double-tick).
  - Below the bubble: three buttons. "Approve (A)" green primary, "Edit (E)" outline, "Reject (R)" red outline.
  - Edit mode replaces the bubble with a textarea seeded with the content; on save, update content + status stays pending_approval and re-render preview. Re-press A to send the edit.
  - Reject opens a small inline form: dropdown of reasons (Tone too pushy / Hallucinated detail / Off-template / Wrong language / Other) + optional notes. On submit, status → rejected, write rejection_reason, log to agent_logs.

**Single-key shortcuts (Q2 default):**
- `A` → approve the focused message
- `E` → enter edit mode
- `R` → open reject form
- `J` / `K` (or `↓`/`↑`) → move focus to next/prev queue item
- `Esc` → exit edit/reject mode

**Approve action (server):** POST to `N8N_APPROVAL_ENDPOINT` with `{message_id, action: 'approve'}` and header `X-Approval-Token: $N8N_APPROVAL_CALLBACK_TOKEN`. n8n actually sends via Twilio and updates `messages.status` and `sent_at`. Optimistic UI: remove from queue immediately.

**Empty state:** "Inbox zero. All drafts handled."

### 5. `/visits` Site Visit Tracker

**Purpose:** Daily ops view for the Conversion Agent.

**Top:** date picker defaulting to today + next 7 days.

**Three sections:**
1. **Upcoming visits** — table of `visits where scheduled_date >= today` ordered asc. Columns: lead name, project, slot, attendees, status (Scheduled/Confirmed), reminders sent (24h ✓/2h ✓ indicators).
2. **Awaiting outcome** — `visits where status in ('Confirmed','Scheduled') and scheduled_date < today`. Row click opens a side sheet with a form: Mark as Completed / No-Show / Rescheduled / Cancelled, free-text notes textarea. On Completed submit: write status, completed_at, post_visit_notes; trigger Conversion Agent webhook to extract objections; show toast "Objections extracted: [price, possession]".
3. **Recent visits** — last 30 days. Read-only. Objections shown as chips.

### 6. `/analytics` Source ROI

**Purpose:** Anjali (marketing). Where ad spend converts.

**Top metrics strip:** total spend last 30d, leads, qualified, visits, bookings, blended CPB.

**Main table:** read `v_source_roi`. Columns: Source, Leads, Qualified, Visits Completed, Bookings, Spend (INR), CPL, CPV, CPB. Sort by CPB asc by default. Each source row expandable to show per-campaign breakdown from `campaigns` joined by source.

**Side chart:** stacked bar of bookings per source for the last 12 weeks.

**Eval widget (Section 8):** small card titled "Model accuracy" showing % of `lead_scores` whose `recommended_action` matches `eval_ground_truth.expected_action` for the eval set (lead IDs ending in 01-15). Color: green ≥80%, amber 60-79%, red <60%.

## Cross-cutting design

**Color system (Tailwind tokens):**
- Primary: `emerald-600` (WhatsApp green, ties to the hero surface)
- Accent: `indigo-600`
- Warning: `amber-500`
- Danger: `rose-600`
- Backgrounds: `zinc-50` light, `zinc-900` dark (support both)

**Agent badges (color per agent):**
- Listing → slate, Ad → violet, Lead → emerald, Nurture → blue, Conversion → orange, System → zinc

**Typography:** Inter for Latin, Noto Sans Devanagari fallback. Numerals tabular for tables.

**Layout shell:** Persistent left sidebar (Command Center, Pipeline, Approvals, Visits, Analytics). Top bar with global search (Cmd+K opens command palette over leads, properties, projects), notifications bell wired to `escalations`, user avatar.

**Empty states:** every list must have one. Light illustration + helpful sentence.

**Loading:** Suspense boundaries with skeletons matching each card shape. No spinning wheels in the middle of the page.

**Toasts:** shadcn `toaster`. Use for approvals, rejections, errors. Auto-dismiss 4s.

**Demo mode:** if `NEXT_PUBLIC_DEMO_MODE === 'true'`, swap the Supabase client for a thin adapter that reads `/public/demo-fallback.json` (shape matches the views). This is for live-demo network failover.

## What NOT to do

- Do not invent new tables or columns. If a screen needs data, derive it from the existing schema or skip it.
- Do not put auth in front of any screen. Single-user demo posture. Add an env-gated "manager" name input that writes into `approved_by`.
- Do not write the n8n workflows. The dashboard only triggers them via the approval endpoint.
- Do not render PII unmasked: phone numbers show first 3 + last 3, middle masked, except in the lead detail copy-to-clipboard button.
- Do not add a chatbot widget. The trust posture of this product is "no AI talks to buyers without manager approval."

## Acceptance test (do this before saying done)

1. `/approvals` shows at least the seed pending messages (3 of them, including one in Hindi).
2. Pressing `A` on a focused approval card removes it from the queue within 200ms (optimistic) and updates Supabase within 2s.
3. `/leads/[id]` for lead `33333333-3333-3333-3333-333333333328` (Deepak Choudhary, Booked) shows the full WhatsApp thread, the booking, and the completed visit with objections.
4. `/analytics` Source ROI shows CP Referral with the lowest CPB (because seed has 1 booking from CPR with 0 spend).
5. `/` Command Center shows at least 9 events in the activity feed within 5s of load.
6. Cmd+K opens a palette and "Whitefield" jumps to the matching property/leads.

If any acceptance check fails, fix before handing back.
