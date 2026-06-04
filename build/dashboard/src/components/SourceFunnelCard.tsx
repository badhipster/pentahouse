import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { getSourceFunnel } from '@/lib/data';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

// Persona A (Marketing Lead) sees this on /today.
// Reads from v_source_roi which joins leads -> visits -> bookings -> campaigns
// to give per-source CPL, CPV, CPB. Honest defensive UI: handles null/empty rows.

const SOURCE_TONE: Record<string, string> = {
  'Meta Ad':       'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Google Ad':     'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  'WhatsApp':      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  '99acres':       'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'Housing.com':   'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'CP Referral':   'bg-primary/10 text-primary border-primary/30',
};

export function SourceFunnelCard() {
  const { data: rows = [] } = useQuery({
    queryKey: ['sourceFunnel'],
    queryFn: getSourceFunnel,
    refetchInterval: 30000,
  });

  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <div className="eyebrow flex items-center gap-1.5">
          <TrendingUp className="size-3" /> Source funnel
        </div>
        <h3 className="font-display text-lg mt-0.5">No campaign data yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Once leads start coming in by source, this card shows CPL, CPV, and CPB per channel.
        </p>
      </Card>
    );
  }

  // Compute max booking count for the funnel visualization (relative bar widths)
  const maxLeads = Math.max(...rows.map((r: any) => r.leads_count || 0), 1);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b">
        <div className="eyebrow flex items-center gap-1.5">
          <TrendingUp className="size-3" /> Source funnel
        </div>
        <h2 className="font-display text-xl mt-0.5">Where wins come from</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Cost per lead, per site-visit, per booking, by channel.</p>
      </div>

      <div className="divide-y">
        <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
          <div className="col-span-3">Source</div>
          <div className="col-span-1 text-right">Leads</div>
          <div className="col-span-1 text-right">Qual.</div>
          <div className="col-span-1 text-right">Visits</div>
          <div className="col-span-1 text-right">Booked</div>
          <div className="col-span-1 text-right">CPL</div>
          <div className="col-span-2 text-right">CP-visit</div>
          <div className="col-span-2 text-right">CP-booking</div>
        </div>

        {rows.map((r: any) => {
          const tone = SOURCE_TONE[r.source] || 'bg-muted text-foreground border-border';
          const barPct = ((r.leads_count || 0) / maxLeads) * 100;
          return (
            <div key={r.source} className="grid grid-cols-12 gap-2 px-5 py-3 text-[12px] tabular-nums items-center hover:bg-muted/20">
              <div className="col-span-3 flex items-center gap-2 min-w-0">
                <span className={cn('shrink-0 inline-block size-2 rounded-full', tone)} />
                <span className="font-medium truncate">{r.source}</span>
              </div>
              <div className="col-span-1 text-right relative">
                <span className="absolute inset-y-1 right-0 left-0 rounded-sm bg-primary/5" style={{ left: `${100 - barPct}%` }} />
                <span className="relative">{r.leads_count ?? 0}</span>
              </div>
              <div className="col-span-1 text-right text-muted-foreground">{r.qualified_count ?? 0}</div>
              <div className="col-span-1 text-right text-muted-foreground">{r.visits_completed ?? 0}</div>
              <div className="col-span-1 text-right font-medium">{r.bookings_count ?? 0}</div>
              <div className="col-span-1 text-right">{fmtINR(r.cost_per_lead)}</div>
              <div className="col-span-2 text-right">{fmtINR(r.cost_per_visit)}</div>
              <div className={cn('col-span-2 text-right font-medium',
                r.bookings_count > 0 ? 'text-emerald-700 dark:text-emerald-300' : ''
              )}>
                {fmtINR(r.cost_per_booking)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number(n) === 0) return '—';
  const v = Number(n);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}
