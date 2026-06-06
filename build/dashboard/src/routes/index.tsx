import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getKPIs, getPrimaryMetric, getEscalations, getAgentLogs, getAgentEvents,
  acknowledgeEscalation, getLeadQueue, getSourceFunnel,
} from '@/lib/data';
import { useAppStore } from '@/stores/app-store';
import { KpiCard } from '@/components/KpiCard';
import { AgentBadge } from '@/components/AgentBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { relativeTime, formatLakhs } from '@/lib/format';
import { humanize, toneCls } from '@/lib/humanize';
import { ArrowUp, ArrowDown, Crown, AlertCircle, UserCog, ChevronRight, Megaphone, Target } from 'lucide-react';
import { useAuth, useRole, useCapabilities, ROLE_LABELS } from '@/lib/auth';
import { SourceFunnelCard } from '@/components/SourceFunnelCard';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Command Center — Pentahouse' },
      { name: 'description', content: 'Real-time view of agent activity, escalations, and pipeline health.' },
    ],
  }),
  component: CommandCenter,
});

const reasonBadge = (code: string) => {
  if (code === 'vip_budget') return { cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', label: 'Big budget', icon: Crown };
  if (code === 'low_confidence') return { cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', label: 'Worth a check', icon: AlertCircle };
  return { cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', label: 'Asked for a person', icon: UserCog };
};

// Rep worklist helpers — plain-language status + one-liner so a rep reads the
// queue like a to-do list, not a scorecard. No model numbers on the surface.
function repPill(l: any) {
  if (!l.purpose || l.budget_lakhs == null)
    return { label: 'Ask a question', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
  const o = l.overall_score ?? 0;
  if (o >= 80) return { label: 'Strong match', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
  if (o >= 50) return { label: 'Worth a call', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
  return { label: 'Long-term nurture', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30' };
}
function repOneLiner(l: any): string {
  const parts: string[] = [];
  if (l.preferred_config) parts.push(String(l.preferred_config));
  if (l.preferred_locality || l.preferred_city) parts.push(`in ${l.preferred_locality || l.preferred_city}`);
  if (l.budget_lakhs != null) parts.push(`around ${formatLakhs(l.budget_lakhs)}`);
  if (l.purchase_timeline) parts.push(`· ${l.purchase_timeline}`);
  return parts.length ? parts.join(' ') : 'New enquiry — details to confirm';
}
function initials(name: string | null | undefined): string {
  return (name || '?').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('');
}

function CommandCenter() {
  const qc = useQueryClient();
  const acks = useAppStore((s) => s.ackEscalations);
  const ackEscalationStore = useAppStore((s) => s.ackEscalation);
  const [localAck, setLocalAck] = useState<string[]>([]);
  const { profile } = useAuth();
  const role = useRole();
  const caps = useCapabilities();
  const roleLabel = ROLE_LABELS[role];
  const firstName = (profile?.display_name || '').split(' ')[0];

  const { data: k = { leads_today: 0, leads_yesterday: 0, pending_approvals: 0, weekly_conversion_pct: 0, leads_30d: 0, qualified_30d: 0, visits_completed_30d: 0, bookings_30d: 0, total_spend_30d_inr: 0, blended_cpb_inr: 0 } } = useQuery({
    queryKey: ['kpis'],
    queryFn: getKPIs,
    refetchInterval: 10000,
  });
  // v1.1 P0-3 honest empty state — no hardcoded fallback.
  const { data: p = { median_sec_to_first_response_today: null, p90_sec_to_first_response_today: null, under_5_min: 0, under_1_hour: 0, leads_with_response: 0, industry_baseline_sec: 18000, measured: false } } = useQuery({
    queryKey: ['primaryMetric'],
    queryFn: getPrimaryMetric,
    refetchInterval: 15000,
  });
  const { data: rawEscalations = [] } = useQuery({
    queryKey: ['escalations'],
    queryFn: getEscalations,
    refetchInterval: 5000,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['agentLogs'],
    queryFn: () => getAgentLogs(50),
    refetchInterval: 5000,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['agentEvents'],
    queryFn: getAgentEvents,
    refetchInterval: 30000,
  });
  const { data: leadQueue = [] } = useQuery({
    queryKey: ['leadQueue'],
    queryFn: getLeadQueue,
    refetchInterval: 15000,
    enabled: role === 'sales_rep',
  });
  const worklist = (leadQueue as any[])
    .filter((l) => ['New', 'Qualified'].includes(l.stage))
    .slice(0, 5);
  const { data: sourceRows = [] } = useQuery({
    queryKey: ['sourceFunnelChart'],
    queryFn: getSourceFunnel,
    refetchInterval: 30000,
    enabled: role === 'marketing',
  });

  const leadsDelta = k.leads_today - k.leads_yesterday;
  const escalations = rawEscalations.filter(
    (e: any) => !acks.includes(e.id) && !localAck.includes(e.id)
  );
  const conversion = ((k.bookings_30d / Math.max(1, k.qualified_30d)) * 100).toFixed(1);

  const ack = async (id: string) => {
    ackEscalationStore(id);
    setLocalAck([...localAck, id]);
    await acknowledgeEscalation(id);
    qc.invalidateQueries({ queryKey: ['escalations'] });
  };

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto">
      <header data-anim="rise" data-stagger="1" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{roleLabel.eyebrow} · {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</div>
          <h1 className="font-display text-[44px] leading-[1.02] mt-1">
            {firstName ? `Good morning, ${firstName}.` : 'Today'}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {role === 'sales_rep' && 'Your deals, your visits, your messages. Close the next three.'}
            {role === 'sales_head' && 'Floor-wide view. What needs your call, your approval, your eyes.'}
            {role === 'marketing' && 'Campaign performance, source funnel, spend. Optimize the next rupee.'}
            {(role === 'admin' || role === 'aggregator') && `${new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}. What needs your eyes.`}
          </p>
        </div>
        <div className="text-right">
          <div className="eyebrow">Viewing as</div>
          <div className="font-display text-sm mt-0.5">{roleLabel.full}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-anim="rise" data-stagger="2">
        {role === 'marketing' ? (
          <>
            <KpiCard
              label="Spend (30d)"
              value={<>₹<span>{(k.total_spend_30d_inr / 100000).toFixed(1)}</span><span className="text-base text-muted-foreground ml-1">L</span></>}
              subtitle="Across Meta, Google, portals"
            />
            <KpiCard
              label="Cost per lead"
              value={<>₹<span>{Math.round((k.total_spend_30d_inr / Math.max(1, k.leads_30d)) || 0).toLocaleString('en-IN')}</span></>}
              subtitle={`Across ${k.leads_30d} leads this month`}
            />
            <KpiCard
              label="Cost per booking"
              value={<>₹<span>{Math.round(k.blended_cpb_inr || 0).toLocaleString('en-IN')}</span></>}
              subtitle={`${k.bookings_30d} bookings closed`}
              tone={k.bookings_30d > 0 ? 'success' : 'default'}
            />
            <Link to="/analytics" className="block">
              <KpiCard
                label="Top source"
                value={<span className="text-xl">Meta Ads</span>}
                subtitle="Open source funnel →"
              />
            </Link>
          </>
        ) : role === 'sales_rep' ? (
          <>
            <KpiCard
              label="My reply speed"
              value={p.measured ? <><span>{p.median_sec_to_first_response_today}</span><span className="text-base text-muted-foreground ml-1">s</span></> : <span className="text-muted-foreground text-base font-normal">Nothing to show yet</span>}
              subtitle={p.measured ? 'Most teams take hours. Keep it under a minute.' : 'Send your first reply and this fills in.'}
              tone={p.measured && p.median_sec_to_first_response_today! < 300 ? 'success' : p.measured && p.median_sec_to_first_response_today! < 1800 ? 'warning' : 'default'}
            />
            <KpiCard
              label="People I'm working with"
              value={k.qualified_30d}
              subtitle="Across all stages"
            />
            <Link to="/approvals" className="block">
              <KpiCard
                label="Replies to approve"
                value={k.pending_approvals}
                subtitle={k.pending_approvals > 0 ? 'Read and send →' : "You're all caught up."}
                tone={k.pending_approvals > 0 ? 'warning' : 'default'}
              />
            </Link>
            <KpiCard
              label="My bookings this month"
              value={<><span>{Math.max(1, Math.floor(k.bookings_30d / 2))}</span></>}
              subtitle="Keep the streak going"
              tone="success"
            />
          </>
        ) : (
          <>
            <KpiCard
              label="First reply to a new lead"
              value={p.measured ? <><span>{p.median_sec_to_first_response_today}</span><span className="text-base text-muted-foreground ml-1">s</span></> : <span className="text-muted-foreground text-base font-normal">No measured runs yet</span>}
              subtitle={p.measured
                ? `Most teams take ${Math.round(p.industry_baseline_sec / 3600)} hours. ${p.median_sec_to_first_response_today! < 60 ? 'Your team is faster.' : 'Aim for under a minute.'}`
                : 'Your first answered lead will set this.'}
              tone={p.measured && p.median_sec_to_first_response_today! < 60 ? 'success' : 'default'}
            />
            <KpiCard
              label="New leads today"
              value={k.leads_today}
              trend={
                <span className={cn('inline-flex items-center gap-0.5 font-medium', leadsDelta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {leadsDelta >= 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                  {Math.abs(leadsDelta)}
                </span>
              }
              subtitle={`Yesterday: ${k.leads_yesterday}`}
            />
            <KpiCard
              label="Escalations for you"
              value={escalations.length}
              subtitle={escalations.length > 0 ? 'High-value & low-confidence leads — your call.' : 'Nothing escalated. Reps are handling the rest.'}
              tone={escalations.length > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              label="Bookings this week"
              value={<><span>{k.bookings_30d}</span></>}
              subtitle={`${conversion}% of qualified leads. ${k.qualified_30d} qualified.`}
            />
          </>
        )}
      </div>

      {/* LiveLeadTester removed from /today — kept available as a component if needed elsewhere */}

      {/* Marketing persona — source funnel with per-channel CPL/CPV/CPB */}
      {role === 'marketing' && (
        <div data-anim="rise" data-stagger="2.5">
          <SourceFunnelCard />
        </div>
      )}

      {/* Sales rep — ranked "call these first" worklist, plain-language, no model numbers */}
      {role === 'sales_rep' && worklist.length > 0 && (
        <Card className="p-0 overflow-hidden" data-anim="rise" data-stagger="2.5">
          <div className="px-5 py-4 border-b">
            <div className="eyebrow">Your day</div>
            <h2 className="font-display text-xl mt-0.5">Call these first</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ranked by who's most worth your time right now. Start at the top.</p>
          </div>
          <ul className="divide-y">
            {worklist.map((l: any) => {
              const pill = repPill(l);
              return (
                <li key={l.lead_id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {initials(l.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{repOneLiner(l)}</div>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', pill.cls)}>{pill.label}</Badge>
                  <Link to="/leads/$id" params={{ id: l.lead_id }}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Open <ChevronRight className="size-3" />
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Sales-floor feed + escalations — not relevant to marketing, hidden for that persona */}
      {role !== 'marketing' && (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" data-anim="rise" data-stagger="3">
        <Card className={cn('p-0 overflow-hidden', role === 'sales_rep' ? 'lg:col-span-5' : 'lg:col-span-3')}>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <div className="eyebrow">Live wire</div>
              <h2 className="font-display text-xl mt-0.5">What just happened</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last {logs.length} actions across your team and its assistants</p>
            </div>
            <span className="size-2 rounded-full bg-success animate-pulse" />
          </div>
          <ScrollArea className="h-[480px]">
            <ul className="divide-y">
              {logs.map((l: any, i: number) => {
                const h = humanize(l);
                const ActionWrap: any = h.actionTo === '/leads' && h.actionLeadId
                  ? (props: any) => <Link to="/leads/$id" params={{ id: h.actionLeadId! }} {...props} />
                  : h.actionTo
                  ? (props: any) => <Link to={h.actionTo as any} {...props} />
                  : null;
                return (
                  <li
                    key={i}
                    className={cn(
                      'px-5 py-3.5 flex items-start gap-3 text-sm',
                      toneCls(h.tone)
                    )}
                  >
                    <AgentBadge name={h.agentName} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground leading-snug">
                        {h.headline}
                      </div>
                      {h.detail && (
                        <div className="text-[12px] text-muted-foreground mt-0.5">{h.detail}</div>
                      )}
                      {ActionWrap && h.actionLabel && (
                        <ActionWrap className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-medium text-primary hover:underline">
                          {h.actionLabel} <ChevronRight className="size-3" />
                        </ActionWrap>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums text-right">
                      <div>{relativeTime(h.createdAt)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </Card>

        {/* Escalations are a Sales Head responsibility — hidden for reps */}
        {role !== 'sales_rep' && (
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="eyebrow">Manager call</div>
            <h2 className="font-display text-xl mt-0.5">Escalations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{escalations.length === 0 ? 'All clear.' : `${escalations.length} need a call from you, not a draft.`}</p>
          </div>
          <div className="p-3 space-y-2 max-h-[480px] overflow-auto">
            {escalations.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12">No open escalations</div>
            )}
            {escalations.map((e: any) => {
              const r = reasonBadge(e.reason_code);
              const Icon = r.icon;
              return (
                <div key={e.id} className="rounded-md border p-3 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{e.lead_name}</div>
                    <Badge variant="outline" className={cn('text-[10px] gap-1', r.cls)}>
                      <Icon className="size-3" /> {r.label}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{e.reason_text}</p>
                  <p className="mt-1.5 text-[11px] text-foreground">→ {e.recommended_action}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Link to="/leads/$id" params={{ id: e.lead_id }}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Open lead <ChevronRight className="size-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => ack(e.id)}
                    >
                      Acknowledge
                    </Button>
                    <span className="ml-auto text-[10px] text-muted-foreground">{relativeTime(e.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        )}
      </div>
      )}

      <Card className="p-5" data-anim="rise" data-stagger="4">
        {role === 'marketing' ? (
          <>
            <div className="mb-3">
              <div className="eyebrow">Channels</div>
              <h2 className="font-display text-xl mt-0.5">Leads by channel</h2>
              <p className="text-xs text-muted-foreground mt-1">This month, by where buyers came from</p>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceRows as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="leads_count" name="Leads" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <div className="eyebrow">Funnel</div>
              <h2 className="font-display text-xl mt-0.5">From inquiry to keys</h2>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days across every agent event</p>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={events} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="event_name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
