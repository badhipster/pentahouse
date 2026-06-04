# Meta Lead Ads Setup — Pentahouse

**File:** `build/n8n/06_meta_lead_ingest.json`
**Time to wire:** 15-25 minutes
**Cost:** ₹0 (Development mode)

This runbook takes you from "I have a Meta developer account" to "an Instagram Lead Form submission appears as a scored lead in Pentahouse." Meta's Development mode does not require App Review, so the full loop works against your own test Page.

---

## What you need before starting

- A Meta developer account at developers.facebook.com (✅ you have one)
- A Facebook Page you control (any Page; can be a personal test Page)
- The Pentahouse n8n instance running with the public ngrok URL ready
- Migration 0007 (`meta_form_to_property` table) applied in Supabase

---

## Step 1 — Apply migration 0007

```
build/supabase/migrations/0007_meta_form_mapping.sql
```

Run in Supabase SQL Editor. Verify:

```sql
SELECT 'table' AS kind, COUNT(*) AS n FROM meta_form_to_property
UNION ALL SELECT 'view',         COUNT(*) FROM v_meta_form_lookup;
-- Expect 0, 0 (both empty)
```

---

## Step 2 — Create the Meta App (or reuse one)

1. Go to **developers.facebook.com** → **My Apps** → **Create App**
2. Use case: **Other** → Type: **Business**
3. App name: `Pentahouse Dev` (or anything)
4. After creation, you land on the App Dashboard
5. From the left sidebar, add the **Webhooks** product
6. Also add the **Marketing API** product (for v2 — not strictly needed today, but adds the scopes we want available)

---

## Step 3 — Generate a Page Access Token

1. Open the **Graph API Explorer** at developers.facebook.com/tools/explorer
2. Top right dropdown: select your Meta App (Pentahouse Dev)
3. Click **Get Token** → **Get User Access Token**
4. In the popup, select these permissions:
   - `pages_show_list`
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `leads_retrieval`
   - `pages_manage_ads`
5. Click **Generate Access Token**, sign in with the Facebook account that owns your Page
6. Now in the Graph API Explorer, change the dropdown from **User Token** to **Page Token** and pick your Page → this gives you a short-lived Page Access Token
7. Extend it to long-lived:
   - Go to **Access Token Debugger**: developers.facebook.com/tools/debug/accesstoken
   - Paste the Page token, click **Debug**, then **Extend Access Token**
   - Copy the new long-lived token (good for ~60 days for Pages; auto-renews if used)
8. Save this as `META_PAGE_ACCESS_TOKEN` in your n8n environment

---

## Step 4 — Configure the Webhooks product

1. In App Dashboard → **Webhooks** → click **Page** (the object type)
2. **Callback URL:** `https://{your-ngrok-url}/webhook/meta-webhook` (the path `06_meta_lead_ingest.json` is configured to handle)
3. **Verify Token:** invent a string, e.g. `pentahouse_verify_2026`. Save this same string as `META_VERIFY_TOKEN` in your n8n environment
4. Click **Verify and Save**
   - n8n receives a GET request, validates the token, echoes the challenge
   - If you see green check: handshake worked
   - If 403: env var not set or mismatched — fix and retry
5. After verification succeeds, subscribe to the **leadgen** field on the right side of the Webhooks UI

---

## Step 5 — Get your App Secret

1. App Dashboard → **Settings** → **Basic**
2. Click **Show** next to **App Secret**, confirm your password
3. Copy the secret. Save as `META_APP_SECRET` in n8n environment
4. This is used to verify the `X-Hub-Signature-256` header on every incoming webhook event

---

## Step 6 — Create a Lead Form

You can do this two ways. The Forms Library UI is simpler.

**Option A: Meta Business Suite → Lead Center → Lead Forms**

1. Go to business.facebook.com → your Page → **Lead Center** → **Forms Library**
2. **Create Form**
3. Name: e.g. `Pentahouse Test Form — Lodha Park Mumbai`
4. Form type: **More Volume** (or **Higher Intent** if you want extra confirmation step)
5. **Intro:** "Get details on Lodha Park, Lower Parel" (optional but improves quality)
6. **Questions:** keep the autofilled defaults (Full Name, Email, Phone Number) AND add two custom questions:
   - "BHK preference?" — choices: 2BHK, 3BHK, 4BHK
   - "Budget range?" — choices: <2 Cr, 2-4 Cr, 4 Cr+
7. **Privacy Policy:** paste any URL (Meta requires it; can be your dev domain)
8. **Completion screen:** generic thank-you
9. **Create form**
10. After creation, note the **Form ID** from the URL or share dialog

**Option B: Use Meta's Lead Ads Testing Tool (no real ad needed)**

- developers.facebook.com/tools/lead-ads-testing
- Pick your Page and Form
- Generate a test lead → it triggers a real webhook event

---

## Step 7 — Map the Form to a Property

Pick any property from your Pentahouse `properties` table:

```sql
SELECT id, project_name, city FROM properties WHERE status = 'Active' LIMIT 5;
```

Then insert the form mapping. Replace the placeholders with your actual values:

```sql
INSERT INTO meta_form_to_property (form_id, property_id, form_name, page_id, created_by)
VALUES (
  '{your_form_id_from_step_6}',
  '{property_uuid_from_query_above}',
  'Pentahouse Test Form — Lodha Park Mumbai',
  '{your_page_id}',
  'manual'
);
```

Verify:

```sql
SELECT * FROM v_meta_form_lookup;
-- Expect 1 row showing form_id → property mapping
```

---

## Step 8 — Wire the n8n environment variables

In your n8n instance (`.env` file or n8n UI → Settings → Environment Variables):

```
META_APP_SECRET=<from step 5>
META_VERIFY_TOKEN=<the string you invented in step 4>
META_PAGE_ACCESS_TOKEN=<from step 3, long-lived>
N8N_BASE_URL=https://<your-ngrok-url>
SUPABASE_URL=<your supabase project URL>
```

Restart n8n if needed for env vars to load.

---

## Step 9 — Import the workflow and publish

1. n8n UI → **Workflows** → **Import from File** → pick `build/n8n/06_meta_lead_ingest.json`
2. Open the workflow, re-bind the `Supabase account` credential on each node showing `REPLACE_AFTER_IMPORT`
3. Save → **Publish** (top right toggle)

---

## Step 10 — Test it end-to-end

**Test the verification handshake (already done in step 4 if green check appeared):**

```
curl "https://{your-ngrok-url}/webhook/meta-webhook?hub.mode=subscribe&hub.verify_token=pentahouse_verify_2026&hub.challenge=test123"
# Expect: test123
```

**Test a real lead submission via the Lead Ads Testing Tool:**

1. developers.facebook.com/tools/lead-ads-testing
2. Pick your Page and Form, click **Preview Form**
3. Fill it out as a buyer would, hit Submit
4. Within ~5 seconds:
   - Your n8n execution log shows the workflow firing on the POST
   - `agent_logs` gets a row: `agent_name=Meta Lead Ingest, action=meta_lead_ingested`
   - The Lead Agent fires automatically (chained via the handoff HTTP node)
   - `agent_events` gets `LEAD_SCORED` event
   - A new row appears in `leads` with `source='Meta Ad'`
   - If EspoCRM is also wired (next runbook), the lead lands there too

**SQL to verify the full chain ran:**

```sql
SELECT
  l.name, l.phone, l.source, l.created_at,
  ls.overall_score, ls.recommended_action
FROM leads l
LEFT JOIN lead_scores ls ON ls.lead_id = l.id
WHERE l.source = 'Meta Ad'
ORDER BY l.created_at DESC
LIMIT 5;
```

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| 403 on the GET verification | `META_VERIFY_TOKEN` env var doesn't match the string you typed in Meta UI | Re-check both sides; remember whitespace |
| 401 on every leadgen POST | HMAC signature mismatch — `META_APP_SECRET` wrong, or n8n parsed body before HMAC ran | Verify env var; ensure webhook node has `rawBody: true` |
| Graph API returns "field_data not allowed" | Page Access Token missing `leads_retrieval` scope | Re-generate token in step 3 with the correct permission list |
| Lead arrives but `interested_project` is null | Form not mapped in `meta_form_to_property` | Insert row per step 7 |
| Long-lived token expires | Tokens last 60 days for Pages; auto-renews if app stays active | Regenerate quarterly OR migrate to system-user tokens in v2 |

---

## What this gives you

- Instagram + Facebook Lead Form submissions arriving in real time
- HMAC-validated, attack-resistant webhook ingress
- Lead enrichment via Graph API (we know who they are, not just that they submitted)
- Property mapping via `meta_form_to_property` so each lead lands in the right campaign
- Closed loop into existing Lead Agent → Nurture → Conversion → Booking chain
- Full attribution chain preserved (`leadgen_id, form_id, page_id, ad_id, adgroup_id`) in the `meta_attribution` field

This closes audit Part 1's Instagram-to-booking flow gap (capabilities 5, 6, 7, 8 from that table). What stays open for v2 is the *outbound* push: actually creating the ad and the form via Marketing API. v1 stops at "we can receive what Meta sends us."
