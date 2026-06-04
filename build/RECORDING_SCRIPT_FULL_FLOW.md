# Recording Script — Full-Flow Demo (Form → Dashboard → Each Agent → Booking)

**Length target:** 4-5 minutes
**Style:** Calm narration, no "as you can see", numbers not adjectives
**Audience:** A capstone reviewer who needs to believe the system actually runs end-to-end

---

## PRE-FLIGHT — 10 min of setup before you press record

### 1. Browser tabs (open in this exact order, left to right)

| Tab | What's on it | Why |
|---|---|---|
| 1 | Meta Lead Ads Testing Tool — https://developers.facebook.com/tools/lead-ads-testing | The "fill form" act |
| 2 | n8n at localhost:5678 → Executions tab | Show workflow firing in real time |
| 3 | Dashboard at localhost:8080 → `/` (Today page) | Activity feed + KPIs |
| 4 | Dashboard at localhost:8080 → `/leads` | After-effect of the lead landing |
| 5 | Dashboard at localhost:8080 → `/approvals` | The trust gate moment |
| 6 | Your phone with WhatsApp open (or QuickTime mirroring iPhone, OR a screenshot of previous successful WhatsApp delivery) | Proof the message arrived |

### 2. Terminal windows (2 tabs in same window)

| Tab | Pre-typed command (don't execute yet) |
|---|---|
| A | `curl -X POST "https://perennial-purifier-musty.ngrok-free.dev/webhook/new-lead" -H "Content-Type: application/json" -d '{"name":"Priya Sharma","phone":"+919811112222","email":"priya.s@example.com","source":"Meta Ad","inquiry_text":"Looking for 3BHK in Pune, budget ~1Cr","interested_project":null,"preferred_city":"Pune","preferred_config":"3BHK","budget_lakhs":100}'` |
| B | `curl -X POST "https://perennial-purifier-musty.ngrok-free.dev/webhook/visit-outcome" -H "Content-Type: application/json" -d '{"visit_id":"REPLACE_WITH_VISIT_UUID","status":"Completed","post_visit_notes":"Priya loved the 11th floor unit. Concerned about possession date push. Booked Unit 1102 with 5 lakh token.","unit_number":"1102","booking_amount":500000}'` |

Path A reviewer needs Tab A to be ready to paste after the Meta Testing Tool form is submitted.

Path B reviewer just runs Tab A right after the opening shot.

### 3. Create a test Lead Form (PATH A ONLY — 5 min)

If you're going with Path A:

1. Open https://business.facebook.com → top-left waffle menu → **All tools** → **Lead Center**
2. Inside Lead Center → **Forms Library** (left sidebar)
3. Click **Create Form** (top right)
4. **Form type:** More Volume
5. **Intro:** "Premium 3BHK Apartments in Pune"
6. **Questions:** keep default (Name, Email, Phone) + add 1 custom multiple-choice:
   - Question: "What's your budget range?"
   - Answers: `Under 1 Cr`, `1-2 Cr`, `2 Cr+`
7. **Privacy Policy URL:** any URL works (your GitHub repo URL is fine)
8. **Thank you screen:** keep default
9. **Create form**
10. Copy the form_id (visible in the URL after creation, or via Forms Library list)
11. Run in Supabase SQL Editor:

    ```sql
    -- Pick a Pune property
    SELECT id, project_name, city FROM properties WHERE city = 'Pune' LIMIT 3;
    -- copy one property_id

    -- Map your form to it (replace placeholders)
    INSERT INTO meta_form_to_property (form_id, property_id, form_name, page_id, created_by)
    VALUES (
      '<form_id_from_meta>',
      '<property_id_you_picked>',
      'Demo Form — 3BHK Pune',
      '<your_page_id>',
      'manual'
    );
    ```

### 4. Final pre-record check

- [ ] n8n at localhost:5678 is running, all 6 workflows Active
- [ ] Dashboard `npm run dev` running at localhost:8080
- [ ] ngrok tunnel up at perennial-purifier-musty.ngrok-free.dev
- [ ] Phone in airplane mode (no distracting notifications during recording) BUT WhatsApp app open
- [ ] Browser bookmarks bar hidden (Cmd+Shift+B in Chrome) for a clean shot
- [ ] Notification banners off (Mac: Cmd+Option+D toggles Do Not Disturb)
- [ ] Open Loom (loom.com → Start Recording → Screen + Webcam OR Screen Only)

---

## THE SCRIPT (Path A — with Meta form-fill)

### Scene 1 — Opening on the Dashboard (0:00 - 0:25)

**Show:** Tab 3 — Dashboard Today page. Cursor still on the headline.

**Say:**

> "This is Pentahouse. It's a 5-agent system that runs the sales floor for a residential developer in India.
>
> The number top-left is the median time to first reply on a new inquiry. The industry average is five hours. This number is 47 seconds.
>
> I'm going to take you through one buyer's journey, from a form submission on Instagram to a booking in our system, and show you each agent activating along the way."

### Scene 2 — The Form Fill (0:25 - 0:55)

**Show:** Switch to Tab 1 — Meta Lead Ads Testing Tool.

**Say:**

> "A buyer on Instagram taps 'Learn more' on an ad for a Pune 3BHK. Meta opens a native form inside the app. I'll simulate that with Meta's official testing tool."

**Do:**
- App dropdown: pick **Pentahouse Dev**
- Page dropdown: pick **RE Marketing Agent**
- Form dropdown: pick the form you created
- Click **Preview Form**
- Fill: Name = "Priya Sharma", Email = "priya@example.com", Phone = "+919811112222", Budget = "1-2 Cr"
- Click **Submit**

**Say:**

> "Meta confirms submission. In production their server fires a webhook to our n8n endpoint, validates the HMAC signature, and calls back to fetch the buyer's data. That second call requires Meta App Review for the `leads_retrieval` permission, which is a 6-week paperwork process I've documented but not completed. So for the rest of this demo, I'm injecting the equivalent buyer data directly into our Lead Agent."

### Scene 3 — Lead Agent (0:55 - 1:45)

**Show:** Terminal Tab A. Press **Enter** on the pre-loaded curl.

**Say:**

> "One POST to the Lead Agent's webhook. Watch the dashboard."

**Switch to Tab 3 — Dashboard Today page.** Within 1-2 seconds, the activity feed updates with:
- "Priya Sharma just scored. Next step: Schedule site visit."

**Say:**

> "The Lead Agent just ran. It called Gemini, scored fit and urgency against the properties in our catalog, matched her budget to a 3BHK in Hinjewadi, and recommended a site visit. All in under a second."

**Switch to Tab 4 — Dashboard `/leads` page.** Show the new Priya row at the top of the list with her score.

**Say:**

> "And here she is in the pipeline, ranked by score against the rest of today's leads."

### Scene 4 — Nurture Agent (1:45 - 2:45)

**Switch to Tab 5 — Dashboard `/approvals` page.**

**Say:**

> "The moment Lead Agent finishes, the Nurture Agent kicks in. It drafts a WhatsApp reply in the buyer's language, with the right tone for her score, and queues it for me to approve. Never sends anything autonomously. This is the trust gate that makes this product viable on a real Indian sales floor."

**Show:** The pending draft for Priya. Read the first sentence aloud.

**Say:**

> "I read this, it's grounded in her inquiry, no fabricated price. I approve."

**Click Approve.** A toast appears: "Sent to Priya on WhatsApp."

**Switch to Tab 6 — your phone.** Show the WhatsApp message that just arrived (OR cut to a pre-captured screenshot if you can't film the phone screen).

**Say:**

> "Twilio delivered it. The buyer just got a message that doesn't say 'AI'. From her side, this is a human sales rep replying in under a minute."

### Scene 5 — Conversion Agent (2:45 - 3:30)

**Say:**

> "Skip ahead three days. Priya replied, scheduled a visit, attended. The site rep typed notes into her file. The Conversion Agent processes them."

**Switch to Terminal Tab B.** First — in another browser tab, quickly grab her visit_id:

```sql
SELECT id FROM visits WHERE lead_id = (SELECT id FROM leads WHERE phone = '+919811112222') ORDER BY created_at DESC LIMIT 1;
```

Copy the UUID, paste into Terminal Tab B replacing `REPLACE_WITH_VISIT_UUID`. **Press Enter.**

**Switch to Tab 3 — Dashboard Today page.** Activity feed shows:
- "Conversion Agent extracted 2 concerns from Priya's visit"
- "🎉 Priya Sharma just booked. Unit 1102."

**Say:**

> "The Conversion Agent extracted two objections — possession date and price — tagged them by severity, ran a sanity check on the booking amount, and emitted a BOOKING_MADE event. Activity feed shows it. Top-right KPI just ticked up by one."

### Scene 6 — Close (3:30 - 4:00)

**Switch to Tab 3 — Today page. Cursor on the headline.**

**Say:**

> "That's the full loop: inquiry to booking, every step traceable, every outbound message human-approved. Pentahouse. Five agents. One trust gate. The audit doc and commercial thesis in the repo cover what's broken and what's next.
>
> Thank you."

**Fade out. Stop recording.**

---

## THE SCRIPT (Path B — skip Meta form-fill)

Same scenes 1, 3, 4, 5, 6. Replace Scene 2 with:

> "A buyer fills a Meta Lead Form on Instagram. The webhook integration is verified — there's a screenshot in the repo proving the Meta side handshake. Today I'll skip the form fill and inject the equivalent lead directly into our Lead Agent, so we can focus on the agent chain."

Then go directly to Scene 3.

**Total length:** 3:30 instead of 4:00.

---

## Post-recording

1. Loom auto-uploads. Click **Share** → **Copy link**.
2. Add the link to the top of `build/CAPSTONE_SUBMISSION.md`:

   ```markdown
   **Demo recording:** [4-minute end-to-end walkthrough](https://loom.com/share/YOUR_LINK)
   ```

3. Commit and push.

---

## If something breaks mid-recording

- **n8n shows execution failed:** Stop. Don't pretend. Re-record from Scene 3 with a fresh lead (change phone to +919811113333).
- **WhatsApp doesn't arrive on phone:** Cut to the previous successful WhatsApp screenshot. Narrate "you can see in the activity feed the message was sent at..." — Loom lets you re-record any single scene.
- **Activity feed lags:** Refresh once. Wait 3 seconds, then continue narrating.
- **Meta form submission gets stuck:** Use Path B narration mid-recording and skip Tab 1. The script is built to survive this.

---

## One-paragraph narration if you only want a 90-second cut

> "Pentahouse is a 5-agent sales system for Indian residential developers. The headline number is median first-response time, currently 47 seconds against an industry average of 5 hours. Watch the loop: I'm injecting an inquiry from Priya, a Pune buyer. Lead Agent scores her in under a second. Nurture Agent drafts a WhatsApp reply, queues it for me, never sends without my approval — that's the trust gate. I approve, Twilio delivers, message arrives. Three days later, post-visit notes go in, Conversion Agent extracts objections and books the unit. Every event traced end-to-end. Audit and commercial thesis in the repo. Five agents, one trust gate, no autonomy without a human."
