# Agent Audit — Pentahouse v1 → v2

**Framing:** Audit performed by PM (as if working at MagicBricks / 99acres at scale), applying the `ai-agent-builder` skill's framework: agent type, tools, memory, multi-step reasoning, hand-off contracts, error paths, observability.

**Scope of "scale" thinking:** A real-world deployment runs 50+ developer tenants, 500+ active campaigns at any time, 5,000+ leads per day, 200,000+ ad form impressions per day. Every shortcut in v1 becomes a bottleneck at this scale.

---

## Part 1 — The Instagram form → Booking flow (reality check)

### What actually happens in real life

```
A) Rahul is scrolling Instagram at 11:47 PM in Powai.
B) He sees a Meta-served carousel ad: "Lower Parel sea-view homes from Lodha."
C) He taps "Learn more".
D) Meta opens the Lead Ad form INSIDE Instagram (not a redirect to a landing page).
E) Form has 5 fields:
    1. Full name        (autofilled from his Meta profile)
    2. Phone            (autofilled, masked, he confirms)
    3. Email            (autofilled)
    4. BHK preference   (custom question: 2BHK | 3BHK | 4BHK)
    5. Budget range     (custom question: <2Cr | 2-4Cr | 4Cr+)
F) He submits.
G) Meta stores the lead in their system and shows him a "Thank you" screen with our
   CTA (e.g., "View brochure" linking to the developer's site).
H) Meta fires a webhook to the URL we configured in our Meta App's webhook settings.
I) Webhook payload includes:
       leadgen_id        (unique per submission)
       form_id           (which form was filled)
       ad_id, adset_id, campaign_id  (Meta's attribution)
       created_time
   But CRUCIALLY: the payload does NOT include Rahul's name or phone.
J) We MUST make a second authenticated call to Meta's Graph API:
       GET /v18.0/{leadgen_id}?access_token={page_access_token}
   to retrieve the field_data array (name, email, phone, custom answers).
K) Our system creates a lead row with:
       source        = "Meta Ad"
       campaign_id   = mapped from Meta's ad_id (NOT campaign_id — Meta has a 3-tier
                        Campaign → AdSet → Ad hierarchy; the AD is what produced
                        this lead)
       interested_project = derived from form_id → property mapping
L) Lead Agent scores, Nurture Agent drafts, Priya approves, Twilio sends.
```

### Who configures the form?

| Layer | Who | What they touch | When |
|---|---|---|---|
| Meta Business Account | The developer (or their ads agency) | Set up the Business Manager, link the Ads account, link the Page | Once, at onboarding |
| Meta App Permissions | Pentahouse (us) | App with scopes: `ads_management`, `leads_retrieval`, `business_management`, `pages_show_list`, `pages_manage_ads`. Submit for App Review (4-8 weeks) | Once, before launch |
| OAuth grant | Anjali | Click "Connect Meta Business" in Pentahouse → redirect → grant our app the role of Ad Account Admin on her developer's Business Manager | Once per developer onboarding |
| Lead form definition | Anjali OR our Ad Agent | A Lead Form in Meta has: intro card → 1-5 questions → privacy notice → completion CTA. v1 path: Anjali builds it in Meta Ads Manager UI. v2 path: our Ad Agent generates a form template per property and pushes it via Graph API | Per property, when launching ads |
| Webhook subscription | Pentahouse | Subscribe our webhook URL to the `leadgen` event on each connected Page | Once per Page, at connection time |
| Form ↔ Property mapping | Pentahouse | Store `meta_form_id → property_id` in our database so when a lead arrives we know which project they inquired about | At ad-launch time, by Ad Agent |

### What our v1 has vs what it lacks

| Capability | v1 status | v2 must build |
|---|---|---|
| Property record in DB | ✅ | (kept) |
| Ad copy generation | ✅ (Gemini, simulated) | (kept) |
| Push ad to Meta Marketing API | ❌ (we only insert into our own `campaigns` table) | New: Meta Marketing API client |
| Build Meta Lead Form schema | ❌ | New: Form template builder + Graph API push |
| Receive Meta Lead webhook | ❌ (we curl-simulate `/webhook/new-lead`) | New: webhook endpoint with HMAC signature verification |
| Fetch lead fields via Graph API | ❌ | New: Graph API client with page-access-token refresh |
| Map Meta lead → our property | ❌ | New: `meta_form_to_property` table + lookup |
| Token storage + refresh | ❌ | New: per-tenant encrypted token store (long-lived page tokens + refresh) |
| Rate limit + retry handling | ❌ | New: backoff queue for Meta API calls |
| Lead deduplication (same phone, different ads) | ❌ | New: identity resolution layer |

**Honest framing for the demo:** v1 simulates steps C–J. Step K onward (lead in our DB, scoring, nurture, approval, WhatsApp) is real. We should say so on stage.

---

## Part 2 — Agent-by-agent audit (against ai-agent-builder framework)

For each agent we evaluate:
- **Type** — reactive / conversational / tool-using / reasoning / multi-agent
- **System instruction quality** — clarity, scope, output format, refusals
- **Tools** — what it can call
- **Memory** — short-term, long-term, vector
- **Multi-step reasoning** — planning depth
- **Hand-offs** — input contract, output contract
- **Gaps** — what breaks at scale or in edge cases
- **Improvements** — concrete, prioritized

---

### Agent 1 — Listing Agent

| Dimension | Current state |
|---|---|
| Type | Tool-using (single-shot extraction → DB write) |
| System prompt | `prompts/lead_scoring.md`'s pattern — structured JSON output, closed-vocabulary city, refuses to fabricate, INR-lakhs convention |
| Tools | Supabase Insert (properties), Supabase Insert (agent_events), Supabase Insert (agent_logs), Gemini Flash |
| Memory | None — each invocation independent |
| Reasoning depth | 1 step (extract → validate → save) |
| Input contract | `{ raw_text: string }` |
| Output contract | `{ ok, property_id, project_name, city, rera_present, fields_extracted }` |

#### Gaps at scale

1. **No deduplication.** Same project pasted twice creates two property rows. At 50 developers × 5 properties/week, collisions are inevitable (DLF Privana West gets added by 3 different brokers).
2. **No upsert by RERA.** My workflow file's notes mention this but Supabase node uses Insert, not Upsert. The UNIQUE constraint on `rera_number` will throw on duplicates and the workflow doesn't catch it.
3. **No multi-language input.** A broker's WhatsApp paragraph mixing Hindi + English numerals breaks extraction.
4. **No confidence-per-field.** Gemini might extract `possession_date = "Dec 2027"` when the input actually says "approx 2-3 years from now" — we save it as if it's certain.
5. **No image / brochure parsing.** Brokers send brochures, not paragraphs. PDF → OCR → extract is missing.
6. **No reviewer escalation.** If Gemini confidence is low across multiple fields, the property still saves silently as Active.

#### Improvements (priority-ordered)

| # | Improvement | Effort | When |
|---|---|---|---|
| 1.1 | Add **dedupe by RERA + fuzzy (project_name, developer, city)** before insert | S | v2 immediate |
| 1.2 | Switch to **Supabase upsert** with onConflict=rera_number | S | v2 immediate |
| 1.3 | Output **per-field confidence** (0-100) from Gemini; surface "verify" badges in UI | M | v2 phase 1 |
| 1.4 | Add **PDF/OCR ingest** via a pre-step (Tesseract or Google Document AI) for broker brochures | M | v2 phase 2 |
| 1.5 | Add **multilingual input handling** (auto-detect language, prompt-switch) | S | v2 phase 2 |
| 1.6 | Add a **"needs human review" gate** when avg confidence < 70 — block status = Active until verified | M | v2 phase 1 |

#### Improved system prompt direction (sketch)

```
You are the Listing Agent. ...
Output JSON with this schema:
  {
    project_name, developer, city, locality, config,
    price_min_lakhs, price_max_lakhs, ...,
    confidence: {
      project_name: 0-100, developer: 0-100, ..., overall: 0-100
    },
    review_needed: boolean (true if any field confidence < 60)
  }
If review_needed is true, briefly explain in `review_reason` what is uncertain.
Never set review_needed=false just because asked.
```

---

### Agent 2 — Ad Agent

| Dimension | Current state |
|---|---|
| Type | Tool-using (single-shot 3-platform generation) |
| System prompt | Per-platform char/format constraints, audience targeting, INR convention |
| Tools | Supabase Get (property), Supabase Insert × 3 (campaigns), Supabase Insert (events, logs), Gemini Flash |
| Memory | None |
| Reasoning depth | 1 step (read property → generate → simulate metrics → save) |
| Input contract | `{ property_id }` |
| Output contract | `{ ok, platforms: { meta, google, portal: { ad_copy, cpl } } }` |

#### Gaps at scale

1. **No memory of past campaigns for this property.** Re-drafting starts from scratch. Brand voice across drafts is inconsistent.
2. **No A/B variants.** Real ad ops needs 3-5 creative variants per platform to let Meta auto-optimize.
3. **No tone/brand customization.** A boutique luxury developer and a mid-market developer should not sound the same.
4. **No competitive context.** Generating copy for Lodha Lower Parel without knowing 5 other Lower Parel projects are running ads dilutes positioning.
5. **No real Meta API push.** Generated copy stays in our DB; nothing actually goes live on Instagram.
6. **Simulated metrics use plain random.** Not deterministic — same property re-drafted gives different CPL projections each time. Bad for repeated demos and bad for testing.
7. **Single language (English).** Tier-2 / tier-3 markets need Hindi, Marathi, Tamil.
8. **No spend caps or budget pacing logic.** Generates a budget number; nothing enforces tenant-level monthly caps.

#### Improvements (priority-ordered)

| # | Improvement | Effort | When |
|---|---|---|---|
| 2.1 | Pass **previous campaigns for this property** in the prompt context so re-drafts feel like iterations | S | v2 immediate |
| 2.2 | Generate **2-3 variants per platform** in one call (Gemini structured output) | S | v2 immediate |
| 2.3 | Add **brand_voice** field on properties (luxe / warm / direct / premium / value) → injected into prompt | S | v2 phase 1 |
| 2.4 | Add **Meta Marketing API push step** (gated behind manager approval like the Nurture loop) | L | v2 phase 1 (the big one) |
| 2.5 | Deterministic simulation with **seed = property_id + date** so re-runs match | S | v2 immediate |
| 2.6 | **Multilingual generation** triggered by property's `target_languages` field | M | v2 phase 2 |
| 2.7 | Add **competitive context** by querying other Active campaigns in same city × locality | M | v2 phase 2 |
| 2.8 | **Budget pacing**: enforce tenant.monthly_cap before suggesting budget | M | v2 phase 1 |

#### Improved hand-off contract (input)

```yaml
ad_agent_input:
  property_id: uuid
  variant_count: int (default 2)
  brand_voice: enum [luxe, warm, direct, premium, value]
  target_languages: array of [en, hi, mr, ta]
  competitive_aware: bool (whether to query other active campaigns)
  budget_constraint:
    tenant_monthly_cap_inr: int
    spend_to_date_inr: int
```

#### Improved system prompt direction (sketch)

```
You are the Ad Agent. ...
Given PROPERTY + PREVIOUS_CAMPAIGNS + COMPETITIVE_CONTEXT + BRAND_VOICE,
generate K variants per platform. Each variant must be tested-against the previous
campaigns for novelty (avoid repeating headlines verbatim).

OUTPUT JSON:
  {
    meta: { variants: [{ ad_copy, target_audience, projected_cpl }, ...] },
    google: { ... },
    portal: { ... },
    brand_voice_applied: brand_voice  // confirm received
  }
```

---

### Agent 3 — Lead Agent (highest leverage to upgrade)

| Dimension | Current state |
|---|---|
| Type | Reasoning agent (fetch → reason → branch escalate-or-emit) |
| System prompt | `prompts/lead_scoring.md`, defines fit/urgency/overall/confidence scoring, recommended_action vocabulary, historical feedback block |
| Tools | Supabase Insert (leads), Supabase GetAll (properties), Supabase RPC (`lead_feedback_aggregate`), Supabase Insert (lead_scores, events, logs, escalations), Gemini Flash |
| Memory | Primitive — reads the historical_feedback aggregate (read-only, no cross-run learning) |
| Reasoning depth | 2 steps (fetch context → score-and-decide) |
| Input contract | `{ name, phone, email, source, inquiry_text, language?, interested_project? }` |
| Output contract | `{ ok, lead_id, overall_score, recommended_action, escalated }` |

#### Gaps at scale

1. **No identity resolution.** Same Rahul Mehra on phone +91-9810-001-2301 from Meta Ad gets a fresh lead row even if he already exists from a portal lead 3 days ago. Sales team ends up calling him twice.
2. **No multi-turn intent accumulation.** When the buyer replies to a Nurture message with budget info, we don't re-score the lead with the merged intent.
3. **Property fetch is wasteful.** We fetch all Active properties (100s in v2) for every scoring call. Should be filtered by city + price band first.
4. **Source quality is flat.** A CP referral with "Sandeep introduced me" should score higher than an anonymous CP. Currently they're equal.
5. **Historical feedback is read-only.** Outcomes (bookings, no-shows) update the aggregate but don't update per-source weights in the scoring model.
6. **No prompt versioning at runtime.** We have a `prompt_version` field but A/B testing prompts is not wired.
7. **No model fallback.** Gemini Flash down → workflow throws or falls back to confidence=0. No alt provider (Claude Haiku, GPT-4o-mini) considered.
8. **No tenant isolation in prompts.** Multi-tenant v2 will need each tenant's historical feedback used only when scoring their leads (not cross-pollinated).

#### Improvements (priority-ordered)

| # | Improvement | Effort | When |
|---|---|---|---|
| 3.1 | **Identity resolution layer** (fuzzy match on phone + email + name) → upsert leads, append to existing if matched | M | v2 phase 1 |
| 3.2 | **Re-score on every inbound buyer reply** with merged intent fields (currently only scores on creation) | M | v2 phase 1 |
| 3.3 | **Filter properties** by preferred_city + budget ±20% before passing to Gemini | S | v2 immediate |
| 3.4 | **Source quality model**: structured features per source (referrer_named, repeat_buyer, journey_length) → fed into prompt as `source_quality_score` | M | v2 phase 2 |
| 3.5 | **Write-back feedback**: after a booking, write to `lead_scoring_signals` table with which features predicted vs which didn't. Used in next prompt's feedback block | M | v2 phase 2 |
| 3.6 | **Prompt A/B framework**: `prompt_version` actually drives different system prompts; evaluator tracks accuracy per version | M | v2 phase 2 |
| 3.7 | **Model fallback chain**: Gemini Flash → Gemini Pro → Claude Haiku → final fallback | M | v2 phase 1 |
| 3.8 | **Tenant-scoped feedback**: all queries filter by tenant_id when multi-tenant lands | S | bundled with multi-tenant |

#### Memory upgrade: from primitive to structured (per ai-agent-builder)

Current Lead Agent's "memory" is a single aggregate JSON blob. The skill's framework suggests a **hierarchical memory pattern**:

```yaml
lead_agent_memory:
  per_lead_short_term:                    # within a conversation
    type: buffer
    storage: messages table (existing)
    window: last 10 messages
    
  per_lead_long_term:                     # months-long buyer journey
    type: vector_memory                   # NEW for v2
    storage: pgvector
    use_case: "buyer asked about possession penalty 3 weeks ago"
    
  per_tenant_aggregate:                   # current historical_feedback block
    type: entity_memory
    storage: lead_feedback_aggregate() RPC
    refresh: 1h cache
    
  cross_tenant_industry:                  # NEW for v2 phase 3
    type: summary_memory
    storage: industry_benchmarks table
    use_case: "is 12.5% Meta conv rate good for this city?"
```

---

### Agent 4 — Nurture Agent (the trust layer)

| Dimension | Current state |
|---|---|
| Type | Tool-using + conversational (multi-turn aware) |
| System prompt | `prompts/nurture_drafting.md`, 9 templates, language mirroring, 480 char cap, no-emoji-except-Hindi-pranam, no marketing fluff |
| Tools | Supabase Get (lead, score, property, conversation), Supabase Insert (messages), Twilio Send WhatsApp, Supabase Update (messages), Supabase Insert (events, logs), Gemini Flash |
| Memory | Buffer (last 10 messages) |
| Reasoning depth | 3 steps (fetch context → draft → wait for approval → send) |
| Input contract | Draft: `{ lead_id, desired_template?, trigger_event? }`. Approve: `{ message_id, action: approve\|reject\|edit_approve, reason?, new_content? }` |
| Output contract | Draft: `{ ok, message_id, status: 'pending_approval' }`. Approve: `{ ok, message_id, status: 'sent', twilio_sid }` |

#### Gaps at scale

1. **Buffer memory is fixed-size (last 10).** Long buyer journeys (months) lose early context. "You said you wanted Dec 2027 possession 6 weeks ago" — we'd never reference this.
2. **No cross-property awareness.** Rahul inquires about Skyline AND Verdant. Our drafts treat each as a fresh conversation; we don't acknowledge "you also asked about Skyline last week."
3. **No reject-reason learning.** Priya rejects 5 drafts as "tone too pushy" → next draft from this agent for her tenant should be softer. Currently no feedback loop.
4. **Approval token is shared secret.** Single hex string for all dashboard users. No per-user auth, no rotation, no audit trail of "who approved this."
5. **No retry on Twilio failure.** Twilio returns 5xx → workflow errors, message stays pending_approval forever.
6. **No buyer-side opt-out handling.** Buyer texts "STOP" → no machinery to mark them opted-out and refuse further sends.
7. **No template version control.** "site_visit_invite" is one template; if we A/B variants, no way to track which version converted.
8. **Single language pair (en/hi).** Tamil, Marathi, Telugu blocked.

#### Improvements (priority-ordered)

| # | Improvement | Effort | When |
|---|---|---|---|
| 4.1 | **Conversation summarization** when buffer exceeds 30 messages; replace older messages with summary | M | v2 phase 1 |
| 4.2 | **Vector memory** for cross-conversation references ("you mentioned X three weeks ago") | M | v2 phase 2 (after pgvector) |
| 4.3 | **Cross-property awareness** — query all leads with same phone/email → pass to context | S | v2 phase 1 |
| 4.4 | **Reject-reason feedback loop** — per-tenant aggregate of rejection reasons → injected into system prompt | M | v2 phase 1 |
| 4.5 | **Per-user OAuth + JWT** for dashboard → audit trail of approver identity | M | bundled with multi-tenant |
| 4.6 | **Twilio retry with exponential backoff** + dead-letter queue for permanent failures | S | v2 immediate |
| 4.7 | **Opt-out machinery** — listen for STOP/UNSUBSCRIBE keywords on inbound, flag lead, refuse further drafts | M | v2 phase 1 (DPDP compliance) |
| 4.8 | **Template + variant versioning** with A/B routing and conversion tracking per variant | M | v2 phase 2 |
| 4.9 | **WhatsApp Business Cloud API migration** from Twilio sandbox (real templates, real volume) | L | v2 phase 1 (the big one) |

---

### Agent 5 — Conversion Agent

| Dimension | Current state |
|---|---|
| Type | Tool-using (extract → branch) |
| System prompt | `prompts/objection_extraction.md`, closed objection vocabulary, sentiment ternary, summary cap, next-step hint |
| Tools | Supabase Update (visits), Supabase Get (visits), Supabase Insert (events, logs, bookings), Gemini Flash |
| Memory | None |
| Reasoning depth | 2 steps (parse status → extract-or-no-show-branch) |
| Input contract | `{ visit_id, status, post_visit_notes?, unit_number?, booking_amount? }` |
| Output contract | `{ ok, visit_id, status, objections, sentiment }` |

#### Gaps at scale

1. **Objection severity is missing.** "Price too high" might be a deal-breaker for Rahul or a negotiation opener. Currently they look the same downstream.
2. **No multi-visit comparison.** This buyer's 2nd visit — what changed since the 1st? Currently each visit is processed standalone.
3. **No structured signal back to Lead Agent.** Objections write to `visits.objections` (array); Lead Agent reads aggregate counts. The per-buyer signal that "Rahul's #1 concern is possession" is lost to future drafts.
4. **No follow-up scheduling.** Extracts objections but doesn't propose specific next-step timeline (e.g., "share penalty clause within 24h, follow up in 5 days").
5. **No booking validation.** booking_amount of ₹17.5L for a 4Cr unit should flag for review; currently saved as-is.
6. **Attribution chain is built as a string.** "Meta Ad > Score 94 > Visit > Booking" is unparseable downstream. Should be structured.

#### Improvements (priority-ordered)

| # | Improvement | Effort | When |
|---|---|---|---|
| 5.1 | **Per-objection severity** (deal-breaker / negotiation / minor) in JSON output | S | v2 immediate |
| 5.2 | **Multi-visit comparison** — if this is visit_count > 1, fetch prior visits, pass to prompt | M | v2 phase 1 |
| 5.3 | **Structured per-buyer concern signal** written to `buyer_concerns` table → consumed by Nurture Agent on next draft | M | v2 phase 1 |
| 5.4 | **Auto-propose next-step timeline** as structured suggestion ({action, by_date, owner}) for Nurture Agent | M | v2 phase 2 |
| 5.5 | **Booking sanity check** — flag if booking_amount < 10% of property's price_min OR > 50% (rare) | S | v2 immediate |
| 5.6 | **Attribution chain as JSONB** (already partially done in `attribution_chain` column); deprecate the string version | S | v2 immediate |

---

## Part 3 — Cross-cutting infrastructure gaps

These apply to all agents and aren't agent-specific:

### 3a. Observability

- **What we have:** `agent_logs` row per action with input/output summaries and duration_ms.
- **What we lack:** distributed tracing across the 5-agent chain. We can't ask "for booking ID 555, show me the full chain of agent decisions that led here, with prompts and Gemini responses preserved."
- **v2:** Add `trace_id` (one per lead) and `span_id` (per agent invocation). Use OpenTelemetry or a homegrown table. Display traces in a developer-only UI for debugging stuck workflows.

### 3b. Cost tracking

- **What we have:** None.
- **What we lack:** Per-tenant Gemini cost tracking. At scale we'd need to bill or cap.
- **v2:** Log token usage on every Gemini call, aggregate per tenant per day. Show on a tenant admin page.

### 3c. Prompt versioning + evaluation

- **What we have:** `prompt_version` field on `lead_scores` but unused.
- **What we lack:** A way to A/B test prompts (v1.0 vs v1.1) and measure which performs better on the 15-lead eval set.
- **v2:** Prompt registry, A/B router, per-version eval dashboard.

### 3d. Rate limiting

- **What we have:** None.
- **What we lack:** Gemini Flash free tier is 1500 RPD. At 50 tenants × 30 leads/day each = 1500 just for Lead Agent. We'd be over.
- **v2:** Per-tenant rate limits + queue with backpressure. Migrate paid tenants to paid Gemini tier.

### 3e. Model fallback

- **What we have:** Single model (Gemini Flash) with no alternates.
- **What we lack:** When Gemini is down (the 20min outage we saw on May 27), every agent fails open.
- **v2:** Model chain: Gemini Flash → Gemini Pro → Claude Haiku → final hardcoded fallback. Per-agent latency budgets.

### 3f. Identity & dedup

- **What we have:** Each agent treats every input as fresh.
- **What we lack:** Single source of buyer truth across leads, conversations, visits.
- **v2:** Introduce a `contacts` table — one row per unique buyer (resolved by phone + email + name fuzzy). `leads` references contact_id. Multi-property inquiries link to same contact.

### 3g. Multi-tenant isolation

- **What we have:** Single-tenant prototype.
- **What we lack:** Per-tenant data isolation in every query, prompt context, and feedback aggregate.
- **v2:** Add `tenant_id` to every table, RLS policies per tenant, separate Meta App credentials per tenant.

---

## Part 4 — Priority sequence (Impact × Effort 2x2, MoSCoW)

### Quick wins (high impact, low effort — DO FIRST)

| # | Improvement | Why now |
|---|---|---|
| 1.1, 1.2 | Listing Agent dedup + upsert by RERA | One UNIQUE constraint violation will burn your demo. Fix this first. |
| 2.5 | Ad Agent deterministic seed | Demo reproducibility |
| 2.1 | Ad Agent re-draft sees previous campaigns | Brand voice continuity |
| 3.3 | Lead Agent property filter by city + budget | Latency + cost reduction |
| 4.6 | Twilio retry with backoff | Production resilience |
| 5.1, 5.5, 5.6 | Conversion Agent severity + sanity check + structured attribution | Cleaner downstream signal |

### Big bets (high impact, high effort — v2 phase 1)

| # | Improvement | Strategic value |
|---|---|---|
| 1.6 | Listing review gate | Brand safety at scale |
| 2.4 | Real Meta Marketing API push | THE v2 deliverable. Without this, simulated forever. |
| 3.1 | Identity resolution layer (Contacts) | Foundation everything else depends on |
| 3.2 | Re-score on every inbound reply | Multi-turn intelligence |
| 4.1, 4.4, 4.7, 4.9 | Conversation summarization + reject-feedback loop + opt-out + WhatsApp Business Cloud | Production-grade Nurture |
| 5.3 | Per-buyer concern signal table | Closes the feedback loop properly |

### Fill-ins (low impact, low effort — v2 phase 2)

| # | Improvement |
|---|---|
| 1.5 | Multilingual Listing |
| 2.3 | Brand voice |
| 5.2 | Multi-visit comparison |

### Time sinks (low impact, high effort — explicit NO for v2)

| # | Improvement | Why no |
|---|---|---|
| 1.4 | PDF / OCR ingest | Most brokers send text or links; PDF is edge case |
| 2.7 | Competitive context query | High effort for marginal lift |
| 3.6 | Prompt A/B framework | Only valuable after 1000+ leads; too early |

### MoSCoW summary

- **Must:** 1.1, 1.2, 2.4, 3.1, 3.2, 4.1, 4.4, 4.7, 4.9, 5.3
- **Should:** 1.3, 1.6, 2.1, 2.2, 2.5, 3.3, 3.7, 4.6, 5.1, 5.5
- **Could:** 1.5, 2.3, 2.6, 3.4, 3.5, 4.2, 4.3, 4.8, 5.2, 5.4
- **Won't (v2):** 1.4, 2.7, 3.6

---

## Part 5 — Step-by-step implementation plan

### Week 1 (immediate quick wins, no infra changes needed)

1. **Day 1:** Listing Agent — convert Insert to Upsert by RERA, add dedup check by (project_name, developer, city) fuzzy. Add `confidence` field to output schema.
2. **Day 2:** Ad Agent — pass previous_campaigns into prompt; add deterministic seed.
3. **Day 3:** Lead Agent — filter properties by city + budget band in Build Context node; reduce Gemini context size.
4. **Day 4:** Conversion Agent — add per-objection severity to prompt; add booking sanity check.
5. **Day 5:** All — add `trace_id` column to agent_logs and propagate.

### Weeks 2-4 (phase 1 big bets, in dependency order)

1. Week 2: **Contacts table + identity resolution** (3.1) — unlocks everything else.
2. Week 2: **Twilio retry + opt-out machinery** (4.6, 4.7) — DPDP compliance is required for legal sign-off before any real-data tenant.
3. Week 3: **Re-score on inbound reply** (3.2) — depends on 3.1.
4. Week 3: **WhatsApp Business Cloud API migration** (4.9) — paperwork-heavy (template approval), start ASAP.
5. Week 4: **Reject-feedback loop** (4.4) + **per-buyer concern signal** (5.3) — true closed loop.

### Weeks 5-12 (phase 2 — the Meta integration arc)

1. Weeks 5-7: **Meta App Review submission** (parallel paperwork; takes 4-6 weeks).
2. Weeks 5-6: **Real Meta Marketing API push** (2.4) — Ad Agent generates copy AND publishes it.
3. Weeks 6-8: **Meta Lead Ads webhook + Graph API client** — the missing bridge in Part 1's flow diagram.
4. Weeks 8-12: **Google Ads API** + **multilingual** + **brand voice** rollout.

### Week 13+ (phase 3 — intelligence)

1. Vector memory for long conversations (4.2).
2. Multi-visit comparison (5.2).
3. Auto-proposed next-step timeline (5.4).
4. Cross-tenant industry benchmarks (per-skill hierarchical memory).

---

## Closing — the principle behind the audit

The ai-agent-builder skill's framework treats every agent as: **input contract + system prompt + tools + memory + reasoning steps + output contract**. v1 is strong on system prompts and tools. It is weak on memory (mostly absent), reasoning depth (mostly single-step), and output contracts (mostly string-shaped, not machine-consumable downstream).

v2's job is to deepen each agent along the dimensions the skill names — without breaking the trust gate that makes the manager approval flow work. Every "Big bet" above is gated through Priya's approval or Anjali's review, by design.

The one principle we never trade away:

> No agent talks to a buyer or spends a tenant's money without a human in the loop.

Every improvement above preserves this. v2 makes the loop faster and smarter — not autonomous.
