# What to do in the next 13 hours (while Lovable credits reset)

You don't need Lovable for any of this. By the time credits reset, every non-UI piece of the system should be working and tested.

Total time: ~90 minutes of focused work. Skip any block that feels tired-brain; do the rest tomorrow morning before the credit reset.

---

## Block 1: Apply migration 0003 (real property data) — 5 min

You shipped the seed file, but the migration that swaps demo names for real RERA-verified projects hasn't run yet.

1. Open Supabase SQL Editor
2. New query → paste contents of `build/supabase/migrations/0003_real_property_data.sql`
3. Run
4. Verify:
   ```sql
   SELECT project_name, developer, rera_number, possession_date
   FROM properties
   WHERE id::text LIKE '%101'
      OR id::text LIKE '%102'
      OR id::text LIKE '%103'
      OR id::text LIKE '%104'
      OR id::text LIKE '%105';
   ```
   Should show DLF Privana West, Lodha Supremus Lower Parel, Kolte-Patil Life Republic, Prestige Park Grove, Godrej Tropical Isle, all with real RERA numbers.

Also apply migration 0002 if you haven't yet (it adds the feedback function the Lead Agent uses):

5. New query → paste `build/supabase/migrations/0002_feedback_function.sql`
6. Run
7. Verify: `SELECT * FROM lead_feedback_aggregate();` returns JSON

---

## Block 2: Import + smoke-test Lead Agent + Conversion Agent — 25 min

You have n8n + ngrok running with credentials added. Now import the workflows and prove they work.

**First, set the Gemini env var.** Stop n8n (Ctrl+C in its terminal), then restart with:

```bash
GEMINI_API_KEY=AIza...your-key... SUPABASE_URL=https://grfqzwozyhuysincordf.supabase.co n8n start
```

(Put your real Gemini key inline. If you don't have one yet, get one at https://aistudio.google.com/apikey, free tier.)

**Then import + activate Lead Agent:**

1. http://localhost:5678/workflows → Add workflow → three-dot menu → Import from File
2. Pick `build/n8n/03_lead_agent.json`
3. Click any Supabase node → in right panel, set Credential dropdown to your Supabase credential → click "Apply to all nodes"
4. Top right toggle: **Active**

**Smoke test Lead Agent:**

```bash
curl -X POST https://<your-ngrok-url>.ngrok-free.app/webhook/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tonight Test Lead",
    "phone": "+919999999991",
    "source": "Smoke Test",
    "inquiry_text": "3BHK Whitefield around 1.7Cr, immediate possession needed, loan pre-approved",
    "language": "en"
  }'
```

Expected: JSON response with overall_score around 85-92, recommended_action = "Schedule site visit". If you get an error, open n8n → click the workflow → Executions tab → click the failed run to see exactly which node errored.

**Then repeat for Conversion Agent:**

1. Import `build/n8n/05_conversion_agent.json` → bind credentials → activate
2. From Supabase, copy any visit_id where status='Scheduled' (e.g., the 44444444-4444-4444-4444-444444444423 row)
3. Smoke test:

```bash
curl -X POST https://<your-ngrok-url>.ngrok-free.app/webhook/visit-outcome \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": "44444444-4444-4444-4444-444444444423",
    "status": "Completed",
    "post_visit_notes": "Buyer engaged but worried about possession delay and asked about loan rate options. Wants comparison with Lodha Lower Parel before booking."
  }'
```

Expected: response includes objections array with at least "possession" and "financing" and possibly "competitor", sentiment "neutral" or "positive".

**Full guide:** `build/n8n/IMPORT_GUIDE.md`. Refer to it if anything stalls.

---

## Block 3: Import Nurture Agent (just built) — 10 min

This is the workflow that drafts messages AND sends them via Twilio after approval.

1. Import `build/n8n/04_nurture_agent.json`
2. Click any Supabase node → bind credential → Apply to all
3. Click the Twilio node → bind your Twilio credential
4. Click the second webhook (Webhook: Approve Message) → set its Header Auth credential to your `dashboard-callback` credential
5. Activate

The workflow now has two public webhook endpoints:

- `POST /webhook/draft-message` — drafts a message into pending_approval (called by Lead Agent or manually)
- `POST /webhook/approve-message` — sends a pending message via Twilio (called by your dashboard's Approve button once we wire it tomorrow)

**Smoke test the draft endpoint:**

```bash
curl -X POST https://<your-ngrok-url>.ngrok-free.app/webhook/draft-message \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "33333333-3333-3333-3333-333333333321",
    "desired_template": "site_visit_invite",
    "trigger_event": "manual"
  }'
```

Expected: returns a new message_id, status pending_approval. Check in Supabase Table Editor → messages → new row appears with Gemini-drafted content.

**Don't test the approve endpoint yet** unless your phone is opted into the Twilio sandbox (Block 4).

---

## Block 4: Twilio sandbox opt-in for two phones — 5 min

Per `build/docs/DEMO_RUNBOOK.md` T-24h prep. Even though demo is days away, do this tonight so you don't forget.

1. https://console.twilio.com → Develop → Messaging → Try it out → Send a WhatsApp message
2. Note your sandbox join code (e.g., `join cattle-fence`)
3. On YOUR phone, open WhatsApp → message the sandbox number (e.g., +1 415 523 8886) → send `join cattle-fence`
4. Get a confirmation message back. Good.
5. Ask a friend (your Demo Day Buyer) to do the same on their phone

Save their phone number in your notes. You'll use it to seed a demo lead on June 1.

**Optional now:** test the approve endpoint with your phone:

```sql
-- First create a test pending message addressed to your phone
INSERT INTO leads (id, name, phone, source, language, intent_fields_count, stage)
VALUES ('99999999-9999-9999-9999-999999999991', 'YourName', '+91YOURNUMBER', 'Manual Test', 'en', 5, 'Qualified')
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;

INSERT INTO messages (id, lead_id, direction, content, language, status, drafted_by)
VALUES ('99999999-9999-9999-9999-999999999992', '99999999-9999-9999-9999-999999999991', 'outbound',
        'This is a test message from the Nurture Agent. If you see this on WhatsApp, the loop is working.',
        'en', 'pending_approval', 'manual-test');
```

Then approve it via curl (replace TOKEN with your N8N_APPROVAL_CALLBACK_TOKEN):

```bash
curl -X POST https://<your-ngrok-url>.ngrok-free.app/webhook/approve-message \
  -H "Content-Type: application/json" \
  -H "X-Approval-Token: TOKEN" \
  -d '{
    "message_id": "99999999-9999-9999-9999-999999999992",
    "action": "approve"
  }'
```

Your phone should receive the WhatsApp within ~3 seconds. **This is your end-to-end loop working.** Take a screenshot for the demo deck.

---

## Block 5: Read tomorrow's plan — 15 min

Open these three files and skim:

1. `build/ui-handoff/LOVABLE_TOMORROW_PROMPTS.md` — the 5 prompts you'll paste tomorrow when Lovable credits reset
2. `build/docs/DEMO_RUNBOOK.md` — the June 1 choreography
3. `build/seed/DATA_PROVENANCE.md` — the data-real-vs-synthetic narrative

Don't memorize. Just be familiar.

---

## Block 6: Sleep — non-negotiable

You have 5 days to demo. Brain fog kills more capstones than missing features. Stop here.

---

## What's done after tonight (if you finish all 6 blocks)

| Layer | Status |
|---|---|
| Supabase schema + real data | ✅ |
| Closed-loop feedback function | ✅ |
| n8n Lead Agent | ✅ live |
| n8n Conversion Agent | ✅ live |
| n8n Nurture Agent | ✅ live |
| Twilio WhatsApp end-to-end | ✅ proven with your own phone |
| Dashboard (frontend only, fixtures) | ✅ in Lovable preview |
| Dashboard reading live Supabase data | ⏳ tomorrow (Prompt A, 1 credit) |
| Dashboard manager-friendly UX | ⏳ tomorrow (Prompt B, 1 credit) |
| Dashboard Approve button → Twilio | ⏳ tomorrow (Prompt D, 1 credit) |

That puts you at Day 5-6 completion on the original 10-day plan, with everything backend-side proven. Two days of buffer before demo rehearsal.

---

## If something breaks tonight

Don't loop on it past 30 minutes. Drop a note here describing the error + the n8n Executions screenshot, and continue with the next block. Most blocks are independent so a Conversion Agent issue doesn't block Nurture Agent import, etc.

I'm here when you're back tomorrow.
