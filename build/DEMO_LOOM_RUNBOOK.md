# Pentahouse — Demo & Loom Recording Runbook

Three short Loom videos, one per persona, each showing the happy path. Record at 1280×720+, hide bookmarks, zoom browser to ~110% so text is legible.

---

## Where the data comes from (read this first)

The dashboard reads everything from **Supabase**. There are two ways data gets there:

1. **Seed data (your demo baseline).** SQL files load ~10 leads that have *already been scored by the Lead Agent*, plus their messages, visits, and one booking. This is what fills the pipelines, the approval queue, and the analytics so the screens aren't empty.
2. **Live, through the Lead Agent.** When you fire a test lead (the "Try a real lead" panel on the Sales Head's Today, or a `curl` to `/webhook/new-lead`), the Lead Agent runs for real — RAG match, score, route — and writes a fresh row to Supabase. This is how you *show the agent working* on camera.

The rep's **"My deals" is empty until leads are assigned to them**, by design (a rep only sees their own book). That's the only setup gotcha — fixed in step 4 below.

---

## One-time setup before recording (~10 min)

1. **Start the services.** n8n running (`http://localhost:5678`, all 7 workflows Active), and the dashboard (`npm run dev` in `build/dashboard`).
2. **Load the schema + data.** In Supabase SQL Editor, run in order: `schema.sql` → every file in `migrations/` → `seeds/0001_demo_funnel.sql`.
3. **Create the three personas.** On `/signup`, sign up each (sign out between):
   - Priya Rao — `head@pentahouse.demo`
   - Rohit Joshi — `rohit@pentahouse.demo`
   - Meera Patel — `meera@pentahouse.demo`
   Then run `seeds/0002_demo_personas.sql` (sets their roles).
4. **Give the rep a pipeline.** Run `seeds/0003_assign_demo_leads_to_rep.sql` — assigns 6 scored leads to the rep so "My deals" is populated. (This is the fix for the empty screen.)
5. **Verify.** Log in as each persona for 5 seconds: Head's Today shows leads + escalations; Rohit's "My deals" shows 6 cards; Meera's Today shows channel numbers.

> If "My deals" is still empty: you either skipped `0001` (no leads exist) or `0003` (none assigned), or signed Rohit up with a different email — `0003` is email-agnostic so just re-run it.

---

## Recording 1 — Sales Rep (Rohit) · ~2.5 min

**Log in as** `rohit@pentahouse.demo`. The story: *"I'm a rep. The system tells me who to call and writes the message for me."*

| # | Do this | Say roughly | Proves |
|---|---|---|---|
| 1 | Land on **Today**. Point at "Call these first." | "I start my day here — the system already ranked who's worth my time." | Lead Agent's scoring drives a ranked worklist |
| 2 | Read one row's plain line + status pill. | "No spreadsheets — just who, what they want, and how good a match." | Non-technical, explainable |
| 3 | Click **Open** on the top lead. | "It tells me plainly: yes, call now — strong match, ready to move." | Lead detail / explainable scoring |
| 4 | Point at "What she wants" + the amber **Still to ask** chips. | "Here's her intent, and what we still need to ask." | Intent capture + gap-fill story |
| 5 | Go to **Messages to send**. Open one draft. | "When a lead needs a nudge, the reply is already written for me to approve." | Nurture Agent draft + rep approval |
| 6 | Click **Approve & send** (or A). | "I approve — it goes out on WhatsApp. Nothing sends without me." | Human-in-the-loop, rep owns approvals |
| 7 | Open **My deals**, drag a card a stage forward. | "And I manage my pipeline by dragging cards." | Pipeline ownership |

End line: *"The rep just works a clean, ranked list — the AI did the thinking."*

---

## Recording 2 — Sales Head (Priya) · ~3 min  *(best one to show the Lead Agent live)*

**Log in as** `head@pentahouse.demo`. The story: *"I run the floor. I don't approve every message — I handle the exceptions and watch the funnel."*

| # | Do this | Say roughly | Proves |
|---|---|---|---|
| 1 | Land on **Today**. Read the KPI strip. | "First-reply speed, new leads, and what needs me." | Floor oversight |
| 2 | Point at **"Escalations for you"** KPI + the Escalations panel. | "My reps approve the routine messages. I only get the exceptions — big-budget or low-confidence leads." | The role split |
| 3 | **Fire a live lead:** in "Try a real lead", click **Fire test lead**. | "Watch the Lead Agent actually run." | **The agent working live** |
| 4 | Wait ~5s, point at the score that appears + the activity feed. | "In seconds it matched inventory, scored fit and urgency, and decided the next step." | RAG + scoring + routing, real-time |
| 5 | Open that lead → show the score breakdown + reasons. | "And it explains *why* — not a black box." | Explainable AI |
| 6 | Open one **Escalation** → Open lead. | "When it's unsure or high-value, it escalates to me instead of guessing." | Decisive routing + trust |
| 7 | Go to **Where wins come from**. | "And I can trace every booking back to the channel that paid for it." | Attribution |

End line: *"The head handles judgment calls; the agents handle the volume."*

---

## Recording 3 — Marketing (Meera) · ~2.5 min

**Log in as** `meera@pentahouse.demo`. The story: *"I spend the money. I need to know what converts."*

| # | Do this | Say roughly | Proves |
|---|---|---|---|
| 1 | Land on **Today**. | "My view is just my world — no sales-floor noise." | Persona-scoped UI |
| 2 | Read the KPIs + "Leads by channel" chart. | "Leads, visits, bookings, and which channel is best value." | Marketing metrics, plain language |
| 3 | Open **Where wins come from**. | "Every booking traced to a channel — Meta is my best value, 99acres I should watch." | Source-to-booking attribution |
| 4 | Open **Creative approvals**. Read the "what this assistant does" strip. | "The Ad Agent drafts ready-to-run creative for Meta, Google and portals." | Ad Agent value, honestly framed |
| 5 | Open a draft → **Approve creative**. | "I approve the copy, audience and budget — and paste it into Ads Manager." | Honest scope (no live API yet) |
| 6 | Open **Inventory** → a project → show generated ads. | "All grounded in the real project the Listing Agent verified." | Listing + Ad agents |

End line: *"Marketing finally sees which rupee made which booking."*

---

## Recording tips

- **Order:** record Rep first (simplest), then Head (has the live moment), then Marketing.
- **The live lead** (Head, scene 3) is the single most impressive beat — make sure n8n is up and the Lead Agent workflow is Active before you hit record, and do a throwaway test fire first.
- Keep each video **under 3 minutes**. One persona, one happy path, no dead ends.
- If a screen looks empty mid-record, stop — it means a seed didn't load; re-run the setup, don't narrate around it.
- Use the keyboard shortcuts on the approvals screen (A / E / R) — they look slick on camera.
