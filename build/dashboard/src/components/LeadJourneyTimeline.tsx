import { useQuery } from '@tanstack/react-query';
import { getLeadJourney } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Brain, MessageSquareText, Calendar as CalendarIcon, CheckCircle2,
  Handshake, AlertTriangle, UserPlus, FileText, Sparkles,
} from 'lucide-react';

// Friendly labels for source_agent — strips internal naming, keeps sales-friendly words
const FRIENDLY_AGENT: Record<string, string> = {
  'Lead Agent': 'Lead scorer',
  'Nurture Agent': 'Message drafter',
  'Conversion Agent': 'Visit reader',
  'Ad Agent': 'Campaign drafter',
  'Listing Agent': 'Inventory sync',
  'Inbound Reply Agent': 'WhatsApp listener',
  'System': 'Reminder service',
};
function friendlyAgentName(name?: string | null): string {
  if (!name) return '—';
  return FRIENDLY_AGENT[name] || name;
}

// Map event_name -> visual treatment + readable label.
// Single source of truth so the timeline is internally consistent.
const EVENT_META: Record<string, {
  icon: any;
  tone: string;
  label: (payload: any) => string;
  detail?: (payload: any) => string | null;
}> = {
  LEAD_RECEIVED: {
    icon: UserPlus,
    tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20',
    label: () => 'Lead arrived',
    detail: (p) => p?.source ? `From ${p.source}` : null,
  },
  LEAD_SCORED: {
    icon: Brain,
    tone: 'bg-primary/10 text-primary ring-primary/20',
    label: (p) => `Lead scored ${p?.overall_score ?? '—'}`,
    detail: (p) => p?.recommended_action
      ? `Action: ${p.recommended_action}${p.matched_property ? ` · matched ${p.matched_property}` : ''}`
      : null,
  },
  MESSAGE_SENT: {
    icon: MessageSquareText,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    label: (p) => p?.template ? `Sent a ${p.template.replace(/_/g, ' ')} message` : `Sent a message`,
    detail: (p) => p?.preview ? `"${p.preview}…"` : (p?.channel ? `Channel: ${p.channel}` : null),
  },
  VISIT_SCHEDULED: {
    icon: CalendarIcon,
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
    label: (p) => 'Site visit scheduled',
    detail: (p) => p?.date ? `${p.date} at ${p.time ?? 'TBD'}` : null,
  },
  VISIT_COMPLETED: {
    icon: CheckCircle2,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    label: (p) => `Visit completed${p?.sentiment ? ` (${p.sentiment})` : ''}`,
    detail: (p) => Array.isArray(p?.objections) && p.objections.length
      ? `Objections: ${p.objections.join(', ')}` : null,
  },
  VISIT_NO_SHOW: {
    icon: AlertTriangle,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    label: () => 'Visit no-show',
  },
  BOOKING_MADE: {
    icon: Handshake,
    tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
    label: (p) => `Booked${p?.unit ? ` unit ${p.unit}` : ''}`,
    detail: (p) => p?.amount_inr
      ? `Token paid: ₹${(p.amount_inr / 100000).toFixed(1)}L`
      : null,
  },
  ESCALATION_TRIGGERED: {
    icon: AlertTriangle,
    tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20',
    label: (p) => `Escalated to manager${p?.reason ? ` (${p.reason})` : ''}`,
    detail: (p) => p?.note ?? null,
  },
  LISTING_SYNCED: {
    icon: FileText,
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
    label: () => 'Listing synced',
  },
};

export function LeadJourneyTimeline({ leadId }: { leadId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ['leadJourney', leadId],
    queryFn: () => getLeadJourney(leadId),
    refetchInterval: 15000,
  });

  if (events.length === 0) {
    return (
      <Card className="p-5">
        <div className="eyebrow flex items-center gap-1.5">
          <Sparkles className="size-3" /> Agent journey
        </div>
        <h3 className="font-display text-lg mt-1">No agent activity yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          As the 5 agents work on this lead, every step will appear here in order.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3" /> Agent journey
          </div>
          <h3 className="font-display text-lg mt-0.5">{events.length} steps so far</h3>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Read top to bottom
        </div>
      </div>

      <ol className="relative space-y-3.5 pl-7">
        {/* Vertical rail */}
        <div aria-hidden className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

        {events.map((ev: any, i: number) => {
          const meta = EVENT_META[ev.event_name] ?? {
            icon: Sparkles,
            tone: 'bg-muted text-muted-foreground ring-border',
            label: () => ev.event_name,
          };
          const Icon = meta.icon;
          const detail = meta.detail?.(ev.payload);
          const isLast = i === events.length - 1;
          return (
            <li key={i} className="relative">
              <span
                className={cn(
                  'absolute -left-7 top-0.5 size-5 rounded-full ring-2 grid place-items-center',
                  meta.tone,
                  isLast && 'animate-pulse'
                )}
              >
                <Icon className="size-3" />
              </span>
              <div>
                <div className="text-[13px] font-medium leading-tight">{meta.label(ev.payload)}</div>
                {detail && (
                  <div className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{detail}</div>
                )}
                <div className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
                  {friendlyAgentName(ev.source_agent)} · {relativeTime(ev.created_at)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
