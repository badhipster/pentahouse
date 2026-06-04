# v2 Roadmap — From Demo to Production

**Author:** PM (Abhishek Ranjan)
**Status:** v1 (capstone) ships June 1, 2026. This document defines what "real" means for v2.

## Framing

v1 is a **complete, demonstrable, live system** with every AI capability working on real Gemini calls and real WhatsApp delivery. What it doesn't have is **real integrations with the platforms developers already pay for**: Meta Ads Manager, Google Ads, the WhatsApp Business Cloud API, MagicBricks/99acres lead webhooks, RERA portals, and existing CRMs. v2 is about turning every dotted line in the architecture into a solid one.

**v2 north-star metric:** A mid-size Indian developer can replace their current CRM + ad ops + lead-routing stack with Pentahouse in 14 days and run it for 90 days without manual intervention beyond Priya pressing A on approvals.

---

## Prioritization framework

Each opportunity scored on **Impact × Effort (2x2)** plus a **dependency** column. MoSCoW assigned at the end.

| Quadrant | Meaning |
|---|---|
| **Quick wins** | High impact, low effort. Ship in first 2 weeks of v2. |
| **Big bets** | High impact, high effort. The defensible moat. |
| **Fill-ins** | Low impact, low effort. Polish during slack. |
| **Time sinks** | Low impact, high effort. Explicit no. |

---

## Tier 1 — Real platform integrations (the "v2 promise")

### 1.1 Meta Marketing API — real ad publishing

**What:** Replace simulated Meta campaigns with real campaign creation in the developer's Meta Ads Manager account. Listings sync to a product catalogue; Ad Agent's drafted copy becomes a real ad set; performance metrics flow back automatically.
**Impact:** High. The single biggest credibility gap in v1.
**Effort:** High (4-6 weeks). Requires Meta Business Verification, App Review approval for `ads_management` scope, secure OAuth token storage per developer.
**Dependency:** Each developer must have a Meta Business Manager account and grant Pentahouse the role of Ad Account Admin.
**Success metric:** First developer launches a real campaign through Pentahouse end-to-end (paste listing → approve copy → live ad delivering on Instagram) within 5 minutes.
**MoSCoW:** **Must** for v2.

### 1.2 Meta Lead Ads webhook ingestion

**What:** Configure Meta to POST every form-fill from a Pentahouse-managed ad directly to our `/webhook/new-lead`. Replaces curl-simulated leads with the real thing.
**Impact:** Closes the loop opened in 1.1 — leads from our ads appear in our pipeline automatically.
**Effort:** Medium (1-2 weeks). Webhook subscription + signature verification + form-field mapping.
**Dependency:** 1.1 must ship first (need real ads producing real leads).
**Success metric:** A buyer fills out a real Meta lead form; the lead appears in `/leads` with the correct campaign_id attribution in under 60s.
**MoSCoW:** **Must** for v2.

### 1.3 WhatsApp Business Cloud API (replace Twilio sandbox)

**What:** Migrate from Twilio's 25-message-day sandbox to the developer's own WhatsApp Business Cloud account. Includes message templates approved by Meta, two-way conversations, media attachments, opt-in/opt-out management.
**Impact:** High. Removes the only manual prerequisite from v1 ("buyer must join sandbox") and unblocks volume.
**Effort:** Medium-High (3 weeks). Template approval cycle is the long pole — submit early.
**Dependency:** Developer must have a WABA (WhatsApp Business Account) and a verified Facebook Business.
**Success metric:** Zero opt-in friction. Buyer fills Meta lead form → WhatsApp arrives — no joining a sandbox.
**MoSCoW:** **Must** for v2.

### 1.4 Google Ads API — search and demand-gen campaigns

**What:** Same playbook as Meta for Google. Ad Agent generates RSA headlines/descriptions, Pentahouse publishes them to the developer's Google Ads account, performance flows back.
**Impact:** Medium-High. Marketing leads run Meta + Google together; missing Google means parallel manual ops.
**Effort:** High (4-5 weeks). Google's API surface is denser than Meta's.
**Dependency:** Developer's Google Ads account + MCC (Manager) relationship.
**Success metric:** Source ROI dashboard shows real Google leads alongside real Meta leads, on the same screen.
**MoSCoW:** **Must** for v2.

### 1.5 99acres / MagicBricks / Housing.com lead inbound

**What:** Three portal-specific lead-webhook integrations (each portal has its own format). Maps inbound buyer details to `/webhook/new-lead` with source = portal name and campaign_id = the matching portal campaign.
**Impact:** Medium. Portals are still 40-60% of mid-market lead volume in India.
**Effort:** Medium (2-3 weeks). One per portal, each with its own auth handshake.
**Dependency:** Developer must have portal accounts; some portals require partnership agreements.
**Success metric:** Live portal leads flow into `/leads` without manual upload.
**MoSCoW:** **Should** (phased — 99acres first; Magicbricks + Housing in 2.1).

---

## Tier 2 — Intelligence upgrades

### 2.1 RAG layer over project documents

**What:** Vector-index brochures, floor plans, RERA filings, price sheets, and developer FAQs per project. Nurture Agent's drafted messages can now ground claims in actual project documents ("Floor plan F2 at 1380 sqft per the official brochure, attached").
**Impact:** High. Eliminates the last source of buyer-message hallucination risk and lets sales answer technical questions automatically.
**Effort:** Medium-High (3-4 weeks). pgvector in Supabase (already on the platform) + chunking pipeline + retrieval prompt-augmentation.
**Dependency:** Property count > 50 (PRD §8 threshold) — likely met after first 3-4 developer onboardings.
**Success metric:** 95% of factual claims in Nurture Agent drafts traceable to a specific document chunk; manager rejection rate for "hallucinated detail" drops below 5%.
**MoSCoW:** **Must** for v2.

### 2.2 Fine-tuned lead scorer

**What:** Replace pure Gemini prompt-engineered scoring with a fine-tuned classifier (lightweight model like Llama-3-8B-Instruct or a Gemini Flash fine-tune) trained on 500+ scored leads with verified booking outcomes. Reduces scoring cost by ~80% and improves alignment with sales reality.
**Impact:** Medium-High. Removes Gemini cost as a scaling constraint; improves accuracy on the long tail.
**Effort:** Medium (2-3 weeks once data is ready). Data labeling pipeline + training infra.
**Dependency:** Accumulate 500+ leads with closed-loop outcomes (visit completed, booking made). Realistically 3-4 months post-launch.
**Success metric:** Section 8 eval accuracy rises from 80% (current Gemini Flash) to 92%+; per-score cost drops from ~₹0.4 to ~₹0.05.
**MoSCoW:** **Could** for v2 (gated on data accumulation).

### 2.3 Multilingual extension (regional Indian languages)

**What:** Tamil, Telugu, Marathi, Kannada, Bengali, Gujarati for the Nurture Agent's WhatsApp drafts and the Intent Extraction Agent. Lead Agent's language detection already exists; the gap is downstream generation.
**Impact:** Medium. Tier-2 cities are 40% of demand; English-only is a real limit.
**Effort:** Medium (2-3 weeks per language pair for prompt tuning + eval set). Gemini handles the generation; the work is QA and the eval set per language.
**Dependency:** None.
**Success metric:** A buyer texting in Tamil gets a Tamil reply within 60s, indistinguishable from a human-written response.
**MoSCoW:** **Should** for v2 (start with Tamil + Marathi; expand based on developer footprint).

### 2.4 Long-conversation vector memory

**What:** Replace the current "last 10 messages" conversation context with semantic retrieval over the full conversation history. Critical for months-long buyer journeys where a manager might forget what was promised in week 2.
**Impact:** Medium. Mostly a Nurture Agent quality improvement on long-tail buyer threads.
**Effort:** Low-Medium (1-2 weeks). pgvector again; embed each message on insert.
**Dependency:** RAG infra from 2.1.
**Success metric:** Recap messages reference an earlier commitment made > 30 days ago.
**MoSCoW:** **Could** for v2.

---

## Tier 3 — Platform / horizontal

### 3.1 Multi-tenant (multiple developers)

**What:** Each developer is a tenant with isolated data (RLS-enforced), their own brand on outbound WhatsApp, their own Gemini quota, their own Meta/Google credentials. Salesperson logins per tenant.
**Impact:** Critical for business model. Currently a single-tenant prototype.
**Effort:** High (4-6 weeks). Schema changes (tenant_id everywhere), auth model, RLS policy rewrites, billing.
**Dependency:** Decision on pricing model (per-seat vs per-property vs % of ad spend).
**Success metric:** Two developers using the same instance with zero data crossover.
**MoSCoW:** **Must** for v2.

### 3.2 Salesforce / HubSpot CRM connector

**What:** Bi-directional sync with the developer's existing CRM. Leads scored in Pentahouse appear in Salesforce; status changes in Salesforce reflect back. Manager retains existing reporting workflow.
**Impact:** Medium-High. Removes the "rip and replace" objection during sales conversations.
**Effort:** Medium (3 weeks). Standard REST integration.
**Dependency:** None for the integration itself; depends on each developer's CRM choice.
**Success metric:** A lead created in Pentahouse appears in the developer's Salesforce within 60s, with all custom fields mapped.
**MoSCoW:** **Should** for v2.

### 3.3 Mobile-native app (React Native / Flutter)

**What:** Native iOS + Android for Priya/Rohit. Push notifications for hot leads and pending approvals. Approve-from-lock-screen.
**Impact:** Medium-High. Sales managers don't live in front of laptops.
**Effort:** High (6-8 weeks). Native development + push infrastructure.
**Dependency:** None.
**Success metric:** 70% of approve actions happen on mobile within 30 days of launch.
**MoSCoW:** **Should** for v2 (phased — iOS first).

### 3.4 Calendar integration (Google Calendar / Outlook)

**What:** Visit slots sync to Rohit's calendar; reminders fire from both calendar and WhatsApp.
**Impact:** Low-Medium. Nice-to-have ops smoothness.
**Effort:** Low (3-5 days). OAuth + standard calendar API.
**Success metric:** Confirmed visits show in Rohit's Google Calendar.
**MoSCoW:** **Could** for v2.

### 3.5 RERA portal sync

**What:** Daily sync from state RERA portals to auto-update possession dates, status changes (Active → Sold Out), and new project registrations. Replaces manual catalogue refresh.
**Impact:** Medium. Possession-date drift is the #1 source of buyer dispute; auto-sync removes it.
**Effort:** Medium (per state — Maharashtra, Karnataka, UP, Haryana, TN scraped separately; no unified API exists).
**Success metric:** A property's possession date in Pentahouse always matches the latest RERA filing within 24h.
**MoSCoW:** **Could** for v2 (start with MahaRERA; expand state-by-state).

---

## Tier 4 — Closed-loop monetization (optional, post-v2)

### 4.1 Power dialer / click-to-call

**What:** Twilio Voice integration. Rohit clicks a lead card → headset rings → buyer's phone rings. Call recording + transcription auto-saved to lead history.
**Impact:** Medium. Indian residential sales is still 60% voice.
**Effort:** Medium (2-3 weeks).
**MoSCoW:** **Could** for v2.

### 4.2 Loan partner integration (HDFC / SBI / ICICI)

**What:** When a lead's loan_status is "Planning", Pentahouse can pre-share their profile (with consent) to partner banks for pre-approval. Bank partner pays a referral fee.
**Impact:** Revenue channel for Pentahouse + faster close for developer.
**Effort:** High (partnership BD + integration).
**MoSCoW:** **Won't** for v2; flag for v3.

### 4.3 Post-visit recap PDF generation

**What:** Auto-generate a buyer-facing PDF summarizing what was seen, prices discussed, next steps. Branded with the developer's logo.
**Impact:** Low-Medium. Professional polish; reduces buyer drop-off.
**Effort:** Low (1 week).
**MoSCoW:** **Could** for v2.

---

## Sequencing for first 6 months of v2

```
Month 1
├── 1.1 Meta Marketing API
├── 1.3 WhatsApp Business Cloud (template submission starts day 1 — long lead time)
└── 3.1 Multi-tenant foundation (schema + auth)

Month 2
├── 1.2 Meta Lead Ads webhook (depends on 1.1 launching)
├── 2.1 RAG over project documents
└── 3.1 Multi-tenant completion + first second-developer onboard

Month 3
├── 1.4 Google Ads API
├── 1.5 99acres webhook (first portal)
└── 2.3 Tamil + Marathi multilingual

Month 4
├── 1.5 Magicbricks + Housing.com
├── 3.2 Salesforce connector
└── 3.4 Calendar integration

Month 5
├── 3.3 iOS app alpha
└── 2.4 Long-conversation vector memory

Month 6
├── 3.3 iOS app GA + Android beta
├── 3.5 MahaRERA sync
└── 2.2 Fine-tuned scorer (if data threshold met)
```

## What v1 already proves that v2 will lean on

- **Closed-loop architecture works.** Events flow through `agent_events`; feedback informs scoring. v2 swaps simulated edges for real ones without re-architecting.
- **Manager approval gate is non-negotiable.** Every v2 integration that touches a buyer (real Meta ads, real WhatsApp) preserves the approval surface as the choke point.
- **Trust UX matters more than capability.** v2 must not ship a single feature that lets the AI talk to a buyer unsupervised.
- **The 5-agent contract is stable.** Listing → Ad → Lead → Nurture → Conversion is the spine. v2 deepens each agent but doesn't add new ones.

## Open strategic questions for v2 planning

1. **Pricing model.** Per-seat (₹500-1500/month/exec) vs per-property (₹2K/active project/month) vs % of ad spend (5-10%). RICE doesn't help here; needs founder + 5-customer discovery interviews.
2. **First customer profile.** Single-project boutique developer (faster sales cycle, lower spend) vs multi-project mid-size (longer cycle, anchor logo). Decide before Month 2.
3. **Vendor risk on Meta/Google APIs.** Both have changed access terms repeatedly. What's the contingency if Meta deprecates Lead Ads webhooks?
4. **Open-source vs proprietary.** The n8n workflows could be open-sourced as a marketing play. Worth a debate.
5. **Data partnership angle.** RERA portals are public but scraping is fragile. Is there a paid data partner (e.g., PropEquity, Anarock data team) worth a deal with?

## Closing

v1 demonstrates *that* an Indian residential sales operation can be AI-orchestrated end-to-end. v2 demonstrates *how* — by replacing every simulated bridge with a real, customer-funded integration. The strategy is sequential, not parallel: each Month delivers one provable customer outcome.
