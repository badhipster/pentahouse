import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeadQueue } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScoreBar } from '@/components/ScoreBars';
import { EmptyState } from '@/components/EmptyState';
import { stageColor, STAGES } from '@/lib/agent-colors';
import { maskPhone, relativeTime, formatLakhs } from '@/lib/format';
import { useAppStore } from '@/stores/app-store';
import {
  DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Search, LayoutGrid, List, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useRole, useCapabilities } from '@/lib/auth';

export const Route = createFileRoute('/leads/')({
  head: () => ({
    meta: [
      { title: 'Lead Pipeline — Pentahouse' },
      { name: 'description', content: 'Kanban and table views of all leads across stages.' },
    ],
  }),
  component: LeadsIndex,
});

function LeadsIndex() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const stageOverrides = useAppStore((s) => s.stageOverrides);
  const setStage = useAppStore((s) => s.setStage);
  const { user, profile } = useAuth();
  const role = useRole();
  const caps = useCapabilities();

  const { data: queue = [] } = useQuery({
    queryKey: ['leadQueue', role, user?.id],
    queryFn: getLeadQueue,
    refetchInterval: 10000,
  });

  // Role gate: sales_rep sees only their own leads (assigned_to = self).
  // sales_head, marketing, admin see everything.
  const scopedQueue = useMemo(() => {
    if (caps.showsAllLeads) return queue;
    if (!user?.id) return [];
    return queue.filter((l: any) => l.assigned_to === user.id);
  }, [queue, caps.showsAllLeads, user?.id]);

  const sources = useMemo(
    () => Array.from(new Set(scopedQueue.map((l: any) => l.source).filter(Boolean))) as string[],
    [scopedQueue]
  );
  const cities = useMemo(
    () => Array.from(new Set(scopedQueue.map((l: any) => l.preferred_city).filter(Boolean))) as string[],
    [scopedQueue]
  );

  const leads = useMemo(() => {
    return scopedQueue
      .map((l: any) => ({ ...l, stage: stageOverrides[l.lead_id] ?? l.stage }))
      .filter((l: any) => {
        const q = search.toLowerCase();
        if (q && !((l.name ?? '').toLowerCase().includes(q) || (l.phone ?? '').includes(q))) return false;
        if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
        if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
        if (cityFilter !== 'all' && l.preferred_city !== cityFilter) return false;
        return true;
      });
  }, [scopedQueue, search, stageFilter, sourceFilter, cityFilter, stageOverrides]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over && e.active) setStage(String(e.active.id), String(e.over.id));
  };

  const activeLead = leads.find((l) => l.lead_id === activeId);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4" data-anim="rise" data-stagger="1">
        <div>
          <div className="eyebrow">{role === 'sales_rep' ? 'My pipeline' : 'Floor pipeline'}</div>
          <h1 className="font-display text-[40px] leading-[1.05] mt-1">
            {role === 'sales_rep' ? 'My deals' : role === 'marketing' ? 'Lead funnel' : 'Leads'}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {role === 'sales_rep'
              ? `${leads.length} assigned to you · drag a card to change its stage`
              : `${leads.length} leads across ${profile?.display_name ? 'the floor' : 'all reps'} · drag a card to change its stage`}
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/30">
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
            className="h-7"
          >
            <LayoutGrid className="size-3.5" /> Kanban
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('table')}
            className="h-7"
          >
            <List className="size-3.5" /> Table
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <FilterSelect label="Stage" value={stageFilter} onChange={setStageFilter} options={STAGES as readonly string[]} />
        <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={sources} />
        <FilterSelect label="City" value={cityFilter} onChange={setCityFilter} options={cities} />
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title={role === 'sales_rep' && scopedQueue.length === 0 ? 'No leads assigned to you yet' : 'No leads in this view'}
          hint={role === 'sales_rep' && scopedQueue.length === 0
            ? 'Your sales head assigns leads to you. Once assigned, each one appears here with its AI score and recommended next step.'
            : 'Try clearing filters.'}
        />
      ) : view === 'kanban' ? (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-3 overflow-x-auto pb-3">
            {STAGES.filter((s) => s !== 'Booked' && s !== 'Lost').map((stage) => {
              const items = leads.filter((l) => l.stage === stage);
              return <KanbanColumn key={stage} stage={stage} items={items} />;
            })}
          </div>
          <DragOverlay>{activeLead && <LeadCard lead={activeLead} dragging />}</DragOverlay>
        </DndContext>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Config</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Match</TableHead>
                <TableHead className="text-right">Heat</TableHead>
                <TableHead>What to do next</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.lead_id} className="cursor-pointer">
                  <TableCell>
                    <Link to="/leads/$id" params={{ id: l.lead_id }} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{l.source}</TableCell>
                  <TableCell className="text-xs">{l.preferred_city ?? '—'}</TableCell>
                  <TableCell className="text-xs">{l.preferred_config ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatLakhs(l.budget_lakhs)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{l.fit_score}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{l.urgency_score}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.recommended_action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', stageColor(l.stage))}>{l.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{relativeTime(l.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function KanbanColumn({ stage, items }: { stage: string; items: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div className="shrink-0 w-72">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-[10px]', stageColor(stage))}>{stage}</Badge>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-lg p-2 min-h-[200px] space-y-2 border-2 border-dashed transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
        )}
      >
        {items.map((l) => (
          <DraggableLead key={l.lead_id} lead={l} />
        ))}
      </div>
    </div>
  );
}

function DraggableLead({ lead }: { lead: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.lead_id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-30')}>
      <LeadCard lead={lead} />
    </div>
  );
}

function heatFor(score: number) {
  if (score >= 80) return { icon: '🔥', label: 'Hot', cardCls: 'border-l-4 border-l-rose-500' };
  if (score >= 50) return { icon: '⏱️', label: 'Warm', cardCls: 'border-l-4 border-l-amber-500' };
  return { icon: '💤', label: 'Cold', cardCls: 'border-l-4 border-l-slate-400' };
}

// Stage-aware CTA: the displayed action depends on where the deal IS, not just what the
// scoring agent recommended at intake. A Visit Scheduled card should not say "Schedule site visit".
type StageCta = {
  label: string;
  tone: 'action' | 'follow' | 'win' | 'dead' | 'idle';
};

function ctaForStage(stage: string, recommended: string | null | undefined): StageCta {
  const action = recommended || '';
  switch (stage) {
    case 'New':
      if (action === 'Disqualify')          return { label: 'Disqualify',         tone: 'dead' };
      if (action === 'Escalate to manager') return { label: 'Manager call',       tone: 'action' };
      if (action === 'Send brochure')       return { label: 'Send brochure',      tone: 'action' };
      if (action === 'Long-term nurture')   return { label: 'Add to nurture',     tone: 'follow' };
      if (action)                            return { label: action,               tone: 'action' };
      return { label: 'Awaiting score',     tone: 'idle' };
    case 'Qualified':
      // Promote toward a visit unless the scorer said otherwise
      if (action === 'Long-term nurture') return { label: 'Send brochure',     tone: 'follow' };
      if (action === 'Send brochure')     return { label: 'Send brochure',     tone: 'action' };
      return { label: 'Schedule site visit', tone: 'action' };
    case 'Visit Scheduled':
      // Schedule and confirm are the same action — the calendar invite IS the
      // confirmation. After scheduling, the next meaningful action is opening
      // the Google Calendar event (Meet link, location, attendees) or jumping
      // to the visit detail to log the outcome once it has happened.
      return { label: 'View visit',        tone: 'follow' };
    case 'Visited':
      return { label: 'Send follow-up',    tone: 'follow' };
    case 'Negotiation':
      return { label: 'Update offer',      tone: 'action' };
    case 'Booked':
      return { label: 'Booked',            tone: 'win' };
    case 'Lost':
      return { label: 'Closed lost',       tone: 'dead' };
    default:
      return { label: action || '—',       tone: 'idle' };
  }
}

const CTA_TONE_CLS: Record<StageCta['tone'], string> = {
  action: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  follow: 'bg-amber-500/10  text-amber-800  dark:text-amber-300',
  win:    'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  dead:   'bg-slate-500/10  text-slate-600  dark:text-slate-400',
  idle:   'bg-slate-500/5   text-muted-foreground'
};

function LeadCard({ lead, dragging }: { lead: any; dragging?: boolean }) {
  const heat = heatFor(lead.urgency_score ?? 0);
  const cta = ctaForStage(lead.stage, lead.recommended_action);
  // Build a one-line intent summary: 3BHK · 1.2Cr · Hinjewadi
  const intentBits = [
    lead.preferred_config,
    lead.budget_lakhs ? formatLakhs(lead.budget_lakhs) : null,
    (lead as any).preferred_locality || lead.preferred_city,
  ].filter(Boolean);
  return (
    <Link to="/leads/$id" params={{ id: lead.lead_id }} onClick={(e) => dragging && e.preventDefault()}>
      <Card className={cn(
        'p-3.5 hover:border-primary/50 transition-colors cursor-grab',
        heat.cardCls,
        dragging && 'shadow-lg ring-2 ring-primary'
      )}>
        {/* Name + heat icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[15px] leading-tight truncate">{lead.name}</div>
          <span className="text-lg shrink-0 leading-none" title={heat.label} aria-label={heat.label}>{heat.icon}</span>
        </div>

        {/* Phone (full, not masked — the rep needs to call) + source */}
        <div className="text-[11.5px] text-muted-foreground tabular-nums mt-1 truncate">
          {lead.phone || '—'} · {lead.source || 'Direct'}
        </div>

        {/* What they want — quick context */}
        {intentBits.length > 0 && (
          <div className="text-[12px] text-foreground/80 mt-1.5 truncate">
            {intentBits.join(' · ')}
          </div>
        )}

        {/* Scores */}
        <div className="mt-2.5 space-y-1">
          <ScoreBar label="Match" value={lead.fit_score} tone="emerald" />
          <ScoreBar label="Heat" value={lead.urgency_score} tone="indigo" />
        </div>

        {/* CTA — the next action */}
        <div className={cn(
          'mt-3 px-2.5 py-1.5 text-[12px] font-medium rounded text-center',
          CTA_TONE_CLS[cta.tone]
        )}>
          {cta.tone === 'win' ? '🎉 ' : ''}{cta.label}
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">{relativeTime(lead.created_at)}</div>
      </Card>
    </Link>
  );
}
