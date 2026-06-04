# Platform-specific tips (Lovable + Replit)

> **Applies to both phases:** the frontend-only build (`FRONTEND_ONLY_PROMPT.md`) and the Supabase-wired build (`LOVABLE_PROMPT.md`).

# Replit Agent — variant notes

Either prompt works as-is in Replit Agent. A few Replit-specific tips:

- After Replit scaffolds the project, open the **Secrets** pane (lock icon) and add every variable from `docs/ENV_TEMPLATE.md`. Replit does not read `.env.local` automatically the way local Next.js does.
- Replit's preview runs on a `*.replit.dev` URL. Add that exact URL to Supabase → Authentication → URL Configuration → Site URL + Redirect URLs (even though we are auth-less for the demo, the realtime channel will check origin).
- Twilio webhooks: do not point Twilio at the Replit URL during demo because cold-starts add latency. Keep n8n local + ngrok for the WhatsApp leg; the dashboard on Replit only writes to Supabase and POSTs to ngrok'd n8n.
- If Replit Agent stalls on large generations, paste the prompt screen-by-screen: first Command Center + Pipeline, then Approvals, then Detail + Visits + Analytics. Each screen is independent.

# Lovable — variant notes

- "Connect Supabase" picks up the schema automatically; verify it sees all 12 tables + 3 views before generating screens.
- Lovable defaults to React Router. Push it to App Router with: "Use Next.js App Router (`app/` directory), not Pages Router."
- The Realtime channel for `messages` needs the table to be added to the `supabase_realtime` publication. In Supabase SQL Editor run once:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE messages, agent_logs, escalations;
  ```
- Once generated, export to GitHub and clone into `build/dashboard/` for local iteration. Lovable's hosted preview is great for showing the manager flow on demo day as a backup.
