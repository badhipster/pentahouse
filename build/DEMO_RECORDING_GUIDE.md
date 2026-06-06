# Demo recording guide — 3 personas × 1–2 minutes each

This is the script + setup checklist for the submission video. Three short clips that stitch together into a 4–6 minute story.

---

## Pre-recording setup (15 minutes, one-time)

### A. Twilio sandbox — get WhatsApp on your phone

1. Open https://console.twilio.com → Messaging → **Try it out** → **Send a WhatsApp message**
2. You'll see the sandbox number (e.g. `+1 415 523 8886`) and a **join code** like `join blue-monkey`
3. On YOUR phone's WhatsApp, message that join code to that number
4. Twilio replies confirming you're whitelisted

### B. Confirm n8n Nurture Agent is sending to the right number

Open n8n at http://localhost:5678 → Nurture Agent → click the **Twilio Send** node:
- Make sure the `To` field reads `=whatsapp:+91XXXXXXXXXX` mapped from the lead's phone (it should already be set this way)
- The `From` field should be `whatsapp:+14155238886` (the sandbox number — check Twilio console)

### C. Have these tabs open before recording

| Tab | URL |
|---|---|
| Dashboard | http://localhost:8080 |
| Sales Ops Sheet | https://docs.google.com/spreadsheets/d/1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow |
| n8n | http://localhost:5678 (for showing executions if asked) |
| Terminal | for curl commands |

### D. Confirm 3 demo personas exist

Run in Supabase SQL Editor:

```sql
SELECT u.email, u.display_name, u.role,
       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id) AS assigned_leads
FROM public.users u
WHERE u.email LIKE 'arjha97+%@gmail.com'
ORDER BY CASE u.role
  WHEN 'sales_head' THEN 1 WHEN 'sales_rep' THEN 2 WHEN 'marketing' THEN 3 ELSE 4 END;
```

Expected:
| email | display_name | role | assigned_leads |
|---|---|---|---|
| arjha97+priya@gmail.com | Priya Rao | sales_head | 0 |
| arjha97+rohit@gmail.com | Rohit Joshi | sales_rep | **5** |
| arjha97+meera@gmail.com | Meera Patel | marketing | 0 |

If Rohit shows 0 assigned leads, run the assignment SQL from earlier (or `build/supabase/seeds/0003_assign_demo_leads_to_rep.sql`).

---

## Clip 1 — Sales Head (Priya), 90 seconds

**Sign in as** `arjha97+priya@gmail.com / Pentahouse2026`

### 0:00–0:15 — The command center
- Land on `/today`
- Narrate: "I'm Priya, the sales head. This is my floor at a glance. First-reply speed, today's hot leads, drafts waiting on my approval, bookings this week."
- Mouse over the role badge top-right (terracotta "Head"), then click the notification bell — show pending approvals.

### 0:15–0:45 — The pipeline
- Navigate to `/leads` (Kanban)
- Narrate: "Every inbound lead, every stage. Five Pune projects, ten buyers, scored automatically the moment they came in."
- Click into **Aarav Mehta** (hot, 89 score).

### 0:45–1:15 — The lead reveal
- Narrate: "Here's the read. Should I call this lead? The AI says yes — three reasons. Budget matches our Hinjewadi 3BHK tier. Pre-approved loan. Immediate timeline."
- Point at the 3-axis score breakdown: "Fit, Urgency, Visit Readiness — all explainable. No black box."
- Scroll to "What we know about them" intent grid.

### 1:15–1:30 — Live action proof
- Click **Schedule site visit** → modal opens → pick tomorrow 11 AM → Schedule
- Show the **"Open in Google Calendar"** link, click it → real event with Meet link
- Narrate: "Calendar invite goes to the buyer, .ics in their inbox, reminder drafts auto-queued."

**Cut.**

---

## Clip 2 — Sales Rep (Rohit), 75 seconds

**Sign out → sign in as** `arjha97+rohit@gmail.com / Pentahouse2026`

### 0:00–0:15 — A focused view
- Land on `/today`
- Narrate: "I'm Rohit, a sales rep. Same product, different view. I see my speed, my five active deals, drafts I need to approve, my bookings."
- Note the emerald "Rep" badge.

### 0:15–0:45 — My pipeline
- Navigate to `/leads`
- Narrate: "Only the five leads assigned to me. No floor noise. Stage-aware suggested actions for each."
- Hover over a hot card to show the green "Schedule site visit" CTA.

### 0:45–1:15 — Approving a message
- Click into Rohit Patel (Qualified, 70 score)
- Show the agent journey timeline near the bottom
- Navigate to `/approvals`
- Narrate: "When a buyer enquires, the AI drafts the reply. I read it, edit it, approve it. The buyer hears from me, not a bot."
- Click **Approve and send** on a focused draft.

**Cut.**

---

## Clip 3 — Marketing Lead (Meera), 75 seconds

**Sign out → sign in as** `arjha97+meera@gmail.com / Pentahouse2026`

### 0:00–0:15 — Different lens
- Land on `/today`
- Narrate: "I'm Meera, marketing. I don't see individual leads — that's not my job. I see what I spent, how it converted, and which channel wins."
- Note the amber "Marketing" badge.

### 0:15–0:45 — Source funnel
- Scroll to the **Source funnel** card on `/today`
- Narrate: "Per-channel breakdown. Leads, ready leads, visits, bookings. Cost per lead, per visit, per booking. Meta is converting at half the cost of Google here."

### 0:45–1:15 — Creative approvals
- Navigate to `/campaigns`
- Narrate: "When the AI drafts new ad creative, I approve it before anything spends money. Same principle as the sales head's message gate — applied to my surface."
- Click **Approve and go live** on a draft.

**Cut.**

---

## Stitch shot — End-to-end (45 seconds, optional)

Record this as a separate clip to show the live agent loop:

### Live curl — show on terminal:

```bash
curl -X POST 'http://localhost:5678/webhook/new-lead' \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Abhishek Ranjan",
    "phone":"+91XXXXXXXXXX",
    "email":"abhishek@buyer.in",
    "source":"Meta Ad",
    "inquiry_text":"Hi, interested in your projects",
    "preferred_city":"Pune"
  }'
```

Narrate: *"A buyer just landed on a Meta ad — only name, phone, city. No purpose, no budget, no timeline."*

### Show the gap-fill draft

- Refresh `/approvals`
- Show the draft: "Hi Abhishek, could you share if you're looking to buy/rent/invest, and your budget range?"
- Approve it.

### Show WhatsApp arrive on your phone

- Hold phone to camera — actual message lands.
- Narrate: *"That's a real WhatsApp on a real number. Three personas, one funnel, every message human-approved."*

---

## Sales Ops Sheet — auto-fill checklist

The sheet appends automatically when these workflows fire:

| Workflow | When it appends | Tab |
|---|---|---|
| Lead Agent | Every `/webhook/new-lead` call | **Leads** |
| Ad Agent | Every `/webhook/generate-ads` call | **Campaigns** (3 rows per run) |
| Conversion Agent (visit) | `/webhook/visit-outcome` with status=Completed | **Visits** |
| Conversion Agent (booking) | `/webhook/visit-outcome` with `booking_amount` > 0 | **Bookings** |

### To populate Visits and Bookings tabs during the demo:

After scheduling a visit, find its id:

```sql
SELECT id, lead_id, scheduled_at FROM visits ORDER BY created_at DESC LIMIT 1;
```

Fire the outcome curl:

```bash
# Visit completed, no booking yet
curl -X POST 'http://localhost:5678/webhook/visit-outcome' \
  -H 'Content-Type: application/json' \
  -d '{
    "visit_id":"PASTE_VISIT_ID",
    "status":"Completed",
    "transcript":"Buyer loved the 3BHK layout. Wants to confirm possession date with spouse. Positive sentiment.",
    "booking_amount": null
  }'

# Or with a booking
curl -X POST 'http://localhost:5678/webhook/visit-outcome' \
  -H 'Content-Type: application/json' \
  -d '{
    "visit_id":"PASTE_VISIT_ID",
    "status":"Completed",
    "transcript":"Booked unit B-1204 today. Token amount paid.",
    "booking_amount": 500000
  }'
```

Switch to the Sheet tab on camera — show the new row appear within 5 seconds.

---

## Deck enhancements (apply manually in PowerPoint)

The current deck is strong. Three targeted polish items make it submission-grade:

### Polish 1 — Outcomes slide (Slide 15)

The 100% attribution claim needs a measurement context. Add this line at the bottom:

> "Measurement window: 30-day rolling. Eval set: 15 hand-labeled leads with ground-truth fit/urgency. Target alignment ≥ 80%."

### Polish 2 — Honest Scope slide (Slide 16) — add a Risks row

The roadmap is great. Add a small row at the bottom titled **What could go wrong (and how we handle it)**:

- **Buyer ignores WhatsApp** → cap gap-fill at 2 turns; route to human on turn 3.
- **AI mis-scores a high-budget lead as cold** → low-confidence floor triggers manual escalation even when activation skipped.
- **Twilio sandbox can't reach arbitrary numbers in production** → Cloud API migration is documented as Phase 5 dependency.

### Polish 3 — GTM slide (Slide 17) — add explicit pricing band

Add under "How they pay":

> "Pilot: ₹50,000 / 4 weeks / refund on miss. Production: ₹15,000/project/month + ₹500 per attributed site visit + ₹5,000 per booking."

Numbers turn vague positioning into a concrete bet reviewers can evaluate.

---

## Recording technique (60-second tips)

- **Use Cmd+Shift+5** on Mac, set to "Record Selected Portion" so cursor stays visible.
- **Zoom in to lead detail at 110%** so the score breakdown reads clearly on small screens.
- **Speak at a steady pace** — 130 words per minute. Each clip script ≈ 200 words.
- **Don't narrate every click** — let the screen do the work. Pause and let the score appear.
- **Cut between clips with sign-out + sign-in showing on screen** — the persona switch IS the story.

When done, stitch in iMovie or Quicktime. Total runtime: 4:30 to 6:00 minutes.
