# Live Demo Runbook (June 1, 2026)

How to run the live WhatsApp demo for the Real Estate Marketing & Conversion Intelligence Agent in front of ~1000 attendees. Includes pre-demo setup, minute-by-minute choreography, and failsafes.

## Roles

You can run this solo, but having one co-presenter as "the buyer" raises the wow factor a lot.

| Role | Who | What they do |
|---|---|---|
| **Presenter** | Abhishek | Drives the dashboard. Approves messages. Narrates the story. |
| **Buyer** (recommended) | A friend, partner, or co-fellow with a phone | Sends 1 WhatsApp message at the right moment. That's it. Can be in the audience. |
| **Operator** (optional) | Anyone watching the back-end | Has Supabase Table Editor open as a backup view. Calls out "row landed" so audience hears the database confirm. |

## Pre-demo prep (T-24h to T-1h)

### T-24h: Twilio sandbox opt-in

The Twilio WhatsApp sandbox only delivers to numbers that have explicitly opted in. Both Presenter and Buyer phones must be opted in.

1. Find your sandbox join code in https://console.twilio.com → Develop → Messaging → Try it out → Send a WhatsApp message. It looks like `join <two-word-code>`.
2. From the Presenter phone, open WhatsApp → message the sandbox number → send the join code.
3. Same from the Buyer phone.
4. You should each get a confirmation message back.
5. Save the sandbox number as a contact named "RE Agent Demo" on the Buyer phone for easy lookup live.

### T-12h: Pre-warm Supabase

Free tier projects pause after 7 days of inactivity. Open the Supabase dashboard at https://supabase.com/dashboard/project/grfqzwozyhuysincordf at least once in the 12 hours before demo. A simple "click into any table" is enough.

### T-2h: Pre-flight checklist

Run this command list and tick each one. If any fails, do NOT skip; debug now.

- [ ] `curl https://<ngrok>.ngrok-free.app/healthz` returns 200 (or n8n landing page)
- [ ] Open dashboard at the chosen Lovable/Replit URL. Sees the seeded data, all 5 hero projects visible.
- [ ] Open Supabase Table Editor side-by-side with the dashboard.
- [ ] Open Manager Approval (`/approvals`) screen. Should show the 3 pre-seeded pending messages (Smita, Anant, Imran Hindi).
- [ ] Reset the demo lead state: in SQL Editor, run:
  ```sql
  -- Reset demo-day "fresh lead" slot
  DELETE FROM leads WHERE phone = '+919998887766';
  DELETE FROM lead_scores WHERE lead_id NOT IN (SELECT id FROM leads);
  DELETE FROM messages WHERE lead_id NOT IN (SELECT id FROM leads);
  ```
- [ ] Confirm Gemini quota: log into https://aistudio.google.com → check today's usage is under 1400 of 1500 daily calls.
- [ ] Battery: laptop fully charged. Phone (Buyer's) at 50%+.
- [ ] Pre-load the backup Loom recording in a hidden browser tab (see Failsafe).

### T-30m: Run a dry rehearsal

Walk through the entire flow below once, in private. Time it. Target: under 4 minutes for the live segment.

## The live demo (target: 7-8 minutes total)

### Segment 1 (0:00-1:30): The problem

Show the dashboard's Command Center. Walk through:

- "Indian developers spend ₹700 to 4500 per lead. Average first response time is 4 to 6 hours. Most buyers go cold before anyone talks to them."
- Point at the KPI card "Time to first qualifying response" = 47s.
- "We took that from hours to seconds with five agents talking to each other."

### Segment 2 (1:30-3:00): Show the closed loop on seeded data

Navigate `/leads/lead-1` (Rahul Mehra). Show:

- Score panel: fit 92, urgency 95, confidence 94
- Why-fit and why-urgent reasoning panels
- WhatsApp conversation history (the 3 sent messages)
- Matched property (DLF Privana West)

Point out: "This is a real RERA-registered project, RC/REP/HARERA/GGM/819/551/2024/46. You can verify it on the Haryana RERA portal right now."

### Segment 3 (3:00-5:30): The LIVE WhatsApp moment

This is the wow moment. Choreography:

**3:00** — Switch to `/approvals` screen full-screen. Pause.

**3:10** — Say: "Let me show you what happens when a new lead arrives right now. [Buyer name] is in the audience, on her phone."

**3:20** — Buyer sends a pre-agreed message from her phone to the Twilio sandbox number:

> "Hi, looking for 3BHK in Whitefield around 1.7Cr. Loan pre-approved with HDFC. Can visit this Saturday."

(Have her copy-paste this from a note on her phone so there's no typo risk.)

**3:25-3:30** — Within ~5 seconds the dashboard should show:
- A new lead row appears (animate-in)
- Score chip updates to 90+
- A pending-approval message appears in the queue with the Buyer's name

**3:35** — Say: "The Lead Agent just called Gemini, extracted intent, scored fit and urgency, and the Nurture Agent drafted a personalized reply. None of that has gone to the buyer yet. I have to approve it."

**3:40** — Focus on the new approval card. Show the drafted message (it should reference Prestige Park Grove if the lead said Whitefield). Say: "Here's the draft. Notice it grounds the price in our actual inventory and offers two specific slots."

**3:50** — Press **A** (the single-key shortcut).

**3:55-4:05** — Buyer's phone receives the WhatsApp. Buyer raises her phone so the audience sees it (or the camera if recorded). Read the message aloud.

**4:10** — Switch to Supabase Table Editor in a separate window. Show the `messages` table now has a `sent` status row. Show `agent_logs` has 2 new entries.

**4:30** — Say: "From inbound message to outbound approved reply: 17 seconds. Industry average is 4 to 6 hours. That's the wedge."

### Segment 4 (5:30-7:00): The closed loop and ROI

Navigate to `/visits`. Pick a Completed visit. Click "Mark Completed" if any are still open, or just show an existing one:

- Show post-visit notes
- Show objections extracted by Gemini (price, decision-maker, etc.)
- Say: "The objection categories feed back into next round of scoring. If price keeps coming up for one project, the Lead Agent down-weights urgency on similar leads. That's the closed loop."

Navigate to `/analytics`:

- Show source ROI table
- Point at CP Referral row: ₹0 spend, 1 booking. "Channel partners are 4x more efficient than Meta for this developer. The system surfaces this in week one of running."

### Segment 5 (7:00-7:45): Wrap

- "This runs on a fully free stack: Supabase, n8n local, Gemini Flash free tier, Twilio sandbox. ₹0 to build."
- "Architecture: 5 agents, 1 event bus, 1 manager approval gate. The gate is the trust layer."
- "Roadmap: Meta + Google API integration, vector RAG over project documents, multilingual beyond English and Hindi."

## Failsafes

### F1: Twilio doesn't deliver within 10 seconds

Switch to the backup pre-recorded Loom (pre-loaded in a hidden browser tab). Say: "Live networks are messy. Here's the same flow we recorded an hour ago." Audience won't mind because the rest of the demo is live.

### F2: n8n workflow errors mid-demo

In the Manager Approval screen, the pending message will be visible regardless because it's already in Supabase. Approve it manually via the UI (no agent re-trigger needed). The Twilio send may not happen, but the audience sees the approval flow.

### F3: Supabase pauses or rate-limits

Toggle `NEXT_PUBLIC_DEMO_MODE=true` in the dashboard. It now serves from `build/ui-handoff/demo-fallback.json`. The UI looks identical, only mutations don't persist. Tell the audience: "I'm switching to local fallback to keep us moving." They won't care.

### F4: Buyer phone is silent

If the Buyer's WhatsApp doesn't arrive in the agent within 15s of her sending, switch tabs to Supabase Table Editor and `INSERT INTO leads` manually with the same content. This triggers the workflow as if it came from WhatsApp. Audience won't notice the data path.

## What to NOT do live

- Don't show the Manager Approval rejection flow. It's a great feature but spends time. Cut it.
- Don't expand the agent_logs feed verbosely. Scroll past quickly.
- Don't open the n8n workflow editor live. It looks chaotic on a projector. Mention it exists, move on.
- Don't try to type into Lovable's preview. Use the production-deployed URL only.

## The 30-second elevator version (if running over time)

If you're behind schedule when you hit the 5-minute mark, collapse to this:

1. Show `/approvals` with 3 pending messages
2. Press A on one. It sends.
3. Switch to `/analytics`. Show CP Referral as lowest CPB.
4. Say the closing line and step off.

## Post-demo

- Loom recording uploaded to the capstone deliverables folder within 2 hours.
- Screenshot of the final dashboard state (post-demo bookings count, etc.) for the LinkedIn post.
- Take the dashboard offline within 24h to avoid the Supabase free tier pausing during follow-up viewer traffic. Re-enable on request.
