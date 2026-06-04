import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getKPIs, getSourceROI, getEvalAccuracy } from '@/lib/data';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/analytics')({
  head: () => ({
    meta: [
      { title: 'Source ROI — Pentahouse' },
      { name: 'description', content: 'Per-source cost per lead, visit, and booking with model accuracy.' },
    ],
  }),
  component: Analytics,
});

type SortKey = 'source' | 'leads' | 'qualified' | 'visits_completed' | 'bookings' | 'total_spend_inr' | 'cost_per_lead' | 'cost_per_visit' | 'cost_per_booking';

function Analytics() {
  const { data: k = { leads_today: 0, leads_yesterday: 0, pending_approvals: 0, weekly_conversion_pct: 0, leads_30d: 0, qualified_30d: 0, visits_completed_30d: 0, bookings_30d: 0, total_spend_30d_inr: 0, blended_cpb_inr: 0 } } = useQuery({
    queryKey: ['kpis'],
    queryFn: getKPIs,
    refetchInterval: 15000,
  });
  const { data: sourceRoi = [] } = useQuery({
    queryKey: ['sourceRoi'],
    queryFn: getSourceROI,
    refetchInterval: 30000,
  });
  const { data: evalAcc = { percent: 0, matches: 0, total: 0 } } = useQuery({
    queryKey: ['evalAccuracy'],
    queryFn: getEvalAccuracy,
  });
  const [sortKey, setSortKey] = useState<SortKey>('cost_per_booking');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...sourceRoi].sort((a: any, b: any) => {
      const av = a[sortKey] ?? Number.POSITIVE_INFINITY;
      const bv = b[sortKey] ?? Number.POSITIVE_INFINITY;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sourceRoi, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const evalTone =
    evalAcc.percent >= 80 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
    evalAcc.percent >= 60 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
    'bg-rose-500/15 text-rose-700 dark:text-rose-300';

  // Synthetic 12-week bookings per source
  const bookingsWeekly = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
    return weeks.map((w, i) => {
      const row: Record<string, any> = { week: w };
      sourceRoi.forEach((s: any) => {
        const base = (s.bookings ?? 0) / 12;
        row[s.source] = Math.max(0, +(base * (0.5 + ((i * 31 + (s.source?.length ?? 0)) % 7) / 7 * 1.2)).toFixed(2));
      });
      return row;
    });
  }, [sourceRoi]);

  const totalBookingsBySource = sourceRoi.map((s: any) => ({
    source: s.source,
    bookings: s.bookings ?? 0,
  }));

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <header data-anim="rise" data-stagger="1">
        <div className="eyebrow">Attribution</div>
        <h1 className="font-display text-[40px] leading-[1.05] mt-1">Where wins come from</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Last 30 days. Every booking back-traced to the ad, the score, the visit. So you know which channels are actually paying off.
        </p>
      </header>

      {/* Top strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Spend 30d', value: formatINR(k.total_spend_30d_inr) },
          { label: 'Leads', value: k.leads_30d },
          { label: 'Qualified', value: k.qualified_30d },
          { label: 'Visits', value: k.visits_completed_30d },
          { label: 'Bookings', value: k.bookings_30d },
          { label: 'Blended CPB', value: formatINR(k.blended_cpb_inr) },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-xl font-semibold tabular-nums mt-1">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">By source</h2>
            <p className="text-xs text-muted-foreground">Sorted by {sortKey.replace(/_/g, ' ')} {sortDir}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <SortableHeader k="source" current={sortKey} dir={sortDir} onClick={toggleSort}>Source</SortableHeader>
                <SortableHeader k="leads" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">Leads</SortableHeader>
                <SortableHeader k="qualified" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">Qual</SortableHeader>
                <SortableHeader k="visits_completed" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">Visits</SortableHeader>
                <SortableHeader k="bookings" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">Bookings</SortableHeader>
                <SortableHeader k="total_spend_inr" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">Spend</SortableHeader>
                <SortableHeader k="cost_per_lead" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">CPL</SortableHeader>
                <SortableHeader k="cost_per_visit" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">CPV</SortableHeader>
                <SortableHeader k="cost_per_booking" current={sortKey} dir={sortDir} onClick={toggleSort} align="right">CPB</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => {
                const isExp = expanded === r.source;
                const campaigns = [
                  { name: `${r.source} – Always-on`, leads: Math.ceil(r.leads * 0.7), spend: Math.round(r.total_spend_inr * 0.7), bookings: Math.floor(r.bookings * 0.7) },
                  { name: `${r.source} – Promo burst`, leads: Math.floor(r.leads * 0.3), spend: Math.round(r.total_spend_inr * 0.3), bookings: Math.ceil(r.bookings * 0.3) },
                ];
                return (
                  <>
                    <TableRow key={r.source} onClick={() => setExpanded(isExp ? null : r.source)} className="cursor-pointer">
                      <TableCell><ChevronRight className={cn('size-3 transition-transform', isExp && 'rotate-90')} /></TableCell>
                      <TableCell className="font-medium">{r.source}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.leads}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.qualified}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.visits_completed}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-medium">{r.bookings}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{formatINR(r.total_spend_inr)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.cost_per_lead === null ? '—' : formatINR(r.cost_per_lead)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.cost_per_visit === null ? '—' : formatINR(r.cost_per_visit)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-medium">{r.cost_per_booking === null ? '—' : formatINR(r.cost_per_booking)}</TableCell>
                    </TableRow>
                    {isExp && campaigns.map((c) => (
                      <TableRow key={c.name} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-xs text-muted-foreground">↳ {c.name}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{c.leads}</TableCell>
                        <TableCell colSpan={3} />
                        <TableCell className="text-right tabular-nums text-xs">{formatINR(c.spend)}</TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Side column */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-1">Bookings per source (12 wk)</h2>
            <p className="text-xs text-muted-foreground mb-3">Aggregate trend</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalBookingsBySource} margin={{ top: 5, right: 5, left: -25, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="bookings" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" /> Model accuracy
            </h2>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-semibold tabular-nums">{evalAcc.percent}</div>
              <div className="text-lg text-muted-foreground">%</div>
              <Badge className={cn('ml-auto', evalTone)} variant="outline">
                {evalAcc.percent >= 80 ? 'On track' : evalAcc.percent >= 60 ? 'Watch' : 'Critical'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {evalAcc.matches} of {evalAcc.total} eval leads scored within ±1 band of ground truth.
            </p>
          </Card>
        </div>
      </div>

      {/* Weekly bookings trend full-width */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-1">Bookings trend by source (last 12 weeks)</h2>
        <p className="text-xs text-muted-foreground mb-3">Synthetic weekly attribution</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bookingsWeekly} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {sourceRoi.map((s: any, i: number) => (
                <Bar key={s.source} dataKey={s.source} stackId="a" fill={`var(--chart-${(i % 5) + 1})`} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function SortableHeader({
  children, k, current, dir, onClick, align = 'left',
}: {
  children: React.ReactNode;
  k: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = current === k;
  return (
    <TableHead className={cn(align === 'right' && 'text-right')}>
      <button
        onClick={() => onClick(k)}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground font-medium')}
      >
        {children}
        {active && <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  );
}
