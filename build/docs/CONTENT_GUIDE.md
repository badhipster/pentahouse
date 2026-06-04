# Content Guide — Pentahouse Voice

**Author:** Senior Content (Abhishek Ranjan, PM-mode)
**Audience:** Anyone writing or reviewing copy for the dashboard, the WhatsApp templates, or v2 marketing.

## Who we are writing for

A senior sales head at a mid-size Indian residential developer. They:

- Started in sales, not in tech. They respect speed, not features.
- Read in English; think in Hindi-English code-mix; live in WhatsApp.
- Are under pressure from the developer's leadership for monthly bookings.
- Are sceptical of dashboards that "tell" them how good they are.
- Know exactly when a tool is trying to flatter them.

They are not your friend. They are not your user-research interview subject. They are a busy professional who will close this tab the second a sentence wastes their time.

## Voice principles

### 1. Numbers do the talking, not adjectives

```
✗  You are 383x faster than the industry.
✓  Industry average: 5h. Your team: 47s.
```

Sales people quote numbers to their boss. If the dashboard does the math for them, they pass it on. If it adjective-stacks (revolutionary, blazing-fast, supercharged), they distrust everything else on the screen.

### 2. Cut the comfort phrases

```
✗  All drafts handled. Take a breath.
✓  All drafts handled.

✗  Got it, visit logged. We'll read your notes...
✓  Logged. Concerns extracting.
```

"Take a breath" is a thing a wellness app says. A sales OS treats the user as someone who's already running.

### 3. Verbs over labels in transactional copy

```
✗  Message approved & sent · To Rahul
✓  Sent to Rahul on WhatsApp

✗  Draft rejected
✓  Skipped — tone too pushy
```

Confirmations are tense, present-perfect: "Sent", "Skipped", "Logged." Not bureaucratic past-tense category-labels.

### 4. Editorial voice for identity moments, direct voice for action moments

Identity moments are seen 10,000 times. Action moments are read in 1.5 seconds.

| Where | Voice | Examples |
|---|---|---|
| Sidebar nav labels | Editorial, distinctive | "Today" · "My deals" · "Messages to send" · "Where wins come from" |
| Page headlines (Fraunces) | Editorial, plain English | "Today" · "Inbox zero" · "How this lead looks" |
| Eyebrow labels above headlines | Newspaper sections | "Desk" · "Pipeline" · "Catalogue" · "Live wire" |
| Subtitle lines under headlines | One-line journalism | "What needs your call, your approval, your eyes." |
| Section card titles | Editorial | "What just happened" · "Escalations" |
| **Toasts** | **Direct, factual** | "Sent to Rahul on WhatsApp" · "Logged · no-show" |
| **Button labels** | **Verb-first** | "Approve" · "Reject" · "Send outcome" · "Add a project" |
| **Empty states** | **Direct, useful next step** | "All drafts handled." · "Nothing scheduled. Schedule one from a lead's page." |
| **Error states** | **Honest + next step** | "Could not draft. Try again." · "Connection to AI assistant not set. Talk to admin." |

### 5. Respect the architecture but spare the user from it

The 5 agents are real. Their names appear in:

- The activity feed agent badge (a small label, identifies who did what)
- Onboarding / empty-state copy where the metaphor helps comprehension
- Internal debugging (Executions tab in n8n)

The agents do NOT appear in:

- Toasts (say what happened to the buyer, not which agent did it)
- Button labels (the user is approving, not "calling the Nurture Agent")
- KPI subtitles
- Error messages to the user

Same rule for the word **"AI"**. Use sparingly. Once per screen at most. Often you can replace "AI agents" with "the team's assistants" or just drop it.

### 6. Indian-English contractions and tone

Lean toward direct present tense and short clauses. Avoid:

- "Please" — patronizing in operational UI
- "Kindly" — sounds like a 1995 government form
- "ji" — appropriate in WhatsApp drafts to buyers (where it lives in the prompt), not in the dashboard
- "Sir/Madam" — never
- Em-dashes — banned per [[feedback-writing-style]]; use a period, comma, or "·"
- Exclamation marks — reserved for bookings ("🎉 Rahul just booked.")
- "Awesome", "Great", "Nice" — adjectives masquerading as confirmations

### 7. Time is a number, not an adjective

```
✗  Replied super quickly
✓  Replied in 47 seconds

✗  A while ago
✓  4 minutes ago

✗  Soon
✓  Within 60 seconds

✗  Recently
✓  Yesterday
```

Use the `friendlyDate` helper (Today / Tomorrow / Yesterday / Saturday / 12 Jun). Never show raw ISO dates to the user.

## The 5 sentence types Pentahouse writes

### A. The factual headline (sidebar, page title)

Six words or fewer. Confident, plain.

> Today · My deals · Messages to send · Site visits · Inventory · Where wins come from

### B. The eyebrow (above a headline)

Two to four words, uppercase, letter-spaced. Newspaper section feel.

> Desk · Pipeline · Outbound queue · Catalogue · Live wire · Manager call

### C. The subtitle (below a headline, one line)

Fifteen words or fewer. Says exactly what this screen is for.

> "What needs your call, your approval, your eyes."
> "Every booking back-traced to the ad, the score, the visit."

### D. The transactional toast

Five to nine words. Verb-first. Subject is the buyer's name when it adds context.

> "Sent to Rahul on WhatsApp"
> "Skipped — hallucinated detail"
> "3 campaigns drafted"
> "Logged. Concerns extracting."

### E. The activity feed news line

One sentence, lead name first, plain English action. Optional second line with detail and an "Open lead" or "Review" chip. See `humanize.ts` for the canonical patterns.

> "Rahul Mehra just scored. Next step: Schedule site visit."
> "New WhatsApp draft for Smita Joshi. English message, waiting for your approval."
> "🎉 Deepak Choudhary just booked."

## Style audit checklist

Before any copy lands, run it through this list:

- [ ] Could a sales head running a 12-person floor read this in 1.5 seconds?
- [ ] Did I cut every word that did not earn its place?
- [ ] Is there a number where there could have been an adjective?
- [ ] Is the verb in the present tense, leading the sentence?
- [ ] Does it tell the user what to do next, not what just happened in the system?
- [ ] No em-dashes, no "kindly", no "please", no "awesome"?
- [ ] If I read it aloud to a friend who works in real estate sales, would they nod or wince?

## Examples — before and after from the actual codebase

| Surface | Before | After | Why |
|---|---|---|---|
| KPI subtitle | "Industry takes ~5h. You are 383x faster." | "Industry average: 5h. Your team is faster." | Don't show off; cite the number, let them feel it. |
| KPI subtitle | "Tap to review and send →" | "Open Messages to send →" | Verb-first. Names the destination. |
| Activity feed | "What just happened · Live · last N actions by your AI agents" | "What just happened · Last N actions across your team and its assistants" | "Your team" before "its assistants" — humans first. |
| Escalations card | "Nothing on fire 👌" | "All clear." | Emoji-as-emotion is too casual for a sales head. |
| Approvals empty | "Inbox zero. All drafts handled. Take a breath." | "Inbox zero. All drafts handled." | Cut the wellness phrase. |
| Visit log toast | "Got it, visit logged. We'll read your notes and pull out the buyer's main concerns automatically." | "Logged. Concerns extracting." | Three words do the job of twenty. |
| Visit outcome dropdown | "They came and we walked the unit" | "Visit happened" | Short label > narrative label. (Helper text still gives context.) |
| Inventory subtitle | "Paste anything — a paragraph, brochure excerpt, broker note — and the Listing Agent does the typing." | "Paste a project paragraph and we extract the fields. No data entry." | Same value proposition, half the words, no agent-jargon. |
| Add property toast | "Added 'X' to the catalogue · The Listing Agent extracted the fields. The Ad Agent will draft campaigns next." | "X added · Fields extracted. Open the project to draft ad copy." | Don't narrate; instruct. |
| Property empty state | (3 cards) "The Ad Agent uses Gemini to draft platform-specific ad copy for X, with an audience definition and a realistic CPL projection per platform." | "Three platform-specific ad copies for X, with audience and projected CPL for each." | Lead with what they get. Remove agent name and tool name. |
| Visit re-engagement nudge | "Worth a soft follow-up message." | "Time to re-engage. Their interest is not dead yet." | Directness with empathy beats softness. |

## How to write the Hindi WhatsApp drafts

Different audience: the buyer, not the manager. Different voice rules.

- Use **ji** suffix after the buyer's first name in Hindi
- Use **Devanagari** if the buyer wrote in Devanagari; Romanised Hindi only if the buyer wrote Romanised
- One specific next step the buyer can answer in one tap
- No price you cannot back up from the property record
- Length cap 480 characters

These rules live in the Nurture Agent's Gemini system prompt at `build/prompts/nurture_drafting.md`.

## How copy is enforced

- Engineering: only copy that follows this guide ships
- PM: reviews any new screen copy before merge
- The activity feed humaniser (`src/lib/humanize.ts`) and the toast strings are the highest-traffic surfaces — change them with care
- v2 plan: a single `lib/copy.ts` module exporting every user-facing string by key, so a content editor can change voice without code review on every line

## Two sentences that sum this up

> Pentahouse is a private wire service for one sales team. Every sentence should sound like it was written by someone who has met Priya, knows Anjali by name, and has a healthy fear of Rohit's time.
