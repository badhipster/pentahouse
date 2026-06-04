# EspoCRM Setup — Pentahouse

**File modified:** `build/n8n/03_lead_agent.json` (two new nodes added: `HTTP: Push to EspoCRM`, `Supabase: Log EspoCRM Push`)
**Time to wire:** 10-15 minutes
**Cost:** ₹0 (cloud free tier) or self-hosted

EspoCRM is an open-source CRM with a clean REST API. We push every scored lead to it so a customer who already lives in EspoCRM (or any compatible CRM) sees Pentahouse-enriched leads automatically.

---

## Fastest path: EspoCRM Cloud (free trial)

1. Go to **espocrm.com** → **Try Cloud** (top right)
2. Sign up with your email. You get a free 30-day trial at `https://{yourname}.espocrm.com`
3. After login, you land on the Dashboard

## Alternative: Self-hosted

```bash
docker run -d --name espocrm \
  -e ESPOCRM_DATABASE_PASSWORD=changeme \
  -e ESPOCRM_ADMIN_USERNAME=admin \
  -e ESPOCRM_ADMIN_PASSWORD=changeme \
  -p 8080:80 espocrm/espocrm
# Then visit http://localhost:8080
```

---

## Step 1 — Create an API User

1. Top-right → click your avatar → **Administration**
2. **Users** → **Create User** (top right)
3. Settings:
   - **User Type:** `API`
   - **Auth Method:** `API Key`
   - **First Name:** `Pentahouse`
   - **Last Name:** `Webhook`
   - **Username:** `pentahouse_api`
4. **Save**
5. After save, the page shows the **API Key** (a long random string). **Copy it now.** It is shown once.

---

## Step 2 — Grant the API User access to Leads

1. **Administration** → **Roles** → **Create Role** (top right)
2. **Name:** `Pentahouse Webhook Role`
3. **Scope Level** section:
   - Find **Lead** in the grid
   - Set Access: **enabled**
   - Set Create: **all**
   - Set Read: **all**
   - Set Edit: **all** (so we can update if the same email appears twice)
   - Set Delete: **no**
4. **Save**
5. Go back to the `pentahouse_api` user → **Edit** → **Roles** section → add `Pentahouse Webhook Role` → **Save**

---

## Step 3 — Test the API from a terminal

Replace `{your_espo_url}` with your EspoCRM URL (e.g. `https://yourname.espocrm.com` or `http://localhost:8080`) and `{your_api_key}` with the key from Step 1:

```bash
curl -X POST "{your_espo_url}/api/v1/Lead" \
  -H "X-Api-Key: {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Buyer",
    "emailAddress": "test@buyer.com",
    "phoneNumber": "+919876543210",
    "source": "Web Site",
    "status": "New",
    "description": "Pentahouse smoke test"
  }'
```

Expected: a JSON response with the new lead `id`. Then visit EspoCRM → **Leads** in the sidebar → see "Test Buyer" at the top.

If you get 401: API key wrong or User Type isn't `API`. If 403: Role permissions missing. Fix and retry.

---

## Step 4 — Wire the n8n environment variables

In n8n `.env` (or n8n UI → Settings → Environment Variables):

```
ESPO_URL=https://{yourname}.espocrm.com    # NO trailing slash
ESPO_API_KEY={your_api_key_from_step_1}
```

Restart n8n if needed.

---

## Step 5 — Re-import the Lead Agent workflow

The Lead Agent JSON now has two extra nodes after `Supabase: Insert Lead Score`:

- `HTTP: Push to EspoCRM` — POSTs the lead with mapping
- `Supabase: Log EspoCRM Push` — logs whether the push succeeded

To deploy:

1. n8n UI → **Workflows** → open existing **Lead Agent**
2. **Import from File** → pick `build/n8n/03_lead_agent.json`
3. Re-bind `Supabase account` credential on all Supabase nodes (the new log node included)
4. The HTTP push node doesn't need a credential — it uses env vars
5. **Publish**

---

## Step 6 — End-to-end test

Trigger a Lead Agent run by POSTing to your existing new-lead webhook:

```bash
curl -X POST "https://{your-ngrok-url}/webhook/new-lead" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "phone": "+919811112222",
    "email": "priya.s@example.com",
    "source": "Meta Ad",
    "inquiry_text": "Looking for 3BHK in Mumbai, budget ~2.5 Cr, ready to move by Dec 2026",
    "interested_project": null,
    "preferred_city": "Mumbai",
    "preferred_config": "3BHK",
    "budget_lakhs": 250
  }'
```

Within a few seconds:

- Pentahouse activity feed shows the LEAD_SCORED event
- EspoCRM → Leads tab shows **Priya Sharma** with:
  - Source: Web Site
  - Status: "Assigned" or "In Process" (depends on Pentahouse score)
  - Description: includes Pentahouse score, recommended action, matched property
  - Opportunity Amount: ₹2,50,00,000 (250 lakhs)
- Supabase `agent_logs` shows the `espo_pushed` row with the EspoCRM lead id

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Lead Agent runs fine but no EspoCRM row appears | `ESPO_URL` or `ESPO_API_KEY` env var missing → HTTP node returns 404/401 (silently because neverError=true) | Check `agent_logs.output_summary` row with status `warning` |
| 401 Unauthorized | Wrong API key OR API user is "Regular" type not "API" | Recreate user with User Type = API |
| 403 Forbidden | Role doesn't grant Create on Lead | Step 2 |
| Phone numbers look mangled | EspoCRM expects single-string phones, not arrays | Already handled in the node mapping |
| `source` value rejected | EspoCRM uses a closed enum: "Call", "Email", "Existing Customer", "Partner", "Public Relations", "Web Site", "Campaign", "Other" | Our mapping in the node converts our sources to these. To add new ones, edit EspoCRM Administration → Layout Manager → Lead → Source field options |

---

## What this gives you

- Every Pentahouse-scored lead lands in EspoCRM automatically
- A real CRM integration in the loop (closes the concept brief's "CRM integration" item)
- Cleanly testable against either EspoCRM cloud or self-hosted Docker
- The same pattern (`X-Api-Key` header + REST POST) will work against LeadSquared, Sell.do, HubSpot, Zoho CRM, Pipedrive — just swap the URL and adjust the field mapping
- No data lock-in: Pentahouse remains the source of truth; EspoCRM is a sink
