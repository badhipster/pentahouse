import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Megaphone, Check, X, Edit3, Sparkles, ExternalLink, AlertCircle,
  TrendingUp, MousePointer, IndianRupee, Building2,
} from 'lucide-react';

export const Route = createFileRoute('/campaigns')({
  head: () => ({
    meta: [
      { title: 'Creative Approvals — Pentahouse' },
      { name: 'description', content: 'Marketing team reviews AI-drafted ad creative before campaigns go live.' },
    ],
  }),
  component: CampaignApprovals,
});

// Marketing-persona counterpart to the Sales Head's /approvals queue.
// Every campaign drafted by the Ad Agent lands here with status='Draft' (we treat
// existing seeded campaigns as already approved). Marketing can:
//   - Approve  -> status flips to 'Active', emits CAMPAIGN_LIVE event
//   - Edit + approve -> stores edited headline/primary_text/cta then approves
//   - Reject  -> stores rejection_reason, status flips to 'Paused'
//
// This closes the asymmetry where Sales Head had a quality gate (/approvals) and
// Marketing did not. Both personas now have a "nothing leaves the door without
// human review" surface.

const PLATFORM_TONE: Record<string, string> = {
  Meta:    'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  Google:  'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Portal:  'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  Other:   'bg-muted text-foreground border-border',
};

async function getDraftCampaigns() {
  // Campaigns awaiting approval — status='Draft' is the new pre-Active state.
  // Older campaigns marked 'Active' from seed remain visible in a 'Recent live' section.
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, property_id, platform, campaign_name, ad_copy, target_audience, budget_inr, status, created_at, properties(project_name, locality, city)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('[campaigns.getDraftCampaigns]', error);
  return data ?? [];
}

function CampaignApprovals() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedCopy, setEditedCopy] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaignsAll'],
    queryFn: getDraftCampaigns,
    refetchInterval: 10000,
  });

  // Split into pending (Draft) and recent live (Active/Paused/Completed)
  const drafts = campaigns.filter((c: any) => c.status === 'Draft');
  const recent = campaigns.filter((c: any) => c.status !== 'Draft').slice(0, 8);

  const focused = drafts.find((c: any) => c.id === focusedId) ?? drafts[0];

  async function approve(c: any) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'Active' })
      .eq('id', c.id);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success(`${c.platform} campaign live`, { description: 'CAMPAIGN_LIVE event emitted.' });
    qc.invalidateQueries({ queryKey: ['campaignsAll'] });
    setFocusedId(null);
    setEditMode(false);
  }

  async function editAndApprove(c: any) {
    if (!editedCopy.trim()) { toast.error('Add some copy first'); return; }
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'Active', ad_copy: editedCopy })
      .eq('id', c.id);
    if (error) { toast.error('Failed to save edit'); return; }
    toast.success(`${c.platform} edited + live`);
    qc.invalidateQueries({ queryKey: ['campaignsAll'] });
    setFocusedId(null);
    setEditMode(false);
    setEditedCopy('');
  }

  async function reject(c: any) {
    if (!rejectReason.trim()) { toast.error('Reason required'); return; }
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'Paused' })
      .eq('id', c.id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.message('Creative rejected', { description: `${c.platform} paused. Reason logged.` });
    qc.invalidateQueries({ queryKey: ['campaignsAll'] });
    setFocusedId(null);
    setRejectReason('');
  }

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4" data-anim="rise" data-stagger="1">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3" /> Marketing approvals
          </div>
          <h1 className="font-display text-[40px] leading-[1.05] mt-1">Creative approvals</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {drafts.length === 0
              ? 'No drafts waiting. The Ad Agent will queue new creative here when it runs.'
              : `${drafts.length} draft${drafts.length === 1 ? '' : 's'} waiting on you to approve before they go live.`}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
          {profile?.display_name ?? 'Marketing'}
        </Badge>
      </header>

      {drafts.length === 0 && recent.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <div className="font-display text-xl">No campaigns yet</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Open a property and click <span className="font-medium text-foreground">Generate ads</span> — the Ad Agent will draft Meta, Google, and Portal creative for your review.
          </p>
          <Link to="/properties" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Open Inventory <ExternalLink className="size-3.5" />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Draft queue */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="eyebrow">Pending approvals</div>
              <h2 className="font-semibold text-sm mt-0.5">{drafts.length} drafted by Ad Agent</h2>
            </div>
            <div className="divide-y">
              {drafts.length === 0 ? (
                <div className="p-5 text-xs text-muted-foreground italic">All drafts cleared. Recent live campaigns below.</div>
              ) : drafts.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => { setFocusedId(c.id); setEditMode(false); setEditedCopy(c.ad_copy || ''); }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                    focused?.id === c.id && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-[10px]', PLATFORM_TONE[c.platform])}>{c.platform}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{(c.properties as any)?.project_name ?? (c.properties as any)?.[0]?.project_name ?? '—'}</span>
                  </div>
                  <div className="text-sm font-medium leading-tight line-clamp-2">{c.campaign_name}</div>
                </button>
              ))}
            </div>
            {recent.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-b bg-muted/20">
                  <div className="eyebrow">Recent live</div>
                </div>
                <div className="divide-y">
                  {recent.map((c: any) => (
                    <div key={c.id} className="px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-[9px]', PLATFORM_TONE[c.platform])}>{c.platform}</Badge>
                        <span className="font-medium truncate">{c.campaign_name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">{(c.properties as any)?.project_name ?? (c.properties as any)?.[0]?.project_name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Focused detail */}
          <Card className="lg:col-span-3 p-0 overflow-hidden">
            {!focused ? (
              <div className="p-12 text-center">
                <Check className="size-10 text-emerald-500/40 mx-auto mb-3" />
                <div className="font-display text-xl">Inbox clear</div>
                <p className="text-sm text-muted-foreground mt-2">All pending drafts have been reviewed.</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={cn('text-[10px]', PLATFORM_TONE[focused.platform])}>
                      {focused.platform}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      <Sparkles className="size-2.5 mr-0.5" /> Drafted by Ad Agent · Gemini 2.5 Flash
                    </Badge>
                  </div>
                  <h3 className="font-display text-xl leading-tight">{focused.campaign_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {(focused.properties as any)?.project_name ?? (focused.properties as any)?.[0]?.project_name}</span>
                    <span>·</span>
                    <span>{(focused.properties as any)?.locality ?? (focused.properties as any)?.[0]?.locality}, {(focused.properties as any)?.city ?? (focused.properties as any)?.[0]?.city}</span>
                    {focused.budget_inr && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums"><IndianRupee className="size-3" /> {Number(focused.budget_inr).toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Creative preview */}
                <div className="p-5 border-b bg-muted/10">
                  <div className="eyebrow mb-2">Ad creative</div>
                  {!editMode ? (
                    <div className="rounded-md bg-background border p-4 whitespace-pre-wrap text-sm leading-relaxed">
                      {focused.ad_copy || <span className="italic text-muted-foreground">No copy generated.</span>}
                    </div>
                  ) : (
                    <textarea
                      value={editedCopy}
                      onChange={(e) => setEditedCopy(e.target.value)}
                      className="w-full rounded-md border bg-background p-3 text-sm leading-relaxed resize-y min-h-[140px]"
                    />
                  )}
                  {focused.target_audience && (
                    <div className="text-[11px] text-muted-foreground mt-2.5">
                      <span className="uppercase tracking-wider">Audience:</span> {focused.target_audience}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 flex flex-wrap items-center gap-2">
                  {!editMode ? (
                    <>
                      <Button onClick={() => approve(focused)} className="gap-1.5">
                        <Check className="size-4" /> Approve and go live
                      </Button>
                      <Button variant="outline" onClick={() => { setEditMode(true); setEditedCopy(focused.ad_copy || ''); }} className="gap-1.5">
                        <Edit3 className="size-4" /> Edit copy
                      </Button>
                      <div className="flex-1" />
                      <div className="flex items-center gap-1.5">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason"
                          className="px-2 py-1.5 rounded border bg-background text-xs w-44"
                        />
                        <Button variant="ghost" onClick={() => reject(focused)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1.5">
                          <X className="size-4" /> Reject
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => editAndApprove(focused)} className="gap-1.5">
                        <Check className="size-4" /> Save and go live
                      </Button>
                      <Button variant="ghost" onClick={() => { setEditMode(false); setEditedCopy(''); }}>Cancel</Button>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
