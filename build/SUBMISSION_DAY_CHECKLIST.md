# Submission Day Checklist — Pentahouse Capstone

**Use this 15 minutes before clicking submit.** Anything that fails here, the reviewer will hit too.

---

## Tier 1 — must pass

- [ ] **All 7 Supabase migrations applied** in order: 0002, 0003, 0004, 0005, 0006, 0007
- [ ] `agent_events` table has columns: `trace_id`, `confidence`, `model_used`, `latency_ms`, `prompt_version` (verify with the SQL in migration 0005's comment)
- [ ] RPC `upsert_property` exists: `SELECT proname FROM pg_proc WHERE proname='upsert_property';` returns 1 row
- [ ] Table `meta_form_to_property` exists: `SELECT count(*) FROM meta_form_to_property;` succeeds (count can be 0)
- [ ] Dashboard renders without console errors: `cd build/dashboard && npm install && npm run dev`, open http://localhost:8080
- [ ] `CAPSTONE_SUBMISSION.md` opens and reads as the front door
- [ ] `docs/AGENT_AUDIT.md` opens — the credible technical depth document
- [ ] `docs/COMMERCIAL_THESIS.md` opens — the credible strategic depth document

## Tier 2 — strong-to-have

- [ ] All 6 n8n workflows imported and **published** (not just saved): Listing, Ad, Lead, Nurture, Conversion, Meta Lead Ingest
- [ ] Activity feed in dashboard shows at least 3 recent agent_logs rows
- [ ] One end-to-end test of the live WhatsApp loop (Nurture Agent draft → approve → Twilio → real phone)
- [ ] Meta Lead Ads test: hit `/webhook/meta-webhook` with the verify-token GET, get the challenge echoed back (proves the workflow is live)
- [ ] EspoCRM test: trigger a lead via curl, verify the row appears in EspoCRM
- [ ] Google Sheets test: trigger a visit outcome, verify a row appears in the Visits tab

## Tier 3 — nice-to-have

- [ ] Loom recording uploaded somewhere shareable (link in CAPSTONE_SUBMISSION.md)
- [ ] GitHub repo public + README polished
- [ ] `.env.example` exists with every var named (no secrets)
- [ ] Top-level README points at CAPSTONE_SUBMISSION.md as the entry point
- [ ] One pinned reviewer-facing diagram (architecture flow)

---

## Quick smoke commands

### Verify Supabase schema

```sql
-- Should return 5
SELECT count(*)
  FROM information_schema.columns
 WHERE table_name = 'agent_events'
   AND column_name IN ('trace_id','confidence','model_used','latency_ms','prompt_version');

-- Should return 1
SELECT count(*) FROM pg_proc WHERE proname = 'upsert_property';

-- Should return 1 (the v_agent_traces view)
SELECT count(*) FROM pg_views WHERE viewname = 'v_agent_traces';

-- Should return 1 (the v_meta_form_lookup view)
SELECT count(*) FROM pg_views WHERE viewname = 'v_meta_form_lookup';

-- Recent agent activity (proof it's live)
SELECT agent_name, action, status, created_at
  FROM agent_logs
 ORDER BY created_at DESC
 LIMIT 10;
```

### Verify n8n is responsive

```bash
# Hit each webhook with a HEAD or trivial GET — production should return non-error
curl -I "https://{your-ngrok-url}/webhook/new-lead"          # Lead Agent
curl -I "https://{your-ngrok-url}/webhook/sync-listing"      # Listing Agent
curl -I "https://{your-ngrok-url}/webhook/generate-ads"      # Ad Agent
curl -I "https://{your-ngrok-url}/webhook/visit-outcome"     # Conversion Agent
curl     "https://{your-ngrok-url}/webhook/meta-webhook?hub.mode=subscribe&hub.verify_token={your_token}&hub.challenge=ping"
# Last one should echo "ping"
```

### Verify dashboard is running

```bash
cd build/dashboard
npm run dev
# Open http://localhost:8080 — should show "Today" headline + activity feed
```

---

## If anything fails

| Failure | Triage |
|---|---|
| Migration error | Most likely an earlier one didn't apply. Check `pg_proc` and `information_schema` queries above. |
| n8n webhook returns 404 | Workflow not published. Open in editor → Publish toggle. |
| n8n webhook returns 500 | Open the execution log in n8n. The failing node's error is the answer. Likely env var missing or credential expired. |
| Dashboard 500 | `.env.local` missing or `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` not set. |
| Meta verify GET returns 403 | `META_VERIFY_TOKEN` env mismatch. |
| EspoCRM push returns 401 | API key wrong, or API user type isn't "API". |
| Google Sheets append silently no-ops | OAuth account doesn't have Editor on the sheet. |

---

## What "good enough to submit" looks like

You don't need every tier-3 item. You need:

1. The reviewer can open `CAPSTONE_SUBMISSION.md` and read the case study in 8 minutes.
2. The reviewer can click through to `AGENT_AUDIT.md`, `COMMERCIAL_THESIS.md`, `CHANGELOG_v2.md` and see real engineering + strategy depth.
3. The reviewer believes the integrations are real, not stubs (the runbooks + n8n JSON node configs prove this even without a live demo).
4. The submission is honest about what's deferred (Meta Marketing API outbound push, Google Ads API, WhatsApp Business Cloud API).

If all four of those are true, you have a defensible capstone. Submit.
