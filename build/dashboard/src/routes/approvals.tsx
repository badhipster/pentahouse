import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveMessage, editAndApproveMessage, rejectMessage,
  getPendingApprovals, getLeadQueue,
} from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Check, X, Edit3, CheckCheck, CornerDownRight, Sparkles } from 'lucide-react';
import { relativeTime, maskPhone, shortTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/approvals')({
  head: () => ({
    meta: [
      { title: 'Approvals — Pentahouse' },
      { name: 'description', content: 'Review and approve suggested messages before they go to buyers.' },
    ],
  }),
  component: Approvals,
});

const REJECT_REASONS = [
  'Tone too pushy', 'Hallucinated detail', 'Off-template', 'Wrong language', 'Other',
];

function Approvals() {
  const qc = useQueryClient();
  const focusedId = useAppStore((s) => s.focusedMessageId);
  const setFocused = useAppStore((s) => s.setFocused);
  const removed = useAppStore((s) => s.removedMessageIds);
  const markRemoved = useAppStore((s) => s.markRemoved);
  const [mode, setMode] = useState<'view' | 'edit' | 'reject'>('view');
  const [editText, setEditText] = useState('');
  const [rejectReason, setRejectReason] = useState('Tone too pushy');
  const [rejectNotes, setRejectNotes] = useState('');
  const [animating, setAnimating] = useState<string | null>(null);

  const { data: pendingMsgs = [] } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: getPendingApprovals,
    refetchInterval: 5000,
  });
  const { data: leadQueue = [] } = useQuery({
    queryKey: ['leadQueue'],
    queryFn: getLeadQueue,
  });

  const pending = useMemo(
    () => pendingMsgs.filter((m: any) => !removed.includes(m.message_id)),
    [pendingMsgs, removed]
  );

  const focused = pending.find((m: any) => m.message_id === focusedId) ?? pending[0];
  const focusedLead = focused
    ? leadQueue.find((l: any) => l.lead_id === focused.lead_id)
    : undefined;

  useEffect(() => {
    if (!focused && pending.length > 0) setFocused(pending[0].message_id);
    if (focused && focused.message_id !== focusedId) setFocused(focused.message_id);
  }, [focused, focusedId, pending, setFocused]);

  const advance = (currentId: string) => {
    const idx = pending.findIndex((m: any) => m.message_id === currentId);
    const next = pending[idx + 1] ?? pending[idx - 1] ?? null;
    setFocused(next ? next.message_id : null);
    setMode('view');
  };

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['pendingApprovals'] });
    qc.invalidateQueries({ queryKey: ['leadQueue'] });
  };

  const doApprove = async () => {
    if (!focused) return;
    const id = focused.message_id;
    setAnimating(id);
    await approveMessage(id);
    setTimeout(() => {
      markRemoved(id);
      setAnimating(null);
      advance(id);
      toast.success(`Sent to ${focusedLead?.name ?? focused.lead_name ?? 'lead'} on WhatsApp`);
      refetchAll();
    }, 200);
  };

  const doReject = async () => {
    if (!focused) return;
    const id = focused.message_id;
    setAnimating(id);
    await rejectMessage(id, `${rejectReason}${rejectNotes ? ': ' + rejectNotes : ''}`);
    setTimeout(() => {
      markRemoved(id);
      setAnimating(null);
      setRejectNotes('');
      advance(id);
      toast.success(`Skipped — ${rejectReason.toLowerCase()}`);
      refetchAll();
    }, 200);
  };

  const doEditApprove = async () => {
    if (!focused) return;
    const id = focused.message_id;
    setAnimating(id);
    await editAndApproveMessage(id, editText);
    setTimeout(() => {
      markRemoved(id);
      setAnimating(null);
      advance(id);
      toast.success(`Sent to ${focusedLead?.name ?? focused.lead_name ?? 'lead'} (your edit)`);
      refetchAll();
    }, 200);
  };

  const startEdit = () => {
    if (!focused) return;
    setEditText(focused.content);
    setMode('edit');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const isInput =
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (e.key === 'Escape') {
        setMode('view');
        return;
      }
      if (isInput) return;
      if (!focused) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); doApprove(); }
      else if (k === 'e') { e.preventDefault(); startEdit(); }
      else if (k === 'r') { e.preventDefault(); setMode('reject'); }
      else if (k === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = pending.findIndex((m: any) => m.message_id === focused.message_id);
        const n = pending[idx + 1]; if (n) setFocused(n.message_id);
      } else if (k === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = pending.findIndex((m: any) => m.message_id === focused.message_id);
        const n = pending[idx - 1]; if (n) setFocused(n.message_id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, pending]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Queue */}
      <aside className="w-[38%] max-w-md border-r flex flex-col">
        <div className="px-6 pt-6 pb-4">
          <div className="eyebrow">Outbound queue</div>
          <h1 className="font-display text-2xl mt-0.5">Messages to send</h1>
          <p className="text-xs text-muted-foreground mt-2">
            {pending.length} {pending.length === 1 ? 'draft' : 'drafts'} waiting on your call.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 border rounded-sm font-mono text-[10px]">A</kbd>
            <span>approve</span>
            <kbd className="px-1.5 py-0.5 border rounded-sm font-mono text-[10px] ml-1.5">E</kbd>
            <span>edit</span>
            <kbd className="px-1.5 py-0.5 border rounded-sm font-mono text-[10px] ml-1.5">R</kbd>
            <span>reject</span>
            <kbd className="px-1.5 py-0.5 border rounded-sm font-mono text-[10px] ml-1.5">J/K</kbd>
            <span>nav</span>
          </div>
        </div>
        <div className="rule mx-6" />
        <div className="flex-1 overflow-y-auto">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full px-6">
              <CheckCheck className="size-14 text-success mb-3" />
              <div className="font-display text-2xl">Inbox zero</div>
              <div className="text-sm text-muted-foreground mt-1">All drafts handled.</div>
            </div>
          ) : (
            <ul>
              {pending.map((m: any) => {
                const lead = leadQueue.find((l: any) => l.lead_id === m.lead_id);
                const isFocused = focused?.message_id === m.message_id;
                const isAnimating = animating === m.message_id;
                return (
                  <li
                    key={m.message_id}
                    onMouseEnter={() => setFocused(m.message_id)}
                    onClick={() => setFocused(m.message_id)}
                    className={cn(
                      'px-5 py-3.5 border-b cursor-pointer transition-all',
                      isFocused ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40',
                      isAnimating && 'opacity-0 -translate-x-4 duration-200'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{lead?.name ?? m.lead_name ?? 'Unknown'}</div>
                      <Badge variant="outline" className="text-[10px]">{m.language === 'hi' ? 'HI' : 'EN'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lead?.matched_project ?? m.matched_project ?? '—'}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {lead?.overall_score ?? m.overall_score ?? '—'}
                      </span>
                      <span className="text-muted-foreground">{relativeTime(m.created_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Focused pane */}
      <section className="flex-1 overflow-y-auto bg-muted/20">
        {focused && focusedLead ? (
          <div className="p-8 max-w-3xl mx-auto space-y-5">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link to="/leads/$id" params={{ id: focusedLead.lead_id }} className="font-semibold hover:underline">
                  {focusedLead.name}
                </Link>
                <span className="text-muted-foreground text-xs tabular-nums">{maskPhone(focusedLead.phone)}</span>
                <Badge variant="outline" className="text-[10px]">{focusedLead.source}</Badge>
                <Badge variant="outline" className="text-[10px]">{focusedLead.stage}</Badge>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] tabular-nums">
                  Score {focusedLead.overall_score}
                </span>
              </div>
              {focusedLead.fit_reasons?.[0] && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CornerDownRight className="size-3 mt-0.5 shrink-0" />
                  <span>{focusedLead.fit_reasons[0]}</span>
                </div>
              )}
            </Card>

            {mode !== 'edit' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">WhatsApp preview · to {focusedLead.name}</div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-[10px] uppercase tracking-wider font-medium">
                    <Sparkles className="size-2.5" /> Suggested reply
                  </div>
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 ml-auto bg-emerald-500 text-white shadow-md',
                    focused.language === 'hi' && 'font-[Noto_Sans_Devanagari,Inter,sans-serif]'
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{focused.content}</div>
                  <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-white/80">
                    <span className="tabular-nums">{shortTime(focused.created_at)}</span>
                    <CheckCheck className="size-3.5" />
                  </div>
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <Card className="p-4 space-y-3">
                <div className="text-xs font-medium">Edit draft</div>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={6}
                  className={cn(focused.language === 'hi' && 'font-[Noto_Sans_Devanagari,Inter,sans-serif]')}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setMode('view')}>Cancel (Esc)</Button>
                  <Button onClick={doEditApprove}><Check className="size-4" /> Save and approve</Button>
                </div>
              </Card>
            )}

            {mode === 'reject' && (
              <Card className="p-4 space-y-3">
                <div className="text-xs font-medium">Reject draft</div>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REJECT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Optional note — what wasn't right?…"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setMode('view')}>Cancel (Esc)</Button>
                  <Button variant="destructive" onClick={doReject}><X className="size-4" /> Reject</Button>
                </div>
              </Card>
            )}

            {mode === 'view' && (
              <div className="flex gap-2">
                <Button onClick={doApprove} className="flex-1 bg-success hover:opacity-90 text-success-foreground btn-press">
                  <Check className="size-4" /> Approve <kbd className="ml-1 text-[10px] bg-white/20 px-1 rounded font-mono">A</kbd>
                </Button>
                <Button variant="outline" onClick={startEdit} className="flex-1">
                  <Edit3 className="size-4" /> Edit <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">E</kbd>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('reject')}
                  className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <X className="size-4" /> Reject <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">R</kbd>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full px-6">
            <CheckCheck className="size-20 text-success mb-4" />
            <div className="font-display text-3xl">Inbox zero</div>
            <div className="text-sm text-muted-foreground mt-1">All drafts handled.</div>
          </div>
        )}
      </section>
    </div>
  );
}
