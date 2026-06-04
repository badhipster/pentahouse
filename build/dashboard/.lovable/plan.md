## Goal

Build the inside-sales manager dashboard described in the attached prompt as a frontend-only app, with fixtures as the single source of truth and a thin `data.ts` adapter so a future backend swap touches only one file.

## Stack adaptation

The prompt asks for Next.js 14 App Router. This project is **TanStack Start v1** (Vite + file-based routes under `src/routes/`). I'll preserve the intent — file-based routing, RSC-equivalent loaders, shadcn/ui, Tailwind, Zustand, Recharts — and adapt paths:

- `app/page.tsx` → `src/routes/index.tsx`
- `app/leads/page.tsx` → `src/routes/leads.index.tsx`
- `app/leads/[id]/page.tsx` → `src/routes/leads.$id.tsx`
- `app/approvals/page.tsx` → `src/routes/approvals.tsx`
- `app/visits/page.tsx` → `src/routes/visits.tsx`
- `app/analytics/page.tsx` → `src/routes/analytics.tsx`
- `lib/fixtures.ts` → `src/lib/fixtures.ts` (verbatim)
- `lib/data.ts` → `src/lib/data.ts` (verbatim, plus `markVisitCompleted`)
- `globals.css` font additions go into `src/styles.css`

Persistent sidebar + topbar live in `src/routes/__root.tsx` (keeping its existing `<Outlet />`).

## Files to create

**Data layer**
- `src/lib/fixtures.ts` — paste fixtures verbatim including `daysAgo/hoursAgo/minutesAgo/daysAgoDate/daysFromNowDate` helpers
- `src/lib/data.ts` — exports listed in the prompt + `markVisitCompleted`
- `src/lib/format.ts` — INR formatting (`₹X,XX,XXX`), phone masking, relative time
- `src/lib/agent-colors.ts` — agent → badge color map

**State**
- `src/stores/approvals.ts` — Zustand: focused message id, optimistic-removed ids, stage overrides for kanban drag

**Shell**
- `src/components/shell/Sidebar.tsx` — 5 nav items with lucide icons
- `src/components/shell/Topbar.tsx` — Cmd+K palette (shadcn Command), notifications bell with escalation count, avatar
- `src/components/shell/CommandPalette.tsx` — searches leads + properties (finds "Whitefield")
- Update `src/routes/__root.tsx` to render Sidebar + Topbar around `<Outlet />`, keep error/notfound boundaries, add QueryClientProvider + Sonner Toaster

**Screens**
- `src/routes/index.tsx` (Command Center): 4 KPI cards, Agent Activity Feed (60%), Escalations (40%), Recharts BarChart of agent_events
- `src/routes/leads.index.tsx`: filters, Kanban/Table toggle, drag-and-drop stage updates via Zustand
- `src/routes/leads.$id.tsx`: header, Score panel with RadarChart, Intent panel, WhatsApp conversation, Activity, Visits
- `src/routes/approvals.tsx`: two-pane queue + focused card, keyboard shortcuts (A/E/R/J/K/↑↓/Esc), optimistic remove with 200ms transition, toast
- `src/routes/visits.tsx`: date range picker, Upcoming/Awaiting/Recent cards, Sheet form for outcome with stubbed objections toast
- `src/routes/analytics.tsx`: top strip, Source ROI table (sortable, expandable), bookings BarChart, Model accuracy eval card

**Components**
- `src/components/KpiCard.tsx`, `AgentBadge.tsx`, `ScoreBars.tsx`, `WhatsAppBubble.tsx`, `LeadCard.tsx` (kanban), `EmptyState.tsx`, skeleton variants

## Design tokens

Update `src/styles.css`:
- Add Devanagari font stack to body
- Add `.tabular-nums` utility
- Map design tokens to the requested palette: primary `emerald-600`, accent `indigo-600`, warning `amber-500`, danger `rose-600`, bg `zinc-50`/`zinc-900` for light/dark via `oklch` values
- Add agent badge color tokens (slate, violet, emerald, blue, orange, zinc)

Both light and dark mode supported. Components consume semantic tokens (`bg-primary`, `text-destructive`, etc.), not raw colors.

## Dependencies to install

`zustand`, `recharts`, `@dnd-kit/core`, `@dnd-kit/sortable`, `date-fns`. Sonner, lucide-react, and all required shadcn primitives (Button, Card, Dialog, Badge, Input, Tabs, Sheet, Command, ScrollArea, Separator, Select, Textarea, Popover, Calendar, Table, DropdownMenu, Toast/Sonner) are already in `src/components/ui/`.

## Acceptance checklist (will verify after build)

1. `/approvals` shows 3 pending messages: Smita, Anant, Imran (HI)
2. Pressing `A` removes focused card in ~200ms + toast
3. `/leads/lead-28` shows Deepak's booking + completed visit
4. `/analytics` sorts CP Referral with lowest CPB by default
5. `/` shows 11 activity rows and 3 escalations (2 open, 1 acknowledged)
6. Cmd+K finds "Whitefield" (matches Whitefield Verdant property + linked leads)
7. Light/dark both render cleanly

## Out of scope

No Supabase, no auth, no real API, no chatbot. No fixture-shape changes.

## Build order

1. Install deps, write fixtures + data.ts + format helpers + design tokens
2. Build shell (sidebar, topbar, command palette, root layout)
3. Approvals (hero screen) first — keyboard shortcuts, toast, optimistic remove
4. Command Center
5. Lead Pipeline + Lead Detail
6. Visits
7. Analytics
8. Run acceptance checks
