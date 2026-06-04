# Test Cases — Pentahouse v1 (Capstone)

**Author:** PM (Abhishek Ranjan)
**Purpose:** Verification battery for the 5-agent system. Doubles as the demo rehearsal checklist. Each case is independently runnable and grounded in a real persona's job-to-be-done.

**Personas in play:**
- **Priya** — Sales Manager. Approves every outbound message. Lives in `/approvals` and `/` (Today).
- **Anjali** — Marketing Lead. Owns inventory + ad spend. Lives in `/properties` and `/analytics`.
- **Rohit** — Inside Sales Executive. Works the queue. Lives in `/leads` and `/visits`.
- **Rahul** — Buyer (external). The system never serves him directly; his experience is the WhatsApp arriving on his phone and the speed of reply.

**Priority key:**
- **P0** = demo-blocker, hero-flow path
- **P1** = important journey path, must work for credibility
- **P2** = edge case, robustness signal

**Format:** Given / When / Then. A test case passes when all Then clauses are observably true.

---

## Cluster A — Lead intake and scoring

### TC-LEAD-001 · Hot inbound lead from Meta Ad gets scored in under 3 seconds (P0)

**Persona:** Rohit (sees the result in his queue)
**Stage:** Inquiry → Qualification
**Preconditions:** Lead Agent published in n8n. ngrok up. Property "Whitefield Verdant" exists with matched fields.

**Steps:**
1. POST to `/webhook/new-lead` with: name "Test Hot Lead", phone "+91...", source "Meta Ad", inquiry_text "3BHK Whitefield 1.7Cr immediate possession pre-approved HDFC", language "en"

**Expected:**
- **Given** the workflow is published, **when** the webhook fires, **then** within 3 seconds:
  - `leads` row created with stage = "New"
  - `lead_scores` row created with `overall_score` >= 75 and `recommended_action` = "Schedule site visit"
  - `agent_events` row created with event_name "LEAD_SCORED"
  - `agent_logs` row written
  - Dashboard `/leads` shows the new card at the top, marked 🔥 hot
- Pass: all 5 conditions true within 5s

### TC-LEAD-002 · VIP escalation triggers when budget > 2 Cr (P0)

**Persona:** Priya
**Stage:** Inquiry → Escalation
**Preconditions:** Lead Agent published.

**Steps:**
1. POST to `/webhook/new-lead` with inquiry_text "Looking for 4BHK Lower Parel 2.5 Cr range. Multi-unit interest."

**Expected:**
- **Given** budget > 200 lakhs, **when** scored, **then**:
  - `escalations` row created with `reason_code` = "vip_budget"
  - `agent_events` row with event_name "ESCALATION_TRIGGERED"
  - Dashboard `/` Hot escalations card shows the new entry within 5s
  - The escalation row has an "Open lead" action chip that deep-links correctly
- Pass: Priya sees the alert without needing to refresh

### TC-LEAD-003 · Low-confidence input still produces a usable lead (P0)

**Persona:** Rohit
**Stage:** Inquiry → Disambiguation
**Preconditions:** Lead Agent published.

**Steps:**
1. POST a vague payload: inquiry_text "hi pls share details"

**Expected:**
- **Given** confidence is < 50, **when** scored, **then**:
  - `lead_scores.recommended_action` = "Escalate to manager"
  - Escalation row created with `reason_code` = "low_confidence"
  - Dashboard activity feed: "[Unknown Caller] needs your direct call." with rose left border
- Pass: graceful degradation, no exception

### TC-LEAD-004 · Hindi-language buyer gets Devanagari rendering end-to-end (P1)

**Persona:** Rohit (queue), Priya (approval)
**Stage:** Inquiry → First reply
**Preconditions:** Nurture Agent published with the prompt enforcing language mirroring.

**Steps:**
1. POST new-lead with language "hi" and inquiry_text "मुझे Kharadi में 2BHK चाहिए, बजट 70 लाख तक।"
2. Trigger Nurture Agent: POST `/webhook/draft-message` with that lead_id

**Expected:**
- **When** the draft renders in `/approvals`, **then**:
  - `messages.content` is in Hindi (Devanagari)
  - The WhatsApp preview bubble uses Noto Serif Devanagari font
  - The lead's language pill reads "HI"
- Pass: text is legible, font is serif Devanagari (not system fallback)

### TC-LEAD-005 · Multiple intent fields refine the score on subsequent replies (P1)

**Persona:** Rohit (sees the score evolve)
**Stage:** Qualification
**Preconditions:** Lead exists.

**Steps:**
1. Lead initially submits "Looking for 3BHK in Whitefield"
2. Buyer replies later "budget 1.7 Cr, pre-approved, want immediate"
3. Lead Agent re-fires

**Expected:**
- **Given** the lead's `intent_fields_count` rises from 1 to 4, **when** rescored, **then**:
  - The new `lead_scores` row has higher `overall_score` than the first
  - Activity feed: "[Lead Name] updated their preferences."
  - The lead's qualified_at timestamp is set
- Pass: score trends upward as more intent is captured

---

## Cluster B — Approval flow (the trust layer)

### TC-APPR-001 · Approve sends a real WhatsApp within 5 seconds (P0 — hero moment)

**Persona:** Priya
**Stage:** First reply
**Preconditions:** Nurture Agent published with Twilio credential bound. Presenter's phone opted into Twilio sandbox. A pending_approval message exists for that phone.

**Steps:**
1. Open `/approvals`, focus the pending message
2. Press `A` key

**Expected:**
- **Given** the message is in `pending_approval`, **when** A is pressed, **then**:
  - Optimistic UI removes the card within 200ms
  - `messages.status` flips to "sent" in Supabase within 2s
  - `agent_events` "MESSAGE_SENT" row written
  - WhatsApp arrives on the opted-in phone within 5s of the keypress
  - Toast: "Sent to [Name] on WhatsApp"
- Pass: phone buzzes audibly, WhatsApp content matches what was previewed

### TC-APPR-002 · Reject with reason persists and surfaces in logs (P0)

**Persona:** Priya
**Stage:** Quality control
**Preconditions:** Pending message exists.

**Steps:**
1. Focus a draft, press `R`
2. Select reason "Tone too pushy", add notes "Lead seems hesitant"
3. Click Reject

**Expected:**
- **Given** the reject form is submitted, **when** persisted, **then**:
  - `messages.status` = "rejected"
  - `messages.rejection_reason` = "Tone too pushy: Lead seems hesitant"
  - `agent_logs` row with action "message_rejected" and the reason in output_summary
  - Toast confirms the rejection
  - The next pending item auto-focuses
- Pass: all 4 conditions visible in Supabase and on screen

### TC-APPR-003 · Edit-and-approve preserves the manager's edits in the sent WhatsApp (P0)

**Persona:** Priya
**Stage:** Manager judgment call
**Preconditions:** Pending message exists.

**Steps:**
1. Focus a draft, press `E`
2. Modify the content (e.g., add "ji" to the greeting)
3. Click "Save and approve"

**Expected:**
- **Given** the edited content is submitted, **when** the n8n approve webhook processes it, **then**:
  - The WhatsApp delivered to the buyer contains the manager's edited text, NOT the original AI draft
  - `messages.content` updated to the edited version
  - `messages.approved_by` set
- Pass: text on buyer's phone exactly matches the edited version

### TC-APPR-004 · Keyboard shortcut J/K navigates queue (P1)

**Persona:** Priya
**Stage:** High-throughput approvals
**Preconditions:** 3+ pending messages.

**Steps:**
1. Open `/approvals`
2. Press `J` twice, then `K` once

**Expected:**
- Focus moves to the 3rd pending item, then back to the 2nd
- The right pane updates to reflect the focused item
- Pass: navigation is keyboard-only, no mouse needed

### TC-APPR-005 · Approve with n8n unreachable falls back to direct Supabase update (P1)

**Persona:** Priya
**Stage:** Resilience
**Preconditions:** Pending message exists, n8n stopped or VITE_N8N_APPROVAL_ENDPOINT unset.

**Steps:**
1. Stop n8n
2. Press A on a pending draft

**Expected:**
- Browser console logs: "[data.approveMessage] n8n failed, falling back to Supabase update"
- `messages.status` flips to "sent" via direct Supabase update
- UI removes the card optimistically
- (Twilio does not fire; this is acceptable for the fallback)
- Pass: dashboard never locks up; manager workflow continues

---

## Cluster C — Visit lifecycle and objection extraction

### TC-VISIT-001 · Marking a visit Completed triggers objection extraction in 8s (P0)

**Persona:** Rohit (types notes), Anjali (sees the closed-loop outcome)
**Stage:** Visit → Closed loop
**Preconditions:** Conversion Agent published. A visit with status "Scheduled" exists.

**Steps:**
1. Navigate to `/visits`, find an awaiting-outcome card
2. Click → side sheet opens
3. Select "They came and we walked the unit", paste notes: "Liked the layout but worried about Dec 2027 possession. Comparing with Lodha Park. Asked about HDFC vs SBI loan rates."
4. Click "Save outcome"

**Expected:**
- Within 8s:
  - `visits.objections` = array containing "possession", "competitor", "financing"
  - `visits.sentiment` = "neutral" or "positive"
  - `visits.next_action` populated with Gemini's suggested next step
  - Activity feed shows: "[Buyer name] raised concerns: possession, competitor, and financing. Mood after the visit: neutral."
- Pass: objections array length >= 2, all categories from the closed vocabulary

### TC-VISIT-002 · No-show outcome triggers a soft-recovery suggestion (P1)

**Persona:** Rohit
**Stage:** Visit failure recovery
**Preconditions:** Visit exists in "Scheduled" status.

**Steps:**
1. Mark visit "They did not show up", no notes

**Expected:**
- `visits.status` = "No-Show"
- `agent_events` "VISIT_NO_SHOW" row created
- Activity feed: "[Buyer name] did not show up. Worth a soft follow-up message."
- Pass: language is encouraging, not punitive

### TC-VISIT-003 · Date formatting uses human-readable language across the screen (P1)

**Persona:** Rohit (scans the queue)
**Stage:** Daily ops
**Preconditions:** Visits exist for today, tomorrow, day-after, and last week.

**Steps:**
1. Open `/visits`

**Expected:**
- "Today" appears for today's visits
- "Tomorrow" for tomorrow
- "Saturday" for day-after if it's Saturday
- "Yesterday" for yesterday's recent visits
- No ISO date strings (`2026-05-31`) visible anywhere in the upcoming or awaiting sections
- Pass: every date label is plain English

### TC-VISIT-004 · Booking outcome creates booking row + attribution chain (P0)

**Persona:** Anjali (sees ROI), Rohit (records booking)
**Stage:** Conversion close
**Preconditions:** Visit exists, Lead has campaign_id from a Meta campaign.

**Steps:**
1. POST `/webhook/visit-outcome` with status "Completed", booking_amount 17500000, unit_number "B-805"

**Expected:**
- `bookings` row created with `source_attribution` containing "Meta Ad > Score X > Visit > Booking"
- `attribution_chain` JSONB has source, campaign_id, fit_score, urgency_score, visit_id
- Activity feed: "🎉 [Buyer] just booked." (emerald left border)
- `/analytics` Source ROI updates within 30s — Meta Ad row's bookings count increments by 1
- Pass: full chain traceable from booking back to the Meta campaign

---

## Cluster D — Inventory and ad operations

### TC-INV-001 · Paste-and-extract produces a complete property card in 5s (P0)

**Persona:** Anjali
**Stage:** Catalogue intake
**Preconditions:** Listing Agent published.

**Steps:**
1. `/properties` → "Add a project" → click "Use a sample to try" → "Add to catalogue"

**Expected:**
- Within 5s:
  - New property card appears in the grid
  - Toast: "Added [project name] to the catalogue"
  - Activity feed: "Added [project] to the catalogue"
  - All extracted fields populated correctly: project_name, developer, city, locality, config, price_min/max_lakhs, RERA, possession
- Pass: 0 fields missing that were present in the input paragraph

### TC-INV-002 · Missing RERA shows warning badge but property still saves (P0)

**Persona:** Anjali
**Stage:** Catalogue intake (uncertain data)
**Preconditions:** Listing Agent published.

**Steps:**
1. Paste: "Test Tower by Brigade Group in Bangalore. 2BHK and 3BHK, 800-1300 sqft, 90 to 150 lakhs, possession 2027."

**Expected:**
- Property saves with `rera_number` = null
- Card shows amber "RERA missing — verify before going live" badge
- `agent_logs.status` = "warning" with that message in output_summary
- Pass: workflow doesn't reject the property; downstream attribution still works

### TC-INV-003 · Draft 3 campaigns generates platform-distinct copy (P0 — hero moment 2)

**Persona:** Anjali
**Stage:** Ad ops
**Preconditions:** Property exists. Ad Agent published.

**Steps:**
1. Open any property detail page
2. Click "Draft 3 campaigns"

**Expected:**
- Within 12s:
  - 3 platform cards populate (Meta, Google, Portal)
  - Meta card shows Instagram-style preview with the developer name, image, ad copy, "Learn more →"
  - Google card shows search-result preview with URL, blue headline, grey description
  - Portal card shows 99acres-style listing with image, headline, price band, "Contact builder"
  - Each platform has DIFFERENT copy (not the same text repeated)
  - Each shows realistic CPL (₹400-1800 range), budget (₹50K-3L), impressions, clicks, leads
- Pass: copy is platform-appropriate (Meta short and emotional, Google intent-matched, Portal spec-heavy)

### TC-INV-004 · Empty property catalogue shows useful guidance, not a dead screen (P2)

**Persona:** Anjali (first-time user)
**Stage:** Onboarding
**Preconditions:** Fresh project, no properties seeded.

**Steps:**
1. Open `/properties` on an empty database

**Expected:**
- Centered Building2 icon with "No projects yet" heading
- Subtitle: "Click 'Add a project' and paste anything — a paragraph, a CSV row, a brochure excerpt."
- The "Add a project" button is visible and primary-styled
- Pass: a new user can self-onboard without docs

### TC-INV-005 · Source ROI updates within 30s of a new campaign generation (P1)

**Persona:** Anjali
**Stage:** ROI verification
**Preconditions:** Ad Agent just inserted 3 new campaigns.

**Steps:**
1. Navigate to `/analytics` ("Where wins come from")
2. Wait up to 30s (auto-refetch interval)

**Expected:**
- The total_spend_30d KPI increases by the sum of the 3 new budgets
- The relevant source rows (Meta Ad, Google Ad, Portal) update their lead counts and CPLs
- Pass: no manual refresh needed

---

## Cluster E — Cross-cutting and edge cases

### TC-X-001 · Cmd+K palette finds any lead, property, or stage in under 3 keystrokes (P1)

**Persona:** Priya, Rohit
**Stage:** Daily ops navigation
**Preconditions:** Seed data loaded.

**Steps:**
1. Press Cmd+K from any screen
2. Type "Whit"

**Expected:**
- Properties matching "Whitefield Verdant" appear at the top
- Leads matching Whitefield in their inquiry text appear in a "Leads" section
- Enter navigates to the first result
- Pass: under 3 keystrokes to find anything

### TC-X-002 · Gemini overload returns graceful fallback, not a crash (P0)

**Persona:** Rohit
**Stage:** Resilience
**Preconditions:** Lead Agent published. Gemini API returns 429 or transient error.

**Steps:**
1. Trigger a flood of Lead Agent calls in rapid succession until Gemini rate-limits

**Expected:**
- The workflow's fallback Code node returns `recommended_action` = "Escalate to manager", confidence = 0
- The lead is still created in Supabase
- `agent_logs.status` = "warning"
- Activity feed: "[Lead Name] needs your direct call." (escalation)
- Pass: no broken UI state, no missing lead

### TC-X-003 · Dark mode preserves contrast and brand integrity across every screen (P1)

**Persona:** Any
**Stage:** Accessibility, brand
**Preconditions:** App running.

**Steps:**
1. Toggle dark mode from Topbar
2. Walk through every route

**Expected:**
- Warm-charcoal background (no pure black) with cream foreground
- Terracotta primary color stays readable (brighter variant in dark)
- Activity feed left-border colors (rose / amber / emerald) remain distinguishable
- WhatsApp bubble emerald earns its meaning in both themes
- Pass: every text passes WCAG AA contrast (4.5:1)

### TC-X-004 · Drag-and-drop pipeline change persists across refresh (P1)

**Persona:** Rohit
**Stage:** Pipeline management
**Preconditions:** Leads visible in kanban view.

**Steps:**
1. Drag a "New" lead into "Qualified"
2. Refresh the browser

**Expected:**
- Lead remains in "Qualified" column after refresh
- Optimistic UI shows the drop immediately
- (Note: persistence currently via Zustand store, not Supabase — flag if v2 should persist server-side)
- Pass: state survives refresh within the current session

### TC-X-005 · Realtime: new pending message appears in approvals queue without refresh (P0)

**Persona:** Priya
**Stage:** Live demo
**Preconditions:** `/approvals` open, polling every 5s.

**Steps:**
1. From Supabase SQL Editor, INSERT a new pending_approval row directly
2. Watch `/approvals` queue

**Expected:**
- Within 5s, the new card appears at the top of the queue (TanStack Query auto-refetch)
- Toast: "New draft from Nurture Agent" (if Supabase Realtime channel wired up — currently relies on polling)
- Pass: no manual refresh required

### TC-X-006 · Lead detail page deep-links from anywhere, with full context (P1)

**Persona:** Any
**Stage:** Navigation
**Preconditions:** Lead exists with full journey (visits, messages, scores).

**Steps:**
1. From activity feed "Open lead" chip, click on a lead

**Expected:**
- Lands on `/leads/$id` with:
  - Score panel populated (Match, Heat, Priority, Confidence)
  - Why they match + Why act now reasons populated
  - Intent grid populated
  - Conversation thread visible with all messages
  - Visits panel with status badges and objection chips
  - Agent activity collapsible with filtered events
- Pass: nothing requires a second click to understand the lead's history

---

## Demo-day rehearsal checklist (the hero flow only)

For the June 1 demo, the audience sees only the 9 P0 cases in this sequence:

1. **TC-INV-001** — Anjali pastes a project paragraph, watches it become a card
2. **TC-INV-003** — She clicks "Draft 3 campaigns", three platform mockups appear with copy + simulated CPL
3. **TC-LEAD-001** — A hot lead arrives (curl), gets scored 90+ in 3s
4. **TC-LEAD-002** — A 2.5Cr lead triggers the VIP escalation card
5. **TC-X-005** — A new draft appears in the approvals queue without refresh
6. **TC-APPR-001** — Priya presses A, the buyer's phone buzzes with the WhatsApp
7. **TC-VISIT-001** — Rohit marks a visit Completed with notes, objections extract in 8s
8. **TC-VISIT-004** — Booking recorded, attribution chain visible
9. **TC-X-003** — Quick dark-mode toggle to show brand integrity

Total runtime if every test passes cleanly: ~6 minutes. The DEMO_RUNBOOK.md choreography expects this same sequence.

## How to use this document

- **Before any push to main:** run all P0 cases. Block release if any fail.
- **Before demo rehearsal:** walk the hero flow above 3 times. Time each pass. Aim for sub-7-minute total.
- **For QA review:** assign sections by cluster (PM walks A, devs walk B, etc.). Each case is independently runnable.
- **For v2 backlog:** any P1/P2 case that surfaces gaps (e.g., TC-X-004 server-side persistence) goes straight into V2_ROADMAP.md.
