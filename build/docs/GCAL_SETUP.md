# Google Calendar Setup — Pentahouse Visit Booking

**File:** `build/n8n/07_visit_calendar.json`
**Migration:** `build/supabase/migrations/0011_visit_calendar_fields.sql`
**Time to wire:** 15 minutes
**Cost:** ₹0

When a site visit is scheduled in Pentahouse (via dashboard, Nurture Agent confirmation, or direct API), this workflow creates a Google Calendar event on the sales rep's calendar AND emails an .ics invite to the buyer. The Calendar event id + URL get persisted to the `visits` row so the dashboard can show "View in Calendar" links and a future workflow can update/cancel the event when the visit status changes.

This closes the concept-brief "Booking APIs" line item for the Conversion Agent.

---

## Step 1 — Apply migration 0011

```
build/supabase/migrations/0011_visit_calendar_fields.sql
```

Adds `calendar_event_id`, `calendar_event_url`, `calendar_provider`, `attendee_email` columns to the `visits` table. Additive only.

Verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'visits' AND column_name LIKE 'calendar_%';
-- Expect 3 rows: calendar_event_id, calendar_event_url, calendar_provider
```

---

## Step 2 — Connect Google Calendar in n8n

n8n has a native Google Calendar OAuth credential. Either path works:

### Path A — n8n Cloud or pre-configured Google client

1. n8n → **Credentials** → **+ Add Credential**
2. Type: **Google Calendar OAuth2 API**
3. Click **Sign in with Google** → pick the Google account that owns the rep's calendar
4. Authorize the requested scopes (calendar.events read/write)
5. Save the credential. Name it `Google Calendar account` (matches the placeholder in the JSON)

### Path B — Bring your own Google Cloud OAuth client

Only needed if Path A's button is missing (some self-hosted n8n setups).

1. console.cloud.google.com → reuse the same project you used for Google Sheets if any
2. **APIs & Services** → **Library** → enable **Google Calendar API**
3. **Credentials** → **Create Credentials** → **OAuth Client ID** → **Web Application**
4. **Authorized redirect URIs:** copy from n8n's Google Calendar credential setup page (looks like `https://your-n8n-host/rest/oauth2-credential/callback`)
5. Save → grab Client ID + Client Secret
6. Paste both into n8n's Google Calendar OAuth2 API credential
7. Click **Sign in with Google** in n8n → authorize → save

---

## Step 3 — Decide which calendar gets the events

The workflow writes to `calendars/primary/events` — that's the **primary calendar of the connected Google account**. So whoever's account is connected in Step 2 sees the events.

For pilot deployment, this is usually the sales head's own calendar (so she sees every visit her team books) OR a shared "Site Visits" calendar (so the whole floor can view).

If you want a SHARED calendar instead of primary:

1. In Google Calendar, create a new calendar called "Pentahouse Site Visits"
2. Share it with all your reps (Edit access)
3. From the calendar's settings, copy its Calendar ID (looks like `xxxxxxxxx@group.calendar.google.com`)
4. In n8n, open `Google Calendar: Create Event` node → change the URL field from:

   ```
   https://www.googleapis.com/calendar/v3/calendars/primary/events
   ```

   to:

   ```
   https://www.googleapis.com/calendar/v3/calendars/{paste_calendar_id_here}/events
   ```

5. Save and re-publish

---

## Step 4 — Import + activate the workflow

1. n8n → **Workflows** → **+ Add workflow** → **Import from File**
2. Pick `build/n8n/07_visit_calendar.json`
3. Rebind credentials on every node showing `REPLACE_AFTER_IMPORT`:
   - All Supabase nodes → your Supabase account
   - `Google Calendar: Create Event` → your Google Calendar account from Step 2
4. Toggle **Active** ON → click **Publish**

---

## Step 5 — Smoke test

You need an existing visit row to update. Quick way to create one:

```sql
-- Pick any active lead and any active property
WITH l AS (SELECT id FROM leads ORDER BY created_at DESC LIMIT 1),
     p AS (SELECT id FROM properties WHERE status = 'Active' LIMIT 1)
INSERT INTO visits (lead_id, property_id, scheduled_date, scheduled_time, status, assigned_to)
SELECT l.id, p.id, (CURRENT_DATE + 2)::text, '15:00', 'Scheduled', 'Demo Rep'
FROM l, p
RETURNING id;
```

Copy the returned `id` (a UUID), then fire the webhook:

```bash
curl -X POST "https://perennial-purifier-musty.ngrok-free.dev/webhook/schedule-visit" \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": "PASTE_VISIT_UUID_HERE",
    "assigned_rep_email": "your.email@gmail.com",
    "duration_minutes": 90
  }'
```

Within ~5 seconds:

- **Your Google Calendar** shows a new event 2 days from now at 3:00 PM titled `Site visit · {project_name} · {lead_name}` with the full sales briefing in the description
- **You get an .ics invite** in your inbox
- **Supabase `visits` row** now has `calendar_event_id` + `calendar_event_url` populated:

  ```sql
  SELECT calendar_event_id, calendar_event_url, status FROM visits WHERE id = 'PASTE_VISIT_UUID_HERE';
  ```

- **agent_events** has a VISIT_SCHEDULED row with the calendar payload
- **agent_logs** has a `calendar_event_created` row with status `ok`

---

## Step 6 — Wire into dashboard (optional polish)

The dashboard's `/visits` page can now show a "View in Calendar" link. The data is already in `visits.calendar_event_url`. Future task.

---

## How this gets triggered in production

Three trigger paths, all already wired or wireable:

### Path 1 — Dashboard schedule click

When a manager confirms a slot via the Visits page, the dashboard calls this webhook. Frontend code in `routes/visits.tsx` already has a slot picker — adding the call is one line:

```ts
await fetch(`${VITE_N8N_BASE_URL}/webhook/schedule-visit`, {
  method: 'POST',
  body: JSON.stringify({ visit_id: v.id, assigned_rep_email: rep.email })
});
```

### Path 2 — Nurture Agent auto-confirmation

When a buyer's WhatsApp reply is parsed as confirming a slot, the Nurture Agent (`04_nurture_agent.json`) can chain into this webhook automatically. Add an HTTP node that POSTs to `/webhook/schedule-visit` after the visit row is created. v2 phase 1 enhancement.

### Path 3 — Public scheduling page (v2)

A future booking page where the buyer picks their own slot. Same webhook, no other agent in the loop.

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Calendar event created but no email invite | `sendUpdates=all` query param missing OR rep account lacks "send-as" permission for shared calendar | Already in our workflow. If shared calendar, ensure connected account has Make Changes permission. |
| Event appears at wrong time | scheduled_time parsed wrong (e.g., "3pm" instead of "15:00") OR timezone confusion | Workflow enforces `Asia/Kolkata` and expects `HH:MM` 24h format |
| 401 Unauthorized from Calendar API | Google OAuth credential not refreshed | Re-authenticate in n8n: open credential → Sign in with Google again |
| 403 with `quotaExceeded` | Calendar API quota hit (1M requests/day per project; pilot won't hit this) | Wait, then add billing to your GCP project |
| `calendar_event_id` is null in visits row | Calendar create failed; check `agent_logs` for `calendar_event_created` with status `error` | Look at the `calendar_error` payload field |

---

## What this gives you

- Real "Booking API" integration closing the concept-brief Conversion Agent tool list
- Sales rep sees every visit on their calendar with full buyer context (not just "site visit 3pm")
- Buyer gets an .ics invite they can add to their phone calendar — drastically reduces no-show rate
- Calendar event id persisted for future reschedule/cancel workflows
- Manager visibility: if calendar is shared, the whole sales floor sees the upcoming visit pipeline as a normal Google Calendar week view

This pattern (n8n HTTP → Google Calendar API + Supabase persist + agent_events emit) also generalises to:
- Calendly integration (swap Calendar API for Calendly's)
- Microsoft 365 calendars (swap API + auth)
- Direct booking on the buyer's calendar (with their OAuth)
