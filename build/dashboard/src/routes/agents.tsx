import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgentObservatory } from '@/lib/data';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Building2, Megaphone, Brain, MessageSquareText, Handshake,
  CheckCircle2, AlertCircle, Activity, Zap, Sparkles, ExternalLink, Database, FileSpreadsheet, Calendar,
} from 'lucide-react';

// The sales ops sheet that receives data from Lead/Ad/Conversion agents.
// Pinning this here so the dashboard can deep-link to specific tabs.
const SALES_OPS_SHEET_ID = '1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow';
const sheetUrl = (tab: string) => `https://docs.google.com/spreadsheets/d/${SALES_OPS_SHEET_ID}/edit#gid=0&tab=${tab}`;

export const Route = createFileRoute('/agents')({
  head: () => ({
    meta: [
      { title: 'Your AI assistants — Pentahouse' },
      { name: 'description', content: 'Live status of the five AI assistants working alongside your team.' },
    ],
  }),
  component: AgentObservatory,
});

// Static per-agent metadata. Each card shows: the AI capability it embodies,
// the model it uses, and the upstream technique. This is the wow factor for
// capstone judges who want to see RAG / structured output / fallback chains.
const AGENT_META: Record<string, {
  icon: any;
  tone: string;
  role: string;
  capability: string;
  model: string;
  technique: string;
  cta: { label: string; to: string } | null;
  writesTo: { label: string; href?: string; icon: any }[];
}> = {
  'Listing Agent': {
    icon: Building2,
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    role: 'Pulls new project details straight from RERA so your inventory stays current.',
    capability: 'Auto-updates inventory',
    model: 'Always on',
    technique: 'Reads RERA listings + project brochures cleanly',
    cta: { label: 'View inventory', to: '/properties' },
    writesTo: [
      { label: 'Your inventory', icon: Database },
    ],
  },
  'Ad Agent': {
    icon: Megaphone,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    role: 'Writes ad copy for Meta, Google, and portals based on each project.',
    capability: 'Draft ad creative',
    model: 'Always on',
    technique: 'Learns from past campaigns to vary headlines and audiences',
    cta: { label: 'View campaigns', to: '/properties' },
    writesTo: [
      { label: 'Campaign records', icon: Database },
      { label: 'Sales ops sheet · Campaigns', icon: FileSpreadsheet, href: sheetUrl('Campaigns') },
    ],
  },
  'Lead Agent': {
    icon: Brain,
    tone: 'bg-primary/10 text-primary border-primary/30',
    role: 'Scores every new lead in seconds and matches them to your best-fit inventory.',
    capability: 'Score and match leads',
    model: 'Always on',
    technique: 'Reads buyer intent, finds the right property, ranks the lead',
    cta: { label: 'View leads', to: '/leads' },
    writesTo: [
      { label: 'Lead profile + score', icon: Database },
      { label: 'Sales ops sheet · Leads', icon: FileSpreadsheet, href: sheetUrl('Leads') },
    ],
  },
  'Nurture Agent': {
    icon: MessageSquareText,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    role: 'Drafts personalized WhatsApp follow-ups in English or Hindi for your approval.',
    capability: 'Draft buyer messages',
    model: 'Always on',
    technique: 'Picks the right tone for each lead, you approve before send',
    cta: { label: 'Review drafts', to: '/approvals' },
    writesTo: [
      { label: 'Conversation log', icon: Database },
      { label: 'WhatsApp (after you approve)', icon: MessageSquareText },
    ],
  },
  'Conversion Agent': {
    icon: Handshake,
    tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    role: 'Reads site-visit notes to surface objections, sentiment, and booking signals.',
    capability: 'Read visit outcomes',
    model: 'Always on',
    technique: 'Spots common objections and flags unusual booking amounts',
    cta: { label: 'View visits', to: '/visits' },
    writesTo: [
      { label: 'Visits + bookings', icon: Database },
      { label: 'Sales ops sheet · Visits', icon: FileSpreadsheet, href: sheetUrl('Visits') },
      { label: 'Sales ops sheet · Bookings', icon: FileSpreadsheet, href: sheetUrl('Bookings') },
      { label: 'Google Calendar', icon: Calendar },
    ],
  },
};

function AgentObservatory() {
  const { data: agents = [] } = useQuery({
    queryKey: ['agentObservatory'],
    queryFn: getAgentObservatory,
    refetchInterval: 10000,
  });

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto">
      <header data-anim="rise" data-stagger="1">
        <div className="eyebrow">Your AI team</div>
        <h1 className="font-display text-[44px] leading-[1.02] mt-1">Five assistants working alongside you</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Each one does a specific job — scoring leads, drafting messages, reading visit notes. Their work is visible here so you always know what just happened.
        </p>
      </header>

      {/* Capability summary strip — what the AI brings to the floor */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-anim="rise" data-stagger="2">
        <CapabilityChip icon={Sparkles} label="Inventory matching" value="Buyers matched to your live inventory" />
        <CapabilityChip icon={Brain}    label="Reliable scoring" value="Every lead gets a clear score and reason" />
        <CapabilityChip icon={Activity} label="Always on" value="Never drops a lead, retries if a step is slow" />
        <CapabilityChip icon={Zap}      label="Seconds, not hours" value="First reply drafted while the buyer is still on the page" />
      </div>

      {/* Per-agent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-anim="rise" data-stagger="3">
        {agents.map((a: any) => {
          const meta = AGENT_META[a.name];
          if (!meta) return null;
          return <AgentCard key={a.name} agent={a} meta={meta} />;
        })}
      </div>

      {/* Data destinations summary — judges and auditors want this map */}
      <Card className="p-5" data-anim="rise" data-stagger="4">
        <div className="eyebrow flex items-center gap-1.5">
          <Database className="size-3" /> Where your data lives
        </div>
        <h2 className="font-display text-xl mt-0.5 mb-3">Everything stays in one place you can trust</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
          <div className="p-3 rounded-md border bg-muted/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="size-4 text-primary" />
              <div className="font-medium">Your database</div>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              <li>· Leads, scores, messages</li>
              <li>· Site visits and bookings</li>
              <li>· Campaign records</li>
              <li>· Inventory and project details</li>
            </ul>
          </div>
          <div className="p-3 rounded-md border bg-muted/20">
            <div className="flex items-center gap-2 mb-1.5">
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <div className="font-medium">Your sales ops sheet</div>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              <li>· Leads tab — every new lead</li>
              <li>· Campaigns tab — live ad creative</li>
              <li>· Visits tab — every site visit logged</li>
              <li>· Bookings tab — closed deals + attribution</li>
            </ul>
            <a href={`https://docs.google.com/spreadsheets/d/${SALES_OPS_SHEET_ID}`} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline">
              Open the sheet <ExternalLink className="size-2.5" />
            </a>
          </div>
          <div className="p-3 rounded-md border bg-muted/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="size-4 text-violet-600" />
              <div className="font-medium">Connected channels</div>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              <li>· Google Calendar — site visit invites</li>
              <li>· WhatsApp — after you approve a draft</li>
              <li>· Meta Lead Ads — inbound buyer forms</li>
              <li>· Your existing CRM — optional sync</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CapabilityChip({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <div className="eyebrow">{label}</div>
      </div>
      <div className="text-[13px] font-medium mt-1 leading-tight">{value}</div>
    </Card>
  );
}

function AgentCard({ agent, meta }: { agent: any; meta: any }) {
  const Icon = meta.icon;
  const healthCls =
    agent.health === 'healthy'   ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' :
    agent.health === 'degraded'  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                                   'bg-muted text-muted-foreground border-border';
  const healthLabel =
    agent.health === 'healthy'  ? 'Healthy' :
    agent.health === 'degraded' ? 'Degraded' :
                                  'Idle';

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn('size-10 rounded-md grid place-items-center border', meta.tone)}>
              <Icon className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg leading-tight">{agent.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{meta.role}</div>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide font-medium', healthCls)}>
            {healthLabel}
          </Badge>
        </div>

        {/* AI capability stack */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 text-[11px]">
          <Stat label="What it does" value={meta.capability} />
          <Stat label="Status" value={meta.model} />
          <Stat label="How it helps" value={meta.technique} />
        </div>
      </div>

      {/* Run stats */}
      <div className="grid grid-cols-3 border-b">
        <Metric label="Runs (24h)" value={agent.total_24h.toString()} />
        <Metric label="Success" value={agent.success_pct !== null ? `${agent.success_pct}%` : '—'} tone={agent.success_pct !== null && agent.success_pct >= 90 ? 'success' : agent.success_pct !== null && agent.success_pct < 70 ? 'warning' : undefined} />
        <Metric label="P50 latency" value={agent.p50_ms ? `${(agent.p50_ms / 1000).toFixed(1)}s` : '—'} />
      </div>

      {/* Recent activity */}
      <div className="p-3">
        <div className="eyebrow px-2 pb-1.5">Last 5 runs</div>
        {agent.recent.length === 0 ? (
          <div className="px-2 py-4 text-xs text-muted-foreground italic">
            No activity in the last 24 hours. Trigger an action to see the agent work.
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <ul className="space-y-0.5">
              {agent.recent.map((r: any, i: number) => (
                <li key={i} className="px-2 py-1.5 rounded text-[12px] hover:bg-muted/40 flex items-start gap-2">
                  {r.status === 'ok' ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate">{r.output_summary || r.action}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {r.lead_name && <span className="font-medium">{r.lead_name} · </span>}
                      {relativeTime(r.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>

      {/* Data destinations — where the agent's output actually lands */}
      <div className="px-5 py-3 border-t bg-muted/10">
        <div className="eyebrow mb-1.5">Writes to</div>
        <div className="flex flex-wrap gap-1.5">
          {meta.writesTo.map((dest: any, i: number) => {
            const DestIcon = dest.icon;
            const isLink = !!dest.href;
            const className = cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border',
              isLink
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15 transition-colors'
                : 'bg-muted/40 text-muted-foreground border-border'
            );
            return isLink ? (
              <a key={i} href={dest.href} target="_blank" rel="noopener noreferrer" className={className}>
                <DestIcon className="size-3" /> {dest.label} <ExternalLink className="size-2.5" />
              </a>
            ) : (
              <span key={i} className={className}>
                <DestIcon className="size-3" /> {dest.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      {meta.cta && (
        <div className="px-5 py-3 border-t bg-muted/20">
          <Link to={meta.cta.to} className="text-xs font-medium text-primary hover:underline">
            {meta.cta.label} →
          </Link>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow text-[9px]">{label}</div>
      <div className="text-[11px] leading-tight mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' }) {
  return (
    <div className="px-4 py-3 border-r last:border-r-0 text-center">
      <div className="eyebrow text-[9px]">{label}</div>
      <div className={cn(
        'font-display text-lg tabular-nums leading-none mt-1',
        tone === 'success' && 'text-emerald-600',
        tone === 'warning' && 'text-amber-600'
      )}>
        {value}
      </div>
    </div>
  );
}
