# Recording Script — Pentahouse Capstone Demo (3 minutes)

**Format:** Loom or QuickTime screen recording. Webcam in corner (optional but lifts credibility).
**Length target:** 2:45 to 3:15. Hard cap 4:00.
**Tone:** Calm, present-tense, plain English. Numbers, not adjectives. No "as you can see."

---

## Pre-recording checklist (5 min)

- [ ] Dashboard running at localhost:8080
- [ ] At least 3 recent rows visible in the activity feed
- [ ] n8n editor open in a second tab on the Lead Agent workflow
- [ ] EspoCRM tab open showing the Leads list
- [ ] One Google Sheets tab open showing the Visits sheet
- [ ] Phone in airplane mode (no notification interruptions)
- [ ] Close every other app

---

## Scene 1 — Open on the dashboard (0:00 - 0:25)

**Show:** The Today page of the dashboard. Cursor still.

**Say:**

> "This is Pentahouse. It is a 5-agent system for an Indian residential developer's sales floor.
>
> The headline number, top left, is the median time to first reply on a new inquiry. Industry average is five hours. This number is 47 seconds.
>
> Everything else in the dashboard feeds off that loop."

---

## Scene 2 — Walk the activity feed (0:25 - 0:50)

**Show:** Scroll the activity feed slowly. Hover one row.

**Say:**

> "This is the live activity feed. Every action by every agent and every human shows up here in plain English. So this row is the Lead Agent scoring an inbound lead. This one is a WhatsApp draft waiting for the manager to approve. This one is the Conversion Agent extracting objections from a post-visit note.
>
> Human-in-the-loop is the design choice that makes this product real. The system writes; the manager ships."

---

## Scene 3 — The Instagram form to booking flow (0:50 - 1:40)

**Show:** Switch to n8n. Open `Meta Lead Ingest` workflow. Then back to dashboard `/leads` page.

**Say:**

> "Here's the marquee flow. A buyer fills a Lead Form inside Instagram. Meta fires a webhook to our endpoint. We validate the signature, fetch the buyer's name and phone from Meta's Graph API, map the form id to a specific property, and hand the lead to our Lead Agent.
>
> The Lead Agent scores it with Gemini, decides whether to escalate or auto-nurture, and pushes it to EspoCRM..." [switch to EspoCRM tab] "...where the developer's existing operations team picks it up. Same lead, same buyer, two systems in sync.
>
> Then..." [switch back to dashboard] "...the Nurture Agent drafts a WhatsApp message. Manager approves it here, Twilio sends it, the buyer replies. That entire loop happens in 47 seconds median."

---

## Scene 4 — The audit and the honest gap (1:40 - 2:20)

**Show:** Open `build/docs/AGENT_AUDIT.md` in a code editor. Scroll briefly.

**Say:**

> "I also audited my own system before submitting it. This document walks through every agent — its type, its tools, its memory, its hand-off contract — and lists 31 specific upgrades for v2.
>
> Some of them landed this week. Lead deduplication via RERA number. Per-objection severity tagging. Deterministic ad simulation. Trace IDs that thread every event in a buyer journey.
>
> Some of them don't ship this week. Real Meta Marketing API outbound push needs Meta App Review. WhatsApp Business Cloud API needs template approval. Multi-tenant data isolation is a refactor I deferred.
>
> The audit doc is honest about the gap. So is the commercial thesis."

---

## Scene 5 — Why I cancelled the live demo (2:20 - 2:55)

**Show:** Open `build/docs/COMMERCIAL_THESIS.md`. Scroll to the "Gap honest" section.

**Say:**

> "The Product Space cohort demo was scheduled for today. I cancelled it three days ago.
>
> The system is demo-ready. It is not pilot-ready. A stage pitch in front of a thousand people, without a single paying customer, would have spent credibility I had not earned.
>
> Instead, I wrote the commercial thesis. Who pays. Why they pay. What the pilot proposal looks like. Why Pune is the beachhead. What the first 5 listening calls look like.
>
> The instinct to ship is strong. Cancelling the demo was the harder, correct call. I think a capstone reviewer should weight that decision more than any single technical artifact in the repo."

---

## Scene 6 — Close (2:55 - 3:10)

**Show:** Back to dashboard's Today page.

**Say:**

> "Pentahouse. Five agents. One trust gate. A path to revenue documented in the repo. Thank you."

**Fade out. End recording.**

---

## Variants if you have less time

### 90-second version

Cut Scenes 3 and 4. Open on dashboard (Scene 1), activity feed (Scene 2), then jump straight to cancellation explanation (Scene 5) and close.

### 5-minute version (if recording for a panel review)

Expand Scene 3 — walk one full lead end-to-end with screen recording, including the WhatsApp on a phone. Expand Scene 4 — pick one specific audit item (the Listing Agent dedup) and show the migration, the RPC, and how it solves the duplicate-property problem.

---

## After recording

1. Upload to Loom (`loom.com/new`) — fastest, gives you a shareable link in 30 seconds
2. Set visibility to **anyone with link**
3. Add the link to the top of `CAPSTONE_SUBMISSION.md`:

   ```markdown
   **Demo recording:** [3-minute walkthrough](https://loom.com/share/...)
   ```

4. Done. Submit.

---

## A note on the voice

This is your capstone. The recording is not a sales pitch — it is a competence demonstration. Talk like you would to a senior engineer or PM who is going to scrutinise this. No buzzwords ("revolutionary," "blazing-fast," "AI-powered"). No undersell either ("just a small project," "still learning"). The tone is: **I built this; I know what's broken; I know what I would do next; here is the evidence.**

That tone is what the reviewer is grading.
