import { cn } from '@/lib/utils';
import { Sparkles, Target, Zap, CalendarCheck } from 'lucide-react';

// 3-axis score breakdown for the lead detail card.
// Fit (from Gemini), Urgency (from Gemini), Visit Readiness (derived client-side
// from observable signals — replies, slot interest, financing tightness, attendees).
//
// Concept-note item #6 demanded 3 scores. v1 shipped 2. This closes the gap.

interface Props {
  fit: number | null | undefined;
  urgency: number | null | undefined;
  // Signals used to derive Visit Readiness (all optional)
  inboundReplyCount?: number;
  hasConfirmedAttendees?: boolean;
  loanStatus?: string | null;
  purchaseTimeline?: string | null;
  recommendedAction?: string | null;
}

// Derive Visit Readiness from observable signals. Score 0-100.
// Returns BOTH positive and negative reasons so the displayed reasons match the
// label tone — a 25/100 score should show what's MISSING, not what's present.
function deriveVisitReadiness(p: Props): { score: number; positives: string[]; gaps: string[] } {
  const positives: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  // 1. Two-way conversation (max +35)
  const replies = p.inboundReplyCount ?? 0;
  if (replies >= 2) { score += 35; positives.push('Already replying on WhatsApp'); }
  else if (replies === 1) { score += 20; positives.push('Replied once'); }
  else { gaps.push("Hasn't replied to any message yet"); }

  // 2. Attendees confirmed (max +20)
  if (p.hasConfirmedAttendees) { score += 20; positives.push('Visit scheduled with attendees'); }
  else { gaps.push('No visit scheduled yet'); }

  // 3. Financing tightness (max +20)
  if (p.loanStatus === 'Pre-approved') { score += 20; positives.push('Loan pre-approved'); }
  else if (p.loanStatus === 'Applied') { score += 12; positives.push('Loan in process'); }
  else if (p.loanStatus === 'Planning') { score += 4; gaps.push('Loan only at planning stage'); }
  else if (!p.loanStatus) { gaps.push('Loan status unknown'); }

  // 4. Timeline tightness (max +15)
  if (p.purchaseTimeline === 'Immediately') { score += 15; positives.push('Wants to move immediately'); }
  else if (p.purchaseTimeline === '3 months') { score += 9; positives.push('3-month window'); }
  else if (p.purchaseTimeline === '6 months') { score += 4; gaps.push('6-month window is soft'); }
  else if (p.purchaseTimeline === 'Exploring') { score -= 8; gaps.push('Still exploring — no firm timeline'); }
  else if (!p.purchaseTimeline) { gaps.push('Timeline not captured'); }

  // 5. Recommended action explicitly says visit (max +10)
  if (p.recommendedAction === 'Schedule site visit') { score += 10; positives.push('AI flagged visit-ready'); }
  else if (p.recommendedAction === 'Send brochure') { score -= 5; gaps.push('AI suggests brochure first'); }
  else if (p.recommendedAction === 'Long-term nurture') { score -= 15; gaps.push('AI says long-cycle nurture'); }

  score = Math.max(0, Math.min(100, score));
  return { score, positives, gaps };
}

function readinessLabel(s: number): { headline: string; tone: 'success' | 'warning' | 'default' } {
  if (s >= 70) return { headline: 'Will likely show up', tone: 'success' };
  if (s >= 40) return { headline: 'Maybe — confirm with a slot offer', tone: 'warning' };
  return { headline: 'Not enough signal yet — qualify first', tone: 'default' };
}

export function ScoreBreakdown(props: Props) {
  const fit = props.fit ?? 0;
  const urgency = props.urgency ?? 0;
  const { score: readiness, positives, gaps } = deriveVisitReadiness(props);
  const readinessRead = readinessLabel(readiness);

  // Match the reasons to the label. If the score is low, show what's missing
  // (gaps) so the reader understands WHY it's low. If high, show what's strong
  // (positives) so they understand why it's safe to schedule. If middle, mix.
  const readinessReasons: string[] =
    readiness >= 70 ? positives.slice(0, 2) :
    readiness >= 40 ? [...positives.slice(0, 1), ...gaps.slice(0, 1)].filter(Boolean) :
    gaps.slice(0, 2);

  return (
    <div className="space-y-2.5">
      <div className="eyebrow flex items-center gap-1.5">
        <Sparkles className="size-3" /> AI score breakdown
      </div>
      <ScoreRow icon={Target}        label="Fit"             value={fit}      hint="How well your inventory matches what they want" />
      <ScoreRow icon={Zap}            label="Urgency"         value={urgency}  hint="How soon they will decide" />
      <ScoreRow icon={CalendarCheck}  label="Visit readiness" value={readiness} hint={readinessRead.headline} tone={readinessRead.tone} reasons={readinessReasons} />
    </div>
  );
}

function ScoreRow({ icon: Icon, label, value, hint, tone, reasons }: {
  icon: any;
  label: string;
  value: number;
  hint: string;
  tone?: 'success' | 'warning' | 'default';
  reasons?: string[];
}) {
  const barCls =
    tone === 'success' ? 'bg-emerald-500' :
    tone === 'warning' ? 'bg-amber-500' :
    value >= 70 ? 'bg-emerald-500' :
    value >= 40 ? 'bg-amber-500' :
    'bg-rose-400';

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium">
          <Icon className="size-3 text-muted-foreground" />
          {label}
        </div>
        <div className="text-[11px] tabular-nums text-muted-foreground">{value}<span className="opacity-50">/100</span></div>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full transition-all', barCls)} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
      <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{hint}</div>
      {reasons && reasons.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-[10px] text-muted-foreground/90 leading-snug pl-3.5 relative">
              <span className="absolute left-0 top-1 size-1 rounded-full bg-muted-foreground/40" /> {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
