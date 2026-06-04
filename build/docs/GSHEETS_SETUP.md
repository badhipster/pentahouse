# Google Sheets Setup — Pentahouse

**File modified:** `build/n8n/05_conversion_agent.json` (two new nodes added: `Google Sheets: Append Visit`, `Google Sheets: Append Booking`)
**Time to wire:** 10 minutes
**Cost:** ₹0

The Conversion Agent now mirrors every processed visit and every booking into a shared Google Sheet — the format sales heads actually live in. Two tabs: **Visits** and **Bookings**.

---

## Step 1 — Create the sheet

1. Go to sheets.google.com → **Blank**
2. Rename it: `Pentahouse Sales Ops Live`
3. **Rename Sheet1 → `Visits`** (right-click the tab, Rename)
4. **Row 1 of Visits — paste these column headers exactly (one per cell, A1 to M1):**

   ```
   visit_id    lead_id    lead_name    property_id    project_name    status    sentiment    objections    has_deal_breaker    summary    next_step    logged_at    trace_id
   ```

5. Bottom of screen → **+** to add a tab → name it `Bookings`
6. **Row 1 of Bookings — column headers (A1 to K1):**

   ```
   booking_id    lead_id    lead_name    property_id    project_name    unit_number    booking_amount_inr    sanity_check    needs_review    logged_at    trace_id
   ```

7. From the sheet URL — copy the long string between `/d/` and `/edit`:

   ```
   https://docs.google.com/spreadsheets/d/{THIS_IS_THE_SHEET_ID}/edit
   ```

   Save as `GSHEETS_OPS_SHEET_ID` in your n8n environment.

---

## Step 2 — Create a Google OAuth credential in n8n

n8n's Google Sheets node uses OAuth 2.0. Two paths:

### Option A: n8n Cloud / self-hosted with pre-configured Google client

If you already have `Sign in with Google` working in n8n:

1. n8n UI → **Credentials** → **New**
2. Pick **Google Sheets OAuth2 API**
3. Click **Connect my Google Account** → sign in with the Google account that owns the sheet
4. Authorize the scopes (Sheets read/write)
5. Save the credential. Name it `Google Sheets account` (matches the placeholder in the JSON)

### Option B: Bring your own Google Cloud OAuth client (only if Option A is unavailable)

1. console.cloud.google.com → create a new project (any name)
2. **APIs & Services** → **Library** → search **Google Sheets API** → **Enable**
3. **APIs & Services** → **OAuth consent screen** → set to **External**, fill out app name + email, **Save and Continue** through screens
4. **Credentials** → **Create Credentials** → **OAuth Client ID** → Application Type: **Web Application**
5. **Authorized redirect URIs:** copy this from n8n's Google Sheets credential setup page (looks like `https://your-n8n-host/rest/oauth2-credential/callback`)
6. **Save** → you get a Client ID and Client Secret
7. Paste these into the n8n Google Sheets OAuth2 API credential
8. Click **Connect my Google Account** → sign in → authorize
9. Save the credential

---

## Step 3 — Share the sheet with the connected Google account

The OAuth account you used in Step 2 must have **Editor** access to the sheet.

If you signed in with the same Google account that created the sheet: nothing to do.

If different (e.g., service account or work account): open the sheet → **Share** → add the email → set **Editor** → **Send**.

---

## Step 4 — Set the env var

In n8n environment:

```
GSHEETS_OPS_SHEET_ID={the long id from step 1}
```

---

## Step 5 — Re-import the Conversion Agent workflow

1. n8n UI → **Workflows** → open existing **Conversion Agent**
2. **Import from File** → pick `build/n8n/05_conversion_agent.json`
3. Re-bind credentials:
   - All Supabase nodes: pick your `Supabase account`
   - Both Google Sheets nodes (`Append Visit`, `Append Booking`): pick `Google Sheets account` from Step 2
4. **Publish**

---

## Step 6 — End-to-end test

Trigger a visit outcome (use the existing `/webhook/visit-outcome` endpoint). Example: a completed visit with notes and a booking amount:

```bash
curl -X POST "https://{your-ngrok-url}/webhook/visit-outcome" \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": "{any_visit_uuid_from_visits_table}",
    "status": "Completed",
    "post_visit_notes": "Buyer loved the view, concerned about possession date. Will discuss with spouse this weekend. Booked Unit 1402 with ₹2 lakh token.",
    "unit_number": "1402",
    "booking_amount": 200000
  }'
```

Within ~10 seconds:

- Supabase: `agent_events` row for VISIT_COMPLETED, then BOOKING_MADE
- Google Sheets `Visits` tab: a new row at the bottom with sentiment, objections, summary, next_step
- Google Sheets `Bookings` tab: a new row with the booking amount and the sanity_check flag (this case: PASS or REVIEW depending on price band of the property)

You can keep the Google Sheet open in a side tab while testing — appended rows show up live without refresh.

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Workflow runs green but no row in sheet | OAuth account doesn't have Editor access | Share the sheet (Step 3) |
| `Sheet not found` | `GSHEETS_OPS_SHEET_ID` env var wrong, or tab name typo (`Visits` is case-sensitive) | Verify both |
| `Range too small` or columns shift | Headers in row 1 don't match the column names in the workflow | Re-paste the exact headers from Step 1 |
| 403 from Google | Sheets API not enabled in the Cloud project (Option B path) | Enable it |
| Token expired after weeks | OAuth refresh failed | Re-connect the credential in n8n |

---

## What this gives you

- The sales head's daily-reality interface: a Google Sheet with every visit and every booking, live-updating
- A familiar export path for any further analysis the developer's finance or marketing team wants
- Two streams kept in sync with Supabase, with `trace_id` carried through so you can join back to the agent journey
- Closes the concept brief's "Google Sheets" item for the Conversion Agent

This pattern (parallel-fan-out to Google Sheets after the canonical Supabase write) also generalises to the Lead Agent and Ad Agent if you want to mirror more data. Just add a `Google Sheets: Append X` node alongside any Supabase Insert in the workflow.
