import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, CheckCircle2, AlertCircle, ExternalLink, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Live lead injector — fires a real n8n webhook with a realistic Pune lead.
// Watches the response and shows the AI score, model used, and where the data
// landed. Demo-grade: proves the AI works end-to-end on un-seeded data.

const SAMPLE_LEADS = [
  {
    label: 'Hot 3BHK buyer (Hinjewadi)',
    name: 'Demo Live Test',
    phone: '+919999000777',
    email: 'demolive@test.in',
    source: 'manual',
    inquiry_text: 'Need 3BHK in Hinjewadi, ready possession only, budget 1.2 Cr, pre-approved loan, want to close in 30 days',
    preferred_city: 'Pune',
    preferred_locality: 'Hinjewadi',
    budget_lakhs: 120,
    preferred_config: '3BHK',
    purpose: 'buy',
    purchase_timeline: 'Immediately',
    loan_status: 'Pre-approved',
  },
  {
    label: 'Warm 2BHK investor (Wakad)',
    name: 'Demo Live Investor',
    phone: '+919999000888',
    email: 'demoinvest@test.in',
    source: 'Google Ad',
    inquiry_text: 'Looking for 2BHK in Wakad as investment, budget around 85L, planning to apply for loan',
    preferred_city: 'Pune',
    preferred_locality: 'Wakad',
    budget_lakhs: 85,
    preferred_config: '2BHK',
    purpose: 'invest',
    purchase_timeline: '3 months',
    loan_status: 'Applied',
  },
];

const N8N_LEAD_WEBHOOK = (import.meta.env.VITE_N8N_LEAD_WEBHOOK as string) || 'http://localhost:5678/webhook/new-lead';

export function LiveLeadTester() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickedIdx, setPickedIdx] = useState(0);

  async function fire() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(N8N_LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_LEADS[pickedIdx]),
      });
      const text = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
      if (!res.ok) {
        setError(`Webhook returned ${res.status}: ${text.slice(0, 200)}`);
        toast.error('Lead Agent webhook failed');
      } else {
        setResult(parsed);
        toast.success('Lead scored. Check /leads and the Sales Ops sheet.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error. Is n8n running on localhost:5678?');
      toast.error('Cannot reach n8n');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3" /> Live agent test
          </div>
          <h2 className="font-display text-xl mt-0.5">Try a real lead</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send a synthetic lead through the actual Lead Agent. Watch the AI score it, match a property, and write to Supabase + Google Sheets.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0">
          Real n8n
        </Badge>
      </div>

      {/* Sample picker */}
      <div className="flex gap-1.5 mb-3">
        {SAMPLE_LEADS.map((s, i) => (
          <button
            key={i}
            onClick={() => setPickedIdx(i)}
            className={cn(
              'flex-1 text-left px-3 py-2 rounded-md border text-[12px] transition-colors',
              pickedIdx === i
                ? 'border-primary/40 bg-primary/5 text-foreground'
                : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="font-medium leading-tight">{s.label}</div>
            <div className="text-[10px] mt-0.5 opacity-80">{s.preferred_config} · {s.budget_lakhs}L · {s.purchase_timeline}</div>
          </button>
        ))}
      </div>

      <Button onClick={fire} disabled={submitting} className="w-full">
        {submitting ? (
          <><Loader2 className="size-3.5 animate-spin" /> Lead Agent scoring…</>
        ) : (
          <><Play className="size-3.5" /> Fire test lead → Lead Agent</>
        )}
      </Button>

      {/* Response panel */}
      {result && (
        <div className="mt-4 p-3 rounded-md border bg-emerald-500/5 border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <div className="text-sm font-semibold">Agent responded</div>
          </div>
          <ResultGrid result={result} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <a
              href={`/leads`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            >
              View in My Deals →
            </a>
            <a
              href="https://docs.google.com/spreadsheets/d/1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors"
            >
              Open Sales Ops sheet <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-md border bg-rose-500/5 border-rose-500/30">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="size-4 text-rose-600" />
            <div className="text-sm font-semibold">Agent error</div>
          </div>
          <div className="text-xs text-muted-foreground break-words">{error}</div>
          <div className="text-[10px] text-muted-foreground/80 mt-1.5">
            Check that n8n is running and the Lead Agent workflow is Active.
          </div>
        </div>
      )}
    </Card>
  );
}

function ResultGrid({ result }: { result: any }) {
  // The Lead Agent response shape is { lead_id, overall_score, fit_score,
  // urgency_score, recommended_action, model_used, ... } — but we try to be
  // defensive in case the shape varies.
  const get = (k: string, fallback: any = '—') => result?.[k] ?? fallback;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
      <Stat label="Lead ID" value={String(get('lead_id', '')).slice(0, 8) || '—'} mono />
      <Stat label="Overall score" value={String(get('overall_score'))} tone="primary" />
      <Stat label="Action" value={String(get('recommended_action', '—')).slice(0, 18)} />
      <Stat label="Model" value={String(get('model_used') || get('scored_by') || 'Gemini')} mono />
    </div>
  );
}

function Stat({ label, value, tone, mono }: { label: string; value: string; tone?: 'primary'; mono?: boolean }) {
  return (
    <div className="p-2 rounded bg-background border">
      <div className="eyebrow text-[9px]">{label}</div>
      <div className={cn(
        'mt-0.5 truncate leading-tight font-medium',
        mono && 'font-mono text-[11px]',
        tone === 'primary' && 'text-primary',
      )}>
        {value}
      </div>
    </div>
  );
}
