# Install & first-run runbook

Day-1 setup. 60–90 minutes start-to-finish if no accounts need creating.

## 0. Prereqs

- macOS (you are on this), Node.js 20+ (`node -v`), npm 10+ (`npm -v`).
- Accounts: Supabase (free), Google AI Studio (Gemini), Twilio (WhatsApp sandbox already configured), GitHub (for Lovable/Replit handoff if you go that route).
- `ngrok` for exposing localhost n8n to Twilio webhooks: `brew install ngrok && ngrok config add-authtoken <token>`.

## 1. Supabase

1. Create a new project at https://supabase.com/dashboard → "New project". Region: closest to India (Singapore).
2. Project Settings → API → copy `URL`, `anon` key, `service_role` key into `build/.env.local` per `docs/ENV_TEMPLATE.md`.
3. SQL Editor → "New query" → paste contents of `supabase/schema.sql` → Run. Verify "Success. No rows returned."
4. Repeat for `supabase/seed_properties.sql`, then `supabase/seed_campaigns.sql`, then `supabase/seed_leads.sql` (order matters because of FKs).
5. Table Editor → confirm: 15 properties, 30 leads, 15 eval rows, 18 lead_scores, 8 visits, 2 bookings, 9 messages, 10 agent_logs, 9 agent_events, 3 escalations.

## 2. n8n (local, npm — no Docker)

```bash
npm install -g n8n
n8n start
```

Opens at `http://localhost:5678`. Create the owner account on first run.

Settings → Credentials → add:
- "Supabase" with `URL` + `service_role` key
- "Google Gemini (PaLM) API" with `GEMINI_API_KEY`
- "Twilio" with `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
- HTTP Header Auth named `dashboard-callback` with header `X-Approval-Token` = your `N8N_APPROVAL_CALLBACK_TOKEN`

Then expose webhooks via ngrok in a separate terminal:

```bash
ngrok http 5678
```

Copy the `https://<id>.ngrok-free.app` into `N8N_WEBHOOK_BASE` and into the Twilio sandbox "When a message comes in" field, suffix `/webhook/whatsapp-inbound`.

## 3. Workflows

Day 3-4 deliverable. JSON exports will live in `build/n8n/*.json` for import via Workflows → "Import from File". One workflow per agent.

## 4. Next.js dashboard

Day 5-6+ deliverable. Generation strategy:

- **Lovable:** open https://lovable.dev → "New project" → paste `build/ui-handoff/LOVABLE_PROMPT.md` → "Connect Supabase" with the URL + anon key. Lovable will scaffold all six screens.
- **Replit Agent:** open https://replit.com → "Create with Agent" → paste the same prompt. Replit will generate a Next.js project; manually wire Supabase env vars on first run.

Either path: clone the resulting repo into `build/dashboard/` (or run inside the platform).

## 5. Smoke test (end-to-end)

1. Trigger Lead Agent webhook with a curl:
   ```bash
   curl -X POST $N8N_WEBHOOK_BASE/webhook/new-lead \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Lead","phone":"+919999999999","source":"Test","inquiry_text":"3BHK Whitefield 1.5Cr"}'
   ```
2. Confirm a row appears in `leads` and `lead_scores` within ~3s.
3. Open the Manager Approval screen → confirm a `pending_approval` message is queued.
4. Press `A` → confirm Twilio sandbox delivers to your verified WhatsApp number.

If any step fails, check `agent_logs` (status=error) and the n8n execution log.

## 6. Demo-day failsafes

- Set `NEXT_PUBLIC_DEMO_MODE=true` to serve `build/ui-handoff/demo-fallback.json` if any API is down.
- Pre-record the Twilio send segment as a Loom clip to insert if sandbox is throttled.
- Keep Supabase free-tier active by visiting the dashboard within 7 days of the demo.
