import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getLead, getMessages, getVisits, getAgentLogs, getProperty,
} from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WhatsAppBubble } from '@/components/WhatsAppBubble';
import { stageColor } from '@/lib/agent-colors';
import { formatLakhs, maskPhone, relativeTime } from '@/lib/format';
import { ChevronLeft, Copy, Check, ChevronDown, Sparkles, AlertCircle, CalendarDays, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { AgentBadge } from '@/components/AgentBadge';
import { LeadJourneyTimeline } from '@/components/LeadJourneyTimeline';
import { ScheduleVisitModal } from '@/components/ScheduleVisitModal';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { useRole } from '@/lib/auth';
import { cn } from '@/lib/utils';

// === Sales-head-readable derivations ===========================================
// The dashboard's audience is a busy sales head, not a data scientist.
// fit_score / urgency_score / confidence are MODEL outputs. We translate them
// into plain English here so the panel reads like a sales briefing, not a chart.

type Heat = {
  emoji: string;
  headline: string;        // "Strong match. Move fast."
  subline: string;         // "Likely to convert if contacted within 24h."
  toneCls: string;         // tailwind colour family
};

function heatFromScore(overall: number, urgency: number): Heat {
  if (overall >= 80) {
    return {
      emoji: '🔥',
      headline: 'Strong match. Move fast.',
      subline: urgency >= 80 ? 'High intent, ready to act this week.' : 'Likely to convert with a personal call.',
      toneCls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    };
  }
  if (overall >= 50) {
    return {
      emoji: '⏱️',
      headline: 'Worth a call this week.',
      subline: 'Mid-fit lead, may need nurture before scheduling a visit.',
      toneCls: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
    };
  }
  return {
    emoji: '💤',
    headline: 'Low fit. Long-term nurture.',
    subline: 'Add to drip, revisit in 4-6 weeks.',
    toneCls: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-400/30',
  };
}

type ConfidenceChip = { label: string; cls: string };
function confidenceChip(c: number): ConfidenceChip {
  if (c >= 75) return { label: 'High confidence',                     cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
  if (c >= 50) return { label: 'Medium confidence',                   cls: 'bg-amber-500/10  text-amber-800 dark:text-amber-300' };
  return { label: 'Low confidence — verify before acting',            cls: 'bg-rose-500/10   text-rose-700  dark:text-rose-300' };
}

// Stage-aware CTA (mirror of the helper in leads.index.tsx). Keeping it local
// to avoid an export round-trip; both files share the same vocabulary.
type StageCta = { label: string; tone: 'action' | 'follow' | 'win' | 'dead' | 'idle' };
function ctaForStage(stage: string, recommended: string | null | undefined): StageCta {
  const action = recommended || '';
  switch (stage) {
    case 'New':
      if (action === 'Disqualify')           return { label: 'Disqualify',         tone: 'dead' };
      if (action === 'Escalate to manager')  return { label: 'Escalate to manager',tone: 'action' };
      if (action === 'Send brochure')        return { label: 'Send brochure',      tone: 'action' };
      if (action === 'Long-term nurture')    return { label: 'Add to nurture',     tone: 'follow' };
      if (action)                             return { label: action,               tone: 'action' };
      return { label: 'Awaiting score',      tone: 'idle' };
    case 'Qualified':
      if (action === 'Long-term nurture')  return { label: 'Send brochure',     tone: 'follow' };
      if (action === 'Send brochure')      return { label: 'Send brochure',     tone: 'action' };
      return { label: 'Schedule site visit', tone: 'action' };
    // After scheduling, the buyer already has the Google Calendar invite + Meet
    // link. There is no separate "confirm" step — the visit IS confirmed. CTA
    // should let the user open the calendar event or jump to logging the outcome
    // once the visit time has passed.
    case 'Visit Scheduled': return { label: 'Open calendar event',  tone: 'follow' };
    case 'Visited':         return { label: 'Send follow-up',     tone: 'follow' };
    case 'Negotiation':     return { label: 'Update offer',       tone: 'action' };
    case 'Booked':          return { label: 'Booked',             tone: 'win'    };
    case 'Lost':            return { label: 'Closed lost',        tone: 'dead'   };
    default:                return { label: action || '—',        tone: 'idle'   };
  }
}
const CTA_TONE_CLS: Record<StageCta['tone'], string> = {
  action: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  follow: 'bg-amber-500  hover:bg-amber-600  text-white',
  win:    'bg-violet-500 hover:bg-violet-600 text-white',
  dead:   'bg-slate-400  text-white',
  idle:   'bg-slate-200  text-slate-600',
};

// Friendly timeline strings (avoid "3 months" jargon)
function urgencyLabel(timeline: string | null | undefined): string {
  if (!timeline) return 'Timeline not shared yet';
  const t = timeline.toLowerCase();
  if (t.includes('immediate') || t.includes('asap') || t.includes('this week')) return 'Wants to close this week';
  if (t.includes('1 month') || t.includes('30 day')) return 'Wants to close within a month';
  if (t.includes('3 month'))                        return 'Closing window: 3 months';
  if (t.includes('6 month'))                        return 'Closing window: 6 months';
  if (t.includes('explor') || t.includes('not sure')) return 'Still exploring — no firm date';
  return `Timeline: ${timeline}`;
}

export const Route = createFileRoute('/leads/$id')({
  loader: async ({ params }) => {
    const lead = await getLead(params.id);
    if (!lead) throw notFound();
    return { lead };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.lead.name} — Lead Detail` },
      { name: 'description', content: `${loaderData.lead.name} · ${loaderData.lead.stage} · ${loaderData.lead.matched_project ?? ''}` },
    ] : [],
  }),
  component: LeadDetail,
});

function LeadDetail() {
  const { lead } = Route.useLoaderData() as { lead: any };
  const role = useRole();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Stage-aware action handler. The button label changes by stage (see ctaForStage);
  // this is what actually happens when the user clicks it.
  const runStageAction = (cta: StageCta) => {
    switch (cta.label) {
      case 'Send brochure':
      case 'Send follow-up':
      case 'Add to nurture':
        toast.message('Draft queued for your approval', { description: 'Find it in Messages to send.' });
        navigate({ to: '/approvals' });
        return;
      case 'Schedule site visit':
        // Open the modal in place — picks date, time, attendees, then creates
        // a real visit row + fires the Visit Calendar webhook to create the
        // Google Calendar event with Meet link.
        setScheduleModalOpen(true);
        return;
      case 'Open calendar event': {
        // After scheduling, the most recent visit row has the calendar URL.
        // Open it in a new tab so the sales head sees the actual Google Calendar
        // event with the Meet link.
        const latest = [...visits].sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const url = latest?.calendar_event_url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          toast.message('Calendar link not stored', {
            description: 'Open /visits to find the visit; the link is added once the n8n Calendar workflow runs.',
          });
          navigate({ to: '/visits' });
        }
        return;
      }
      case 'Confirm visit':
        // Legacy fall-through for any cached state still emitting this label.
        setScheduleModalOpen(true);
        return;
      case 'Update offer':
        toast.message('Offer update flow not wired yet', { description: 'For v1 record the new offer in the conversation manually.' });
        return;
      case 'Escalate to manager':
      case 'Manager call':
        toast.success('Manager notified', { description: 'They will see this lead in Escalations on the Today page.' });
        return;
      case 'Disqualify':
      case 'Closed lost':
        toast.message('No action — this lead is closed.');
        return;
      case 'Booked':
        toast.success('🎉 Already booked — congrats.');
        return;
      default:
        toast.message(cta.label);
    }
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', lead.lead_id],
    queryFn: () => getMessages(lead.lead_id),
    refetchInterval: 5000,
  });
  const { data: visits = [] } = useQuery({
    queryKey: ['visits', lead.lead_id],
    queryFn: () => getVisits(lead.lead_id),
  });
  const { data: allLogs = [] } = useQuery({
    queryKey: ['agentLogs', 200],
    queryFn: () => getAgentLogs(200),
  });
  const logs = allLogs.filter((l: any) => l.lead_id === lead.lead_id);
  const { data: property } = useQuery({
    queryKey: ['property', lead.matched_property_id],
    queryFn: () => getProperty(lead.matched_property_id),
    enabled: !!lead.matched_property_id,
  });

  const copyPhone = () => {
    navigator.clipboard?.writeText(lead.phone);
    setCopied(true);
    toast.success('Phone copied');
    setTimeout(() => setCopied(false), 1500);
  };

  const intentFields: [string, any][] = [
    ['Purpose', lead.purpose],
    ['Budget', formatLakhs(lead.budget_lakhs)],
    ['Config', lead.preferred_config],
    ['City', lead.preferred_city],
    ['Locality', (lead as any).preferred_locality],
    ['Timeline', lead.purchase_timeline],
    ['Loan status', (lead as any).loan_status],
    ['Family size', (lead as any).family_size],
    ['Decision makers', (lead as any).decision_makers],
  ];

  // Sales-head-readable derivations
  const heat       = heatFromScore(lead.overall_score ?? 0, lead.urgency_score ?? 0);
  const conf       = confidenceChip(lead.confidence ?? 0);
  const cta        = ctaForStage(lead.stage, lead.recommended_action);
  const urgencyTxt = urgencyLabel((lead as any).purchase_timeline);
  const lowConfidence = (lead.confidence ?? 0) < 50;
  const fitReasons     = Array.isArray(lead.fit_reasons)     ? lead.fit_reasons.slice(0, 3)     : [];
  const urgencyReasons = Array.isArray(lead.urgency_reasons) ? lead.urgency_reasons.slice(0, 2) : [];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <Link to="/leads" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3" /> Back to pipeline
      </Link>

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <button onClick={copyPhone} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground tabular-nums">
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {lead.phone}
              </button>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{lead.source}</span>
              <Badge variant="outline" className="text-[10px]">{lead.language === 'hi' ? 'HI' : 'EN'}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', stageColor(lead.stage))}>{lead.stage}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score panel — sales-head readable. No radar chart, no raw scores. */}
        <Card className="p-5 lg:col-span-1">
          <div className="eyebrow">The read</div>
          <h2 className="font-display text-xl mt-0.5 mb-4">Should you call this lead?</h2>

          {/* Heat headline */}
          <div className={cn('rounded-lg border p-3 mb-4', heat.toneCls)}>
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none">{heat.emoji}</span>
              <div className="font-semibold text-base leading-tight">{heat.headline}</div>
            </div>
            <div className="text-xs mt-1.5 opacity-90">{heat.subline}</div>
          </div>

          {/* 3-axis score breakdown — Fit, Urgency, Visit Readiness */}
          <div className="mb-4">
            <ScoreBreakdown
              fit={lead.fit_score}
              urgency={lead.urgency_score}
              inboundReplyCount={messages.filter((m: any) => m.direction === 'inbound').length}
              hasConfirmedAttendees={visits.some((v: any) => v.status === 'Confirmed' || v.status === 'Scheduled')}
              loanStatus={(lead as any).loan_status}
              purchaseTimeline={lead.purchase_timeline}
              recommendedAction={lead.recommended_action}
            />
          </div>

          {/* Why this lead matters (synthesised from fit_reasons) */}
          {fitReasons.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Why this lead matters</div>
              <ul className="space-y-1 text-sm leading-snug">
                {fitReasons.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Urgency line */}
          <div className="mb-3 text-sm">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">How urgent</span>
            <div className="mt-0.5">{urgencyTxt}</div>
            {urgencyReasons.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">{urgencyReasons[0]}</div>
            )}
          </div>

          {/* Confidence chip */}
          <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium mb-4', conf.cls)}>
            {lowConfidence && <AlertCircle className="size-3.5" />}
            {conf.label}
          </div>

          {/* Stage-aware primary action (now functional) */}
          <Button
            className={cn('w-full', CTA_TONE_CLS[cta.tone])}
            size="sm"
            onClick={() => runStageAction(cta)}
            disabled={cta.tone === 'win' || cta.tone === 'dead'}
          >
            {cta.tone === 'win' ? '🎉 ' : <Sparkles className="size-3.5 mr-1.5" />}
            {cta.label}
          </Button>

          {/* Low-confidence callout */}
          {lowConfidence && (
            <div className="mt-3 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded p-2">
              The AI flagged this score as uncertain. Read the conversation and verify match before booking your time.
            </div>
          )}

          {/* Matched property */}
          {property && (
            <div className="mt-4 flex gap-3 border-t pt-3">
              <img src={property.image_url} alt={property.project_name} className="size-16 rounded object-cover" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{property.project_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{property.locality}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  ₹{property.price_min_lakhs}L – ₹{property.price_max_lakhs}L
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Intent + Conversation column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">What we know about them</h2>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
              {intentFields.map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
                  <div className="mt-0.5">
                    {value ?? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded px-1.5 py-0.5">
                        <AlertCircle className="size-3" /> Still to ask
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">Conversation</h2>
            <div className="space-y-2 bg-muted/30 -mx-2 px-3 py-4 rounded-lg">
              {messages.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No messages yet.</div>}
              {messages.map((m) => (
                <div key={m.message_id} className="flex">
                  <WhatsAppBubble
                    content={m.content}
                    direction={m.direction}
                    time={m.created_at}
                    status={m.status}
                    language={m.language}
                    className={
                      m.status === 'pending_approval' ? 'border-2 border-amber-400' :
                      m.status === 'rejected' ? 'opacity-60 border border-rose-400' : ''
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule visit modal — opens from the stage-aware CTA */}
      <ScheduleVisitModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        lead={{
          lead_id: lead.lead_id,
          name: lead.name,
          phone: lead.phone,
          matched_property_id: lead.matched_property_id,
          matched_project: lead.matched_project,
        }}
        property={property ? {
          id: property.id,
          project_name: property.project_name,
          locality: property.locality,
          city: property.city,
        } : null}
      />

      {/* Per-lead agent journey — every step the 5 agents took on this lead */}
      <LeadJourneyTimeline leadId={lead.lead_id} />

      {/* Activity — raw agent log. Hidden for sales reps so their view stays jargon-free; sales heads/admins keep the observability. */}
      {role !== 'sales_rep' && (
      <Card className="p-5">
        <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between text-sm font-semibold">
              <span>Agent activity ({logs.length})</span>
              <ChevronDown className={cn('size-4 transition-transform', activityOpen && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {logs.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b last:border-0">
                <AgentBadge name={l.agent_name} />
                <span className="text-muted-foreground">{l.action.replace(/_/g, ' ')}:</span>
                <span className="flex-1">{l.output_summary}</span>
                <span className="text-muted-foreground tabular-nums">{relativeTime(l.created_at)}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </Card>
      )}

      {/* Visits */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Visits ({visits.length})</h2>
        {visits.length === 0 ? (
          <div className="text-xs text-muted-foreground">No visits yet.</div>
        ) : (
          <div className="space-y-3">
            {visits.map((v: any) => (
              <div key={v.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.scheduled_date} · {v.scheduled_time}</span>
                    <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                    {v.calendar_event_url && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                        <CalendarDays className="size-2.5" /> On Google Calendar
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {v.attendees && <span className="text-xs text-muted-foreground">{v.attendees}</span>}
                    {v.calendar_event_url && (
                      <a
                        href={v.calendar_event_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        View in Calendar <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
                {v.objections?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.objections.map((o: string) => (
                      <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>
                    ))}
                  </div>
                )}
                {v.post_visit_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">{v.post_visit_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
