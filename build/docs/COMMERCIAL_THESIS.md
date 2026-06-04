# Commercial Thesis — Pentahouse

**Date:** 2026-06-01
**Author:** PM (founder-mode)
**Status:** Live thinking; updates after first 3 sales-head conversations.

This document answers a single question: **why will a sales head at an Indian residential developer buy this product?** Everything else (the audit, the v2 roadmap, the engineering priorities) is a consequence of the answer.

It exists because we cancelled the 2026-06-01 demo when we realised the engineering is closer to demo-ready than pilot-ready, and a 1000-person pitch without a single paying pilot would have spent the credibility we did not yet have.

---

## Who actually pays

Two buyers in mid-size Indian residential RE. The order matters.

### The economic buyer

The developer's MD, promoter, or sales-side director. The person whose signature is on the marketing cheque. They sign for tech only when their sales head is already begging for it. They will never be Pentahouse's first conversation.

### The champion buyer

The sales head / VP Sales. She is the one who feels the pain daily, who will trial the product, who will push it upward. She is also the only person who can credibly tell her MD the system is worth its price.

**The product has to win her over first; the MD signs months later.**

### The blocker we ignore at our peril

Floor reps. If they think the AI is replacing them they will sabotage the rollout — refuse to mark visit outcomes, send WhatsApps from their personal phone to evade the queue, claim the AI "wrote things wrong" when the customer is unhappy. Positioning the product as **the work they hate, done for them** (not "their work, done for them") is the difference between adoption and quiet boycott.

---

## What she is actually paying for

Not a CRM. She already has one — LeadSquared, Sell.do, Anarock CRM, or the in-house Frankenstein her developer's IT team built three years ago.

She does not need another database. She is paying for **the work that the CRM keeps recording but nobody actually does.**

Concretely:

- The 80 inquiries that came in after 6 pm yesterday and got a first reply at 11 am today.
- The 40 WhatsApp threads sitting in 8 reps' personal phones that she cannot see.
- The 20 site visits last week where nobody wrote down why the buyer didn't book.
- The ₹14 lakh she spent on Meta last month that has no traceable bookings.

We are not selling software. We are selling **a junior sales team that never sleeps, never forgets, never lies on the daily report, and works for less than one rep's salary.**

---

## The pitch crystallised

> Your sales floor is losing 70% of inquiries before anyone calls them. We catch them in 47 seconds, qualify them, draft the WhatsApp reply for your rep to approve, and trace every booking back to the rupee that bought it. You pay us less than one rep's salary.

That is the entire pitch. Everything else is supporting evidence.

---

## The economic math she takes to her MD

For a mid-size developer doing ~200 units a year. Numbers grounded in published Indian residential funnel data (Anarock, JLL, Knight Frank reports 2024-25) and the InsideSales response-time-to-conversion curve.

| Today | With Pentahouse |
|---|---|
| 30,000 inquiries/year across 6-8 channels | 30,000 inquiries/year |
| First reply median 5h (industry average) | First reply median <60s |
| Qualified rate ~12% → 3,600 | Qualified rate ~18% → 5,400 |
| Visit conversion ~30% → 1,080 | ~30% → 1,620 |
| Booking conversion ~10% → 108 | ~10% → 162 |
| Topline ~₹130 Cr at ₹1.2 Cr avg ticket | ~₹195 Cr |

**Delta: ~₹65 Cr a year in incremental topline from the same marketing spend.** Even at one-third the modelled lift it pays back ~50x.

Pricing in this band: ₹3-8 lakh/month subscription. We are asking for ~0.06% of the incremental topline we are unlocking. That is the trade.

---

## Why she will trust it

Indian RE is a relationship business and a regulated one — RERA on advertising claims, DPDP on PII, a buyer base that does not forgive a wrong promise. Five things make Pentahouse trustable in a way that generic AI sales tools are not.

1. **Human-in-the-loop is the headline feature, not a footnote.** Every WhatsApp goes through her approval. Every ad goes through her approval. The system writes; she ships.
2. **The activity feed is her surveillance, not the vendor's.** She sees what the system did and what her reps did, in one stream. The MD looks over her shoulder; she does not look over the vendor's.
3. **Numbers her MD cannot argue with.** Median first-response in seconds. CPL by source by week. Visit-to-booking %. These are sales-head currency.
4. **Her competitors are starting to use AI.** Fear-of-falling-behind is the strongest motivator in mid-tier RE today. Two or three Pune developers are already piloting; the rest will follow inside 18 months.
5. **Doesn't threaten her reps.** She tells her floor: "the AI catches the inquiry and writes the first draft. You close the deal." Reps keep the win; we take the grunt work.

---

## Gap honest: what is missing before we can take money

The June 1 demo would have shown a closed loop on stage with controlled inputs. That is demo-ready. It is **not** pilot-ready. Here is the gap, ranked by how much it blocks revenue.

### Must — before any paid pilot

| Gap | Why blocking |
|---|---|
| **Multi-tenant data isolation** | Everyone shares one Supabase project today. A paid customer cannot share a DB with another developer. Foundation everything else depends on. |
| **WhatsApp Business API on a real number** (not Twilio sandbox) | Otherwise her buyers see "join my-cool-sandbox" and the trust evaporates in 1 message. |
| **One real CRM integration** (start with LeadSquared) | If we cannot read her existing leads, she cannot switch sources. |
| **Compliance pre-check on ad copy** for RERA Act §11-banned phrases | One screenshot of our AI writing "guaranteed returns" ends the company. (The Ad Agent v2 prompt already lists the banned phrases; we still need a regex check on output before write.) |
| **SLA + incident runbook + a phone number** | If WhatsApp delivery breaks on a Saturday morning, somebody answers her call. Right now nobody does. |

### Should — before we lose the second deal

- Per-tenant role-based access (sales head sees all, rep sees own pipeline only).
- Per-tenant ad-spend connector (Meta + Google Ads API for live attribution).
- Audit log exportable for the developer's compliance officer (DPDP §11 right-to-access).
- Hindi UI toggle for the sales floor (not just buyer-facing messages).

### Could — after first 3 pilots

- Self-serve onboarding (today we hand-hold).
- Mobile app for the sales head.
- Forecasting layer on top of trace data.

### Won't — this year

- Multi-country (stay Indian; this is the market).
- Commercial / retail / industrial properties (residential first; the buying behaviour is different enough to be a separate product).
- A buyer-side app (the buyer chats on WhatsApp; we never build a buyer app).

---

## GTM motion — the bottoms-up wedge

We do not sell to the developer. We sell to **the sales head as a personal productivity tool**, paid by her, deployed on her floor only. Once she has 60 days of data showing the lift, she takes it upstairs and the developer formalises it as a vendor relationship.

This is the WhatsApp Business / Notion / Slack playbook. Bottoms-up adoption beats top-down RFP every time, especially in a market where IT procurement takes 6 months and the sales head has already missed her quarter.

### Beachhead market: Pune

Three reasons:

1. **Decision velocity.** Pune developers decide faster than Mumbai (which is captured by Anarock/JLL) and Delhi NCR (which is sprawling and political).
2. **Mid-tier dominance.** Kolte Patil, Goel Ganga, VTP, Nyati, Mantra, Paranjape are all 100-500 units/year — exactly our economic-math band.
3. **Existing AI curiosity.** A few Pune developers have already piloted Salesken-style call-coaching tools; the AI conversation is not from zero.

After Pune: Bangalore (mid-tier developers like Brigade, Sobha sub-segments, Prestige tier-2). Then Hyderabad. Mumbai and NCR only after we have an enterprise tier.

---

## The first 5 conversations

Not pitches. Listening sessions. 45 minutes each, no slides, three questions:

1. "Walk me through last Monday morning. What did you do between 9 am and noon?"
2. "Show me your top 5 leads from last week and tell me where they are now."
3. "What is the one thing your MD asked you in last month's review that you could not answer?"

These calls write the actual roadmap. Until they happen, every engineering priority above is informed guess, not signal.

---

## The pilot proposal

One page. Four weeks. ₹50k flat for the pilot itself.

**Success criteria, both required:**

1. Median first-response under 60 seconds across all inbound channels.
2. At least 30 inquiries qualified per day.

**If we miss either: full refund.**

We do not negotiate the success criteria. They are objective, measurable from the dashboard, and we set the floor low enough that we expect to clear them — the demo data already does.

What we get in return:

- 60 days of usage data on a real sales floor.
- One customer testimonial (contractually required if we hit the metrics).
- The right to reference them in deck and pitches.

What they get:

- A 4-week look at whether AI lead routing is worth the next conversation.
- An exit at the end of week 4 with no commitment.
- A bookable upgrade path to a 12-month subscription at ₹4 lakh/month if they want to continue.

---

## Revenue path (honest)

| Month | Milestone | MRR target |
|---|---|---|
| M+1 (Jun) | Multi-tenant infra + WhatsApp Business API live | ₹0 |
| M+2 (Jul) | First 2 paid pilots (Pune) | ₹1 lakh |
| M+3 (Aug) | First 5 pilots running. 1 conversion to subscription. | ₹4 lakh |
| M+6 (Nov) | 5 subscribed customers across Pune + Bangalore. | ₹20-25 lakh |
| M+12 (May 2027) | 15-20 customers, expansion into Hyderabad, raise seed | ₹60-80 lakh |

This is not a venture-scale curve in year 1. It is a curve that buys us the right to keep building, and that turns the audit's v2 phase-1 work (multi-tenancy, WhatsApp Business API, identity resolution) into things customers are paying for as we ship.

---

## What this thesis is NOT

- It is **not** a market sizing exercise. We do not need TAM to write this; we need 5 sales heads in Pune.
- It is **not** an investment memo. The next investor pitch happens once we have 3 paying customers and 60 days of cohort retention.
- It is **not** a roadmap. The roadmap is `build/docs/V2_ROADMAP.md`; this document is what informs which items on that roadmap get ordered first now (multi-tenancy > Meta API > Identity resolution > the rest).
- It is **not** final. It changes after the first 5 sales-head calls. Whoever reads this in 60 days should diff against the call notes.

---

## The closing principle

> Pentahouse sells **less work for the sales head, more bookings for her MD, and the same pride for her reps.** Anything that violates one of those three breaks the deal.

The audit's design principle ("no agent talks to a buyer or spends a tenant's money without a human in the loop") and this thesis are the same principle in two languages. The audit speaks to the engineer. This speaks to the founder. Both have to be true at the same time for the product to exist.
