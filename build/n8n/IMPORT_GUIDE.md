# n8n Import Guide

How to import the workflows in `build/n8n/`, wire credentials, and smoke-test each one. ~20 minutes start to finish.

## Prereqs (one-time)

1. n8n running at http://localhost:5678 (you have this)
2. ngrok tunnel pointing at 5678 with a `https://...ngrok-free.app` URL (you have this)
3. All four credentials saved in n8n (Supabase, Google Gemini, Twilio, Header Auth)
4. The feedback function applied: open Supabase SQL Editor → paste `build/supabase/migrations/0002_feedback_function.sql` → Run

## Set the GEMINI_API_KEY environment variable for n8n

The workflows read the Gemini key from `$env.GEMINI_API_KEY` so it doesn't have to live inside the workflow JSON.

**Option A (easiest):** stop n8n (Ctrl+C in its terminal), then restart with:

```bash
GEMINI_API_KEY=AIza... n8n start
```

Replace `AIza...` with your actual Gemini key. Now `$env.GEMINI_API_KEY` resolves inside any workflow.

**Option B (persistent):** add to `~/.zshrc` or `~/.bash_profile`:

```bash
export GEMINI_API_KEY=AIza...
```

Reload (`source ~/.zshrc`), then `n8n start` again.

Likewise set `SUPABASE_URL=https://grfqzwozyhuysincordf.supabase.co` so the feedback HTTP call can resolve it.

## Importing a workflow

For each `.json` file in `build/n8n/`:

1. Open http://localhost:5678/workflows
2. Click **Add workflow** (top right) → click the **three-dot menu** on the new empty workflow → **Import from File**
3. Pick the `.json` file (e.g., `03_lead_agent.json`)
4. The workflow loads. You'll see red triangles on every Supabase node (credential not bound).

## Binding the Supabase credential after import

The exported JSON references credential ID `REPLACE_AFTER_IMPORT`. You need to point each Supabase node at your actual credential:

1. Click any Supabase node
2. In the right panel, find the **Credential for Supabase API** dropdown
3. Pick your saved `Supabase account` credential
4. n8n will offer to **Apply to all nodes** using the same credential type. Click yes. All red triangles clear at once.

Repeat for any Twilio node (in the Nurture Agent workflow later).

The HTTP Request nodes (Gemini, feedback function) don't need credentials because they use `$env.GEMINI_API_KEY` and inline auth headers.

## Activating a workflow

Top right of the workflow editor: toggle **Active** to ON. The workflow's webhook URL is now live at:

```
https://<your-ngrok>.ngrok-free.app/webhook/<path>
```

The `<path>` is in the Webhook node's parameters. For Lead Agent it's `new-lead`. For Conversion Agent it's `visit-outcome`.

## Smoke test: Lead Agent

```bash
curl -X POST https://<your-ngrok>.ngrok-free.app/webhook/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test Lead",
    "phone": "+919999999999",
    "email": "smoke@test.com",
    "source": "Smoke",
    "inquiry_text": "3BHK Whitefield around 1.7Cr, immediate possession needed, loan pre-approved",
    "language": "en"
  }'
```

Expected response within ~3 seconds:

```json
{
  "ok": true,
  "lead_id": "...uuid...",
  "overall_score": 85,
  "recommended_action": "Schedule site visit",
  "escalated": false
}
```

Then verify in Supabase Table Editor:
- `leads` has the new "Smoke Test Lead" row
- `lead_scores` has a new row with the matching `lead_id`
- `agent_events` has a `LEAD_SCORED` row
- `agent_logs` has a `scored_lead` row

If anything failed, open the n8n workflow editor, click the **Executions** tab at the bottom, click the failed execution. n8n shows you the exact node that errored with its input/output payloads.

## Smoke test: Conversion Agent

This one needs a real visit_id. From Supabase Table Editor → visits, copy any visit ID with status `Scheduled` (e.g., `44444444-4444-4444-4444-444444444423`).

```bash
curl -X POST https://<your-ngrok>.ngrok-free.app/webhook/visit-outcome \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": "44444444-4444-4444-4444-444444444423",
    "status": "Completed",
    "post_visit_notes": "Buyer engaged but worried about possession delay and asked about loan rate options. Wants comparison with Lodha Lower Parel before booking."
  }'
```

Expected response:

```json
{
  "ok": true,
  "visit_id": "44444444-4444-4444-4444-444444444423",
  "status": "Completed",
  "objections": ["possession","financing","competitor"],
  "sentiment": "neutral"
}
```

Verify in Supabase:
- `visits` row now has `objections` array populated, `sentiment` set, `completed_at` timestamp
- `agent_events` has a `VISIT_COMPLETED` row
- `agent_logs` has an `extracted_objections` row

## Troubleshooting cheat sheet

| Symptom | Likely cause | Fix |
|---|---|---|
| Red triangle on Supabase node | Credential not bound | Click node → pick credential → Apply to all |
| 404 on webhook curl | Workflow not active | Toggle Active ON in editor |
| "Could not connect to Supabase" | Host URL has `/rest/v1/` suffix | Remove suffix; host should be `https://....supabase.co` only |
| Gemini node returns HTTP 400 | API key not set in env | Restart n8n with `GEMINI_API_KEY=... n8n start` |
| Gemini returns text instead of JSON | `responseMimeType` ignored | Make sure model is `gemini-2.5-flash` (not 1.5); workflow already sets this |
| agent_log row not appearing | Earlier node failed; log node is at the end | Open Executions tab, find the failing node |

## What to import in what order

Day 3-4 deliverables (you have these now):
1. `0002_feedback_function.sql` → Supabase SQL Editor
2. `03_lead_agent.json` → n8n → activate
3. `05_conversion_agent.json` → n8n → activate

Day 5-6 deliverables (coming once UI A/B winner is picked):
4. `04_nurture_agent.json` → wires Twilio sends with approval gate
5. `01_listing_agent.json` + `02_ad_agent.json` → autonomous content generation
6. Wire dashboard's Approve button to `04_nurture_agent.json` via the Header Auth credential
