import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateVisitStatus, markVisitCompleted,
  getVisits, getLeadQueue, getProperties,
} from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Bell, BellRing, MapPin, ChevronRight, ClipboardCheck, Clock, CalendarDays, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { friendlyDate, friendlyTime } from '@/lib/humanize';

export const Route = createFileRoute('/visits')({
  head: () => ({
    meta: [
      { title: 'Site Visits — Pentahouse' },
      { name: 'description', content: 'Upcoming visits, post-visit outcomes, and historical site-visit log.' },
    ],
  }),
  component: Visits,
});

function Visits() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [openVisit, setOpenVisit] = useState<any | null>(null);
  const [outcome, setOutcome] = useState('Completed');
  const [notes, setNotes] = useState('');

  const { data: allVisits = [] } = useQuery({
    queryKey: ['visits', 'all'],
    queryFn: () => getVisits(),
    refetchInterval: 10000,
  });
  const { data: queue = [] } = useQuery({
    queryKey: ['leadQueue'],
    queryFn: getLeadQueue,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  });

  const { upcoming, awaiting, recent } = useMemo(() => {
    const upcoming = allVisits.filter((x: any) => x.scheduled_date >= today);
    const awaiting = allVisits.filter(
      (x: any) => ['Confirmed', 'Scheduled'].includes(x.status) && x.scheduled_date < today
    );
    const recent = allVisits.filter((x: any) =>
      ['Completed', 'No-Show', 'Cancelled', 'Rescheduled'].includes(x.status)
    );
    return { upcoming, awaiting, recent };
  }, [allVisits, today]);

  const leadName = (id: string) =>
    queue.find((l: any) => l.lead_id === id)?.name ?? id;
  const projectName = (id: string) =>
    properties.find((p: any) => p.id === id)?.project_name ?? '—';

  const submit = async () => {
    if (!openVisit) return;
    if (outcome === 'Completed') {
      await markVisitCompleted(openVisit.id, notes);
      toast.success('Logged. Concerns extracting.');
    } else {
      await updateVisitStatus(openVisit.id, outcome, notes);
      toast.success(`Logged · ${outcome.toLowerCase()}`);
    }
    setOpenVisit(null);
    setNotes('');
    setOutcome('Completed');
    qc.invalidateQueries({ queryKey: ['visits', 'all'] });
  };

  const sentimentBadge = (s: string | null) => {
    if (s === 'positive') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    if (s === 'negative') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
    return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300';
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <header data-anim="rise" data-stagger="1">
        <div className="eyebrow">Field calendar</div>
        <h1 className="font-display text-[40px] leading-[1.05] mt-1">Site visits</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {upcoming.length} coming up · {awaiting.length} waiting on how they went
        </p>
      </header>

      {/* Need to log how it went — pushed to the top because it's the most actionable */}
      {awaiting.length > 0 && (
        <Card className="p-0 overflow-hidden border-amber-300 dark:border-amber-700">
          <div className="px-5 py-4 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
            <div>
              <div className="eyebrow text-amber-700 dark:text-amber-300">Action needed</div>
              <h2 className="font-display text-xl mt-0.5 flex items-center gap-2">
                <ClipboardCheck className="size-4 text-amber-600" /> Log the outcome
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {awaiting.length === 1 ? 'One visit' : `${awaiting.length} visits`} done. Quick note tells the system what to do next.
              </p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {awaiting.map((v: any) => (
              <button
                key={v.id}
                onClick={() => setOpenVisit(v)}
                className="w-full text-left p-4 rounded-md border bg-card hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors flex items-center gap-4"
              >
                <div className="size-10 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 grid place-items-center font-semibold">
                  {leadName(v.lead_id).slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{leadName(v.lead_id)}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {projectName(v.property_id)}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {friendlyDate(v.scheduled_date)} at {friendlyTime(v.scheduled_time)}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5">
                  Log outcome <ChevronRight className="size-3.5" />
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Coming up */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Calendar className="size-4" /> Coming up</h2>
          <span className="text-xs text-muted-foreground">{upcoming.length === 0 ? 'Nothing scheduled' : `${upcoming.length} visit${upcoming.length === 1 ? '' : 's'} ahead`}</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted-foreground text-center">
            <Calendar className="size-10 mx-auto mb-2 opacity-30" />
            Nothing scheduled for the week. Schedule one from a lead's page.
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {upcoming.map((v: any) => {
              const isToday = friendlyDate(v.scheduled_date) === 'Today';
              const isTomorrow = friendlyDate(v.scheduled_date) === 'Tomorrow';
              return (
                <div
                  key={v.id}
                  className={cn(
                    'p-4 rounded-md border bg-card flex items-center gap-4',
                    isToday && 'border-l-4 border-l-rose-500',
                    isTomorrow && 'border-l-4 border-l-amber-500'
                  )}
                >
                  <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                    {leadName(v.lead_id).slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{leadName(v.lead_id)}</span>
                      <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                      {v.calendar_event_url && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 gap-1"
                          title="A Google Calendar event was created for this visit"
                        >
                          <CalendarDays className="size-2.5" /> On Google Calendar
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {projectName(v.property_id)}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {friendlyDate(v.scheduled_date)} at {friendlyTime(v.scheduled_time)}</span>
                      {v.attendees && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <span>{v.attendees}</span>
                        </>
                      )}
                      {v.calendar_event_url && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <a
                            href={v.calendar_event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-300 hover:underline font-medium"
                          >
                            View in Calendar <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1 text-[10px]">
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded', v.reminder_24h_sent ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                      <Bell className="size-2.5" /> 1-day reminder {v.reminder_24h_sent ? 'sent' : 'pending'}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded', v.reminder_2h_sent ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                      <BellRing className="size-2.5" /> 2-hour reminder {v.reminder_2h_sent ? 'sent' : 'pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Recent visits</h2>
          <p className="text-xs text-muted-foreground">What buyers told us · last 30 days</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buyer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>When</TableHead>
              <TableHead>What they raised</TableHead>
              <TableHead>Mood</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{leadName(v.lead_id)}</TableCell>
                <TableCell className="text-xs">{projectName(v.property_id)}</TableCell>
                <TableCell className="text-xs tabular-nums">{friendlyDate(v.scheduled_date)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {v.objections?.length > 0 ? v.objections.map((o: string) => (
                      <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {v.sentiment && (
                    <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded', sentimentBadge(v.sentiment))}>
                      {v.sentiment}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate">{v.post_visit_notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!openVisit} onOpenChange={(o) => !o && setOpenVisit(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>How did it go?</SheetTitle>
          </SheetHeader>
          {openVisit && (
            <div className="px-4 space-y-4">
              <div className="text-sm">
                <div className="font-medium text-base">{leadName(openVisit.lead_id)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {projectName(openVisit.property_id)} · {friendlyDate(openVisit.scheduled_date)} at {friendlyTime(openVisit.scheduled_time)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Visit happened</SelectItem>
                    <SelectItem value="No-Show">No-show</SelectItem>
                    <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notes {outcome === 'Completed' && <span className="text-muted-foreground/70">· concerns, mood, next step</span>}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder={outcome === 'Completed'
                    ? "What did they like, what worried them, what are they comparing this to?"
                    : "Anything you want to remember for next time?"}
                  className="mt-1"
                />
                {outcome === 'Completed' && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    We extract their main concerns from these notes.
                  </p>
                )}
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpenVisit(null)}>Cancel</Button>
            <Button onClick={submit}>Save outcome</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
