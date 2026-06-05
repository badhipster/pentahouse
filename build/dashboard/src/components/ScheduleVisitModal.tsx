import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { scheduleVisit } from '@/lib/data';
import { toast } from 'sonner';
import { CalendarDays, Clock, MapPin, Users, FileText, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schedule Visit modal — the user-visible answer to "how does the calendar event
// actually get created?" Opens from any "Schedule site visit" CTA across the app.
// User picks date + time + adjusts attendees, hits Schedule, and the modal:
//   1. Inserts a visits row (Supabase)
//   2. Fires the Visit Calendar n8n webhook (creates Google Calendar event with Meet link)
//   3. Surfaces the calendar URL on success so user can open the actual event

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    lead_id: string;
    name: string;
    phone?: string;
    matched_property_id?: string | null;
    matched_project?: string | null;
  };
  property?: {
    id: string;
    project_name: string;
    locality: string;
    city: string;
  } | null;
}

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function ScheduleVisitModal({ open, onOpenChange, lead, property }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(tomorrow());
  const [time, setTime] = useState<string>('11:00');
  const [attendees, setAttendees] = useState<string>(`${lead.name} + 1`);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; calendar_event_url?: string; error?: string } | null>(null);

  const propertyId = property?.id ?? lead.matched_property_id ?? '';
  const propertyLabel = property
    ? `${property.project_name}, ${property.locality}, ${property.city}`
    : lead.matched_project ?? 'No matched property — choose from /properties';

  async function onSchedule() {
    if (!propertyId) {
      toast.error('No matched property. Open /properties and link one before scheduling.');
      return;
    }
    setSubmitting(true);
    const res = await scheduleVisit({
      lead_id: lead.lead_id,
      property_id: propertyId,
      scheduled_date: date,
      scheduled_time: time,
      attendees: attendees.trim() || lead.name,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    setResult(res);
    if (res.ok) {
      toast.success('Visit scheduled', {
        description: res.calendar_event_url
          ? 'Google Calendar event created with Meet link. Invite sent to attendees.'
          : (res.error ?? 'Visit row saved.'),
      });
      // Invalidate every query that the lead detail screen relies on so the
      // CTA flips from "Schedule site visit" to "Confirm visit" immediately.
      qc.invalidateQueries({ queryKey: ['visits', lead.lead_id] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['agentEvents'] });
      qc.invalidateQueries({ queryKey: ['lead', lead.lead_id] });
      qc.invalidateQueries({ queryKey: ['leadQueue'] });
    } else {
      toast.error('Could not schedule', { description: res.error });
    }
  }

  function close() {
    setResult(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" /> Schedule site visit
          </DialogTitle>
          <DialogDescription>
            Picks the slot, books a Google Calendar event with a Meet link, and sends a .ics invite to attendees.
          </DialogDescription>
        </DialogHeader>

        {!result?.ok && (
          <div className="space-y-4">
            {/* Lead + property summary */}
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{lead.name}</span>
                {lead.phone && <span className="text-xs text-muted-foreground tabular-nums">{lead.phone}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{propertyLabel}</span>
              </div>
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                  <CalendarDays className="size-3" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm tabular-nums"
                />
                <div className="text-[10px] text-muted-foreground mt-1">{fmtDate(date)}</div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="size-3" /> Start time (IST)
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm tabular-nums"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="text-[10px] text-muted-foreground mt-1">60-min duration</div>
              </div>
            </div>

            {/* Attendees */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                <Users className="size-3" /> Attendees
              </label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="e.g. Aarav Mehta + Spouse"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                <FileText className="size-3" /> Notes for the sales rep (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the on-site rep should prep — preferred unit, key questions, parking..."
                rows={2}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
              />
            </div>

            {/* What happens summary */}
            <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground mb-0.5">On Schedule:</div>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Visit is added to your schedule</li>
                <li>Calendar invite with a video meeting link is created</li>
                <li>Invite is emailed to everyone attending</li>
                <li>You'll get reminder drafts 24 hours and 2 hours before</li>
              </ul>
            </div>
          </div>
        )}

        {/* Success state */}
        {result?.ok && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/30">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Visit scheduled for {fmtDate(date)} at {time}</div>
                {result.calendar_event_url ? (
                  <div className="text-xs text-muted-foreground mt-0.5">Google Calendar event live · Meet link generated</div>
                ) : (
                  <div className="text-xs text-amber-600 mt-0.5">{result.error}</div>
                )}
              </div>
            </div>
            {result.calendar_event_url && (
              <a
                href={result.calendar_event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Open in Google Calendar <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}

        <DialogFooter>
          {!result?.ok ? (
            <>
              <Button variant="ghost" onClick={close} disabled={submitting}>Cancel</Button>
              <Button onClick={onSchedule} disabled={submitting || !propertyId}>
                {submitting ? (<><Loader2 className="size-3.5 animate-spin" /> Scheduling…</>) : 'Schedule'}
              </Button>
            </>
          ) : (
            <Button onClick={close}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
