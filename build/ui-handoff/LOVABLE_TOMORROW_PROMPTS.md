# Lovable Prompts for Tomorrow (5-credit budget)

You have **5 credits** when Lovable resets in ~13 hours. The plan: spend them surgically. Do NOT chat iteratively with Lovable; paste these full prompts as-is, one per credit.

| Credit | Prompt | Purpose | Reserved as fallback |
|---|---|---|---|
| 1 | **Prompt A — Supabase Wiring** | Swap fixtures for live Supabase reads + realtime | |
| 2 | **Prompt B — Manager UX Polish** | Address "too technical" feedback | |
| 3 | **Prompt C1 (only if A errored)** | Targeted fix for whatever A missed | Burns 1 of 3 fallback credits |
| 4 | **Prompt C2 (only if B needs adjusting)** | Targeted UX fix | Burns 1 of 3 |
| 5 | **Prompt D — Approve-button wiring** | Point the Approve button at n8n ngrok webhook | Optional; can also do manually |

If A and B work first-try (likely with the careful prompts below), you keep 3 credits in reserve for the live-demo dress rehearsal day.

---

## PROMPT A — Supabase Wiring (paste as-is, do not edit)

```
Connect this app to my Supabase project "RE Marketing Agent" (project ref: grfqzwozyhuysincordf). Do ALL of the following in this single response. Do not ask follow-up questions.

1. Generate a Supabase client at src/lib/supabase.ts using @supabase/supabase-js and the publishable/anon key from environment variables. Export a single named `supabase` client. Install @supabase/supabase-js if not already a dependency.

2. Generate TypeScript types from the live Supabase schema and place them at src/types/database.ts. Use these types in the queries below.

3. Rewrite src/lib/data.ts to read from Supabase instead of src/lib/fixtures.ts. KEEP EVERY EXPORTED FUNCTION SIGNATURE EXACTLY THE SAME. The components depend on the names and shapes. Implementations:

   - getLeadQueue() returns supabase.from('v_lead_queue').select('*').order('overall_score', { ascending: false, nullsFirst: false })
   - getLead(id) returns supabase.from('v_lead_queue').select('*').eq('lead_id', id).maybeSingle()
   - getMessages(leadId) returns supabase.from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true })
   - getPendingApprovals() returns supabase.from('messages').select('*, leads!inner(name, source, stage, language)').eq('status', 'pending_approval').order('created_at', { ascending: false })
   - getVisits(leadId?) returns supabase.from('visits').select('*').eq('lead_id', leadId) when leadId provided, else select all without filter
   - getEscalations() returns supabase.from('escalations').select('*, leads!inner(name)').in('status', ['open','acknowledged']).order('created_at', { ascending: false })
   - getAgentLogs(limit = 50) returns supabase.from('agent_logs').select('*, leads(name)').order('created_at', { ascending: false }).limit(limit)
   - getAgentEvents() returns supabase.from('agent_events').select('event_name'), then in JS reduce to {event_name, count} pairs
   - getSourceROI() returns supabase.from('v_source_roi').select('*').order('cost_per_booking', { ascending: true, nullsFirst: false })
   - getProperties() returns supabase.from('properties').select('*').eq('status', 'Active')
   - getPrimaryMetric() returns supabase.from('v_primary_metric').select('*').limit(100)
   - getKPIs() derives in JS from a small fetch: { leads_today, leads_yesterday, pending_approvals, weekly_conversion_pct }. Compute from leads + messages + bookings tables.
   - getEvalAccuracy() joins lead_scores with eval_ground_truth on lead_id and returns { percent, matches, total } where a match is recommended_action equality.

4. Mutation functions update Supabase directly (no Twilio yet, that comes via n8n later):
   - approveMessage(id) -> UPDATE messages SET status='sent', sent_at=now(), approved_by='priya@dev.in' WHERE id=$id
   - rejectMessage(id, reason) -> UPDATE messages SET status='rejected', rejection_reason=$reason WHERE id=$id
   - editAndApproveMessage(id, newContent) -> UPDATE messages SET content=$newContent, status='sent', sent_at=now(), approved_by='priya@dev.in' WHERE id=$id

5. In the /approvals page component, add a Supabase Realtime subscription on the messages table filtered by status='pending_approval'. On INSERT, prepend to the queue with a 200ms fade-in transition and show a shadcn toast "New draft from Nurture Agent". On UPDATE where status changes away from pending_approval, remove from queue. Unsubscribe in cleanup.

6. Delete src/lib/fixtures.ts. Remove every import of it. The migration is not complete if any file still references fixtures.

7. At the end, summarize: which files you created, which you updated, which you deleted, and whether TypeScript reports zero errors. If you encountered any issue, say so explicitly rather than silently skipping.

Use the env vars exactly named NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or the Vite equivalent if this is a Vite project; auto-detect from the existing config).
```

---

## PROMPT B — Manager UX Polish (paste after A succeeds)

```
The current dashboard looks too technical for the target user: an inside sales manager at an Indian real estate developer (persona: Priya, 5-20 sales executives reporting to her, runs operations from her phone/laptop, not a power user of dashboards). Rebuild the visual language to feel like a sales command center for her, not an admin panel for an engineer.

Apply these changes across all 6 screens. Do them in one pass.

LANGUAGE CHANGES (find-and-replace across all components):
- "Fit Score" -> "Match"
- "Urgency Score" -> "Heat"
- "Overall Score" -> "Priority"
- "Confidence" -> "Confidence" (keep, but show only when below 70 as a yellow warning chip, never on hot leads)
- "Recommended Action" -> "What to do next"
- "Lead Queue" -> "Today's calls"
- "Pipeline" -> "My deals"
- "Manager Approval" -> "Messages to send"
- "Source ROI" -> "Where wins come from"
- "Command Center" -> "Today"
- "Escalations" -> "Hot escalations" (when there are any) or hide the empty state
- "agent_logs" / "Agent Activity Feed" -> "What just happened"

DENSITY CHANGES:
- KPI cards on / (Today): make them taller, with the number filling more vertical space and a one-line plain-English insight underneath ("47s. Industry average is 4 hours. You're 300x faster.")
- Pipeline screen: default to a stacked card list grouped by recommended action, not a Kanban. Kanban becomes a secondary view toggle.
- Lead detail: collapse the score panel by default. Surface the conversation thread and the next-action CTA as the primary content.
- Approvals: keep the two-pane, but the left queue items should be larger cards (60-80px tall) with the lead's first name HUGE, project subtle, score as a colored dot (green/amber/red) not a number.

ACTION-FIRST CTAS:
- Every lead card has a single visually dominant CTA matching what to do next ("Call Rahul", "Send brochure", "Book site visit"), not generic "View details".
- The CTA opens a Sheet (slide-out) with: WhatsApp thread, a phone-shaped Call button (use `tel:` link), and the "Mark as called" / "Send message" actions.

VISUAL TONE:
- Heat indicator on every card: small fire icon (🔥 if Heat > 80, ⏱️ if 50-80, 💤 if < 50). Color the card border to match: rose for hot, amber for warm, slate for cold.
- Avatar circles with initials on every lead.
- Use the WhatsApp green (#25D366) for outbound messages, soft grey (#ECE5DD background, dark text) for inbound. Phone-frame aesthetic.
- Replace plain numerical tables in /analytics with ranked horizontal bar visualizations. Numbers still visible on hover.

MOBILE-FRIENDLY ON DESKTOP:
- Max content width 900px even on wide screens. No 2000px-wide tables.
- Sidebar collapses to icon-only on screens narrower than 1100px.
- Every interaction should be one-handed-thumb feasible: bottom-aligned action bars on Sheets, primary CTA always within thumb reach on mobile preview.

HUMAN COPY (sample applied throughout):
- Empty state on /approvals: "No drafts waiting. You're on top of it. 👏"
- Empty state on Today's calls: "Nothing to call right now. Take a break."
- Toast on approve: "Sent to Rahul on WhatsApp." (use the real first name)
- Confirmation on reject: "Skipped. We won't draft this style again."

DO NOT change the data layer. src/lib/data.ts stays exactly as it is from Prompt A. Only the visual + copy layers change.

DO NOT break the A/E/R keyboard shortcuts on /approvals.

Summarize at the end which screens you touched and what the biggest visual change is on each.
```

---

## PROMPT C1 — Targeted Supabase fix (only if A had issues)

```
The Supabase migration from Prompt A had this issue: [PASTE THE SPECIFIC ERROR OR FILE NAME HERE]

Fix only that. Do not refactor unrelated code. Verify the fix by running through the affected component's data path mentally and confirming the query shape matches the schema.

Schema reference if needed: tables are properties, leads, lead_scores, messages, visits, bookings, campaigns, agent_logs, agent_events, escalations, eval_ground_truth, visit_slots. Views are v_lead_queue, v_source_roi, v_primary_metric.
```

---

## PROMPT C2 — Targeted UX fix (only if B needs adjusting)

```
The UX polish from Prompt B has this issue: [DESCRIBE THE SPECIFIC SCREEN OR COMPONENT THAT FEELS OFF]

Fix only that. Keep all other Prompt B changes intact. Constraint reminder: Priya is a non-technical sales manager who runs from her phone, the visual language should feel like a WhatsApp-native command center.
```

---

## PROMPT D — Approve button wires to n8n (only if Nurture Agent is ready)

```
Update the approveMessage(id) function in src/lib/data.ts. Instead of doing a direct Supabase UPDATE, POST to the n8n approval webhook:

URL: ${process.env.NEXT_PUBLIC_N8N_APPROVAL_ENDPOINT}
Method: POST
Headers:
  - Content-Type: application/json
  - X-Approval-Token: ${process.env.NEXT_PUBLIC_N8N_APPROVAL_TOKEN}
Body: { "message_id": id, "action": "approve" }

On 200 response, return success. On any non-2xx, throw an error caught by the caller (which shows a toast).

Also update rejectMessage and editAndApproveMessage to POST similarly with action='reject' and action='edit_approve' respectively. The edit one includes new_content in the body.

Add these two env vars to the project configuration:
- NEXT_PUBLIC_N8N_APPROVAL_ENDPOINT (the ngrok HTTPS URL + /webhook/approve-message)
- NEXT_PUBLIC_N8N_APPROVAL_TOKEN (the same value as the n8n Header Auth credential called dashboard-callback)

Do not change anything else.
```

---

## Order of operations tomorrow morning

1. Lovable credits reset
2. Open Lovable → paste **Prompt A** → wait for completion → verify with reload
3. Open Supabase Table Editor and run the realtime test (INSERT INTO messages...) to confirm the realtime subscription works
4. Paste **Prompt B** → wait for completion → reload preview, walk through all 6 screens, check the language and density changes landed
5. If anything broken: fire **Prompt C1** or **C2** as targeted fixes
6. **Prompt D** is only worth firing once Nurture Agent workflow is imported + tested in n8n (see build/n8n/04_nurture_agent.json that's being prepared now)

If you used all 5 credits and still have issues, fall back to Path A from yesterday: export to GitHub, clone locally, edit by hand.
