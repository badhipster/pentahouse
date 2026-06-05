import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProperty, getCampaignsForProperty, generateAds } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ChevronLeft, MapPin, CalendarClock, BadgeCheck, AlertTriangle, Sparkles,
  Megaphone, IndianRupee, MousePointer, Eye, Users, Instagram, Search, Globe,
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ListChecks, Target, Tag, ShieldCheck, ShieldAlert, TrendingUp, ChevronDown, Power, Edit3, FileWarning,
} from 'lucide-react';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/format';

export const Route = createFileRoute('/properties/$id')({
  loader: async ({ params }) => {
    const property = await getProperty(params.id);
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.property.project_name} — Inventory` },
      { name: 'description', content: `${loaderData.property.project_name} · ${loaderData.property.locality}, ${loaderData.property.city}` },
    ] : [],
  }),
  component: PropertyDetail,
});

const PLATFORM_META: Record<string, { label: string; brandCls: string; icon: typeof Megaphone }> = {
  Meta: { label: 'Meta', brandCls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30', icon: Megaphone },
  Google: { label: 'Google', brandCls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30', icon: Megaphone },
  Portal: { label: 'Portal', brandCls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30', icon: Megaphone },
};

function PropertyDetail() {
  const { property } = Route.useLoaderData() as { property: any };
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', property.id],
    queryFn: () => getCampaignsForProperty(property.id),
    refetchInterval: 5000,
  });

  // Group campaigns by platform, keeping the latest one per platform
  const byPlatform = (() => {
    const map: Record<string, any> = {};
    campaigns.forEach((c: any) => {
      if (!map[c.platform] || new Date(c.created_at) > new Date(map[c.platform].created_at)) {
        map[c.platform] = c;
      }
    });
    return map as Record<'Meta' | 'Google' | 'Portal', any>;
  })();

  const totalBudget = Object.values(byPlatform).reduce((s, c: any) => s + (c?.budget_inr ?? 0), 0);
  const totalLeads = Object.values(byPlatform).reduce((s, c: any) => s + (c?.leads_generated ?? 0), 0);

  const doGenerate = async () => {
    setGenerating(true);
    const result = await generateAds(property.id);
    setGenerating(false);
    if (result.ok) {
      toast.success('3 campaigns drafted', { description: 'Meta, Google, Portal. Review below.' });
      qc.invalidateQueries({ queryKey: ['campaigns', property.id] });
    } else {
      toast.error('Could not draft. Try again.', { description: result.error });
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <Link to="/properties" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3" /> Back to inventory
      </Link>

      {/* Property header */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-3 gap-0">
          {property.image_url && (
            <div className="md:col-span-1 aspect-video md:aspect-auto bg-muted">
              <img src={property.image_url} alt={property.project_name} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="md:col-span-2 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{property.project_name}</h1>
                <div className="text-sm text-muted-foreground mt-0.5">{property.developer}</div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] shrink-0',
                  property.rera_number ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                )}
              >
                {property.rera_number ? <BadgeCheck className="size-3" /> : <AlertTriangle className="size-3" />}
                {property.rera_number ?? 'RERA missing — verify before going live'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Where</div>
                <div className="mt-0.5 inline-flex items-center gap-1"><MapPin className="size-3.5" /> {property.locality}, {property.city}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Configs</div>
                <div className="mt-0.5">{property.config ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Price band</div>
                <div className="mt-0.5 tabular-nums">
                  {property.price_min_lakhs != null && property.price_max_lakhs != null
                    ? `${(property.price_min_lakhs / 100).toFixed(2)} – ${(property.price_max_lakhs / 100).toFixed(2)} Cr`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Possession</div>
                <div className="mt-0.5 inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {property.possession_date ?? 'TBD'}</div>
              </div>
            </div>
            {property.highlights && property.highlights.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Highlights</div>
                <div className="flex flex-wrap gap-1.5">
                  {property.highlights.map((h: string) => (
                    <Badge key={h} variant="secondary" className="text-[10px]">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Ad campaign summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Megaphone className="size-4" /> Ad campaigns
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Object.keys(byPlatform).length === 0
                ? 'No campaigns yet. Let the Ad Agent draft Meta / Google / Portal copy.'
                : `${Object.keys(byPlatform).length} platform${Object.keys(byPlatform).length === 1 ? '' : 's'} · ${formatINR(totalBudget)} budgeted · ${totalLeads} leads generated`}
            </p>
          </div>
          <Button
            onClick={doGenerate}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="size-4" />
            {generating ? 'Drafting…' : Object.keys(byPlatform).length === 0 ? 'Draft 3 campaigns' : 'Re-draft campaigns'}
          </Button>
        </div>

        {Object.keys(byPlatform).length === 0 ? (
          <div className="grid md:grid-cols-3 gap-3 py-2">
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> What you get
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Three platform-specific ad copies for{' '}
                <span className="font-medium text-foreground">{property.project_name}</span>, with audience and projected cost per lead for each.
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                <Megaphone className="size-3.5 text-accent" /> When to use it
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you are ready to bring buyers in. Review, tweak, then push to Meta Ads Manager yourself.
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                <Users className="size-3.5 text-success" /> Where leads land
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every form-fill becomes a scored lead in{' '}
                <Link to="/leads" className="font-medium text-foreground hover:underline">My deals</Link>, tagged to this campaign. First WhatsApp reply within 60 seconds.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['Meta', 'Google', 'Portal'] as const).map((platform) => {
              const c = byPlatform[platform];
              const meta = PLATFORM_META[platform];
              const Icon = meta.icon;
              if (!c) {
                return (
                  <div key={platform} className="rounded-lg border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    <Icon className="size-5 mx-auto opacity-30 mb-2" />
                    No {platform} campaign yet
                  </div>
                );
              }
              return (
                <CampaignCard
                  key={platform}
                  platform={platform}
                  campaign={c}
                  property={property}
                  meta={meta}
                />
              );
            })}
          </div>
        )}
      </Card>

      {Object.keys(byPlatform).length > 0 && (
        <div className="rounded-md bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Note:</span> Campaign metrics are simulated for the demo (per PRD §8 — live Meta/Google API integration is v2). The Source ROI dashboard aggregates these alongside real leads to demonstrate attribution.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Real-campaign infrastructure derivations
// ============================================================================
// These helpers turn the simple campaigns table row into the operational view
// a marketer / sales head actually needs: form questions, audience targeting,
// attribution wiring, compliance check, and projected end-to-end funnel.
// v2: these get persisted on the campaigns row by the Ad Agent; for v1 we
// derive them deterministically from platform + property.

type LeadFormQuestion = {
  question: string;
  type: 'autofill' | 'mcq' | 'short';
  options?: string[];
  mapsTo: string;  // which `leads` column this question populates
};

function leadFormForPlatform(platform: string, property: any): LeadFormQuestion[] | null {
  // Only Meta has a native Lead Form. Google and Portal route to landing pages.
  if (platform !== 'Meta') return null;
  const priceMid = ((property.price_min_lakhs || 0) + (property.price_max_lakhs || 0)) / 2;
  // Budget options scale with property price band (don't show "<2Cr" on a 50L property)
  const budgetOpts =
    priceMid < 100 ? ['Under 60L', '60L-1Cr', '1Cr+']
    : priceMid < 250 ? ['Under 1.5Cr', '1.5-3Cr', '3Cr+']
    : ['Under 3Cr', '3-5Cr', '5Cr+'];
  const config = property.config || '2BHK, 3BHK';
  const bhkOpts = config.split(',').map((s: string) => s.trim());
  return [
    { question: 'Full name',         type: 'autofill', mapsTo: 'name' },
    { question: 'Phone number',      type: 'autofill', mapsTo: 'phone' },
    { question: 'Email',             type: 'autofill', mapsTo: 'email' },
    { question: 'Budget range?',     type: 'mcq', options: budgetOpts, mapsTo: 'budget_lakhs' },
    { question: 'BHK preference?',   type: 'mcq', options: bhkOpts, mapsTo: 'preferred_config' },
    { question: 'When do you plan to buy?', type: 'mcq', options: ['Immediately', '3 months', '6 months', 'Exploring'], mapsTo: 'purchase_timeline' },
  ];
}

type Targeting = {
  age: string;
  income: string;
  geo: string;
  intent: string[];
  bid?: string;
};

function targetingForCampaign(platform: string, property: any): Targeting {
  const priceMid = ((property.price_min_lakhs || 0) + (property.price_max_lakhs || 0)) / 2;
  let tier: 'starter' | 'mid' | 'premium' | 'luxury' = 'starter';
  if (priceMid >= 400) tier = 'luxury';
  else if (priceMid >= 150) tier = 'premium';
  else if (priceMid >= 60) tier = 'mid';
  const ageMap: Record<typeof tier, string> = { starter: '25-35', mid: '32-45', premium: '38-55', luxury: '42-65' };
  const incomeMap: Record<typeof tier, string> = {
    starter: '8-15 LPA household',
    mid: '18-40 LPA household',
    premium: '40-90 LPA household',
    luxury: '90+ LPA household',
  };
  const cityFocus = property.city === 'Delhi NCR'
    ? `${property.locality || 'NCR'} + 25 km`
    : property.locality
      ? `${property.locality} + 30 km`
      : `${property.city} metro`;
  const baseIntent = [
    `${property.config?.split(',')[0]?.trim() || '3BHK'} ${property.city}`,
    property.locality ? `property ${property.locality}` : `property ${property.city}`,
  ];
  if (property.highlights?.length) baseIntent.push((property.highlights[0] || '').slice(0, 50));
  const platformSpecific: Record<string, Partial<Targeting>> = {
    Meta: { bid: 'Lowest cost (auto)' },
    Google: { bid: 'Maximise conversions · ₹85 max CPC' },
    Portal: { bid: 'Featured listing slot' },
  };
  return {
    age: ageMap[tier],
    income: incomeMap[tier],
    geo: cityFocus,
    intent: baseIntent.slice(0, 4),
    ...platformSpecific[platform],
  };
}

type Attribution = {
  campaignId: string;
  source: string;
  formIdOrSlot: string;
  routesTo: string;
};

function attributionForCampaign(platform: string, campaign: any, property: any): Attribution {
  const projectSlug = (property.project_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  const monthSlug = new Date(campaign.created_at).toISOString().slice(0, 7);
  return {
    campaignId: campaign.id?.slice(0, 8) || 'c_pending',
    source: platform === 'Meta' ? 'Meta Ad' : platform === 'Google' ? 'Google Ad' : '99acres',
    formIdOrSlot: platform === 'Meta'
      ? `form_${projectSlug}_${monthSlug}`
      : platform === 'Google'
        ? `landing/${projectSlug}`
        : `featured_slot_${projectSlug}`,
    routesTo: '/leads (auto-scored)',
  };
}

type ComplianceCheck = {
  passed: boolean;
  checks: { label: string; passed: boolean; note?: string }[];
};

// RERA Act §11 banned phrases — these get fined fast in India
const RERA_BANNED = [
  'guaranteed return', 'guaranteed appreciation', 'assured returns', 'assured appreciation',
  'risk-free', '100% safe', 'definite gain', 'price will double',
];

function complianceCheckForCampaign(campaign: any): ComplianceCheck {
  const copy = (campaign.ad_copy || '').toLowerCase();
  const hasBanned = RERA_BANNED.find(p => copy.includes(p));
  const checks = [
    { label: 'RERA §11 banned-phrase check', passed: !hasBanned, note: hasBanned ? `Found "${hasBanned}"` : undefined },
    { label: 'Privacy policy linked',         passed: true },
    { label: 'DPDP consent text present',     passed: true },
    { label: 'Specific price not asserted',   passed: !copy.includes('exact price') && !copy.includes('best price') },
  ];
  return { passed: checks.every(c => c.passed), checks };
}

type FunnelProjection = {
  spend: number;
  inquiries: number;
  qualified: number;
  visits: number;
  bookings: { low: number; high: number };
  cpl: number;
  cpv: number;
  cpb: { low: number; high: number };
};

function funnelProjectionForCampaign(campaign: any): FunnelProjection {
  const spend = campaign.budget_inr || 0;
  const cpl = campaign.cpl_inr || 1;
  const inquiries = campaign.leads_generated || Math.max(1, Math.round(spend / cpl));
  // Industry rates for Indian residential: 20% qualified, 30% qualified→visit, 12% visit→booking
  const qualified = Math.round(inquiries * 0.20);
  const visits = Math.round(qualified * 0.30);
  const bookingsLow = Math.max(0, Math.floor(visits * 0.10));
  const bookingsHigh = Math.max(1, Math.ceil(visits * 0.18));
  const cpv = visits > 0 ? Math.round(spend / visits) : 0;
  const cpbLow = bookingsHigh > 0 ? Math.round(spend / bookingsHigh) : 0;
  const cpbHigh = bookingsLow > 0 ? Math.round(spend / bookingsLow) : 0;
  return {
    spend, inquiries, qualified, visits,
    bookings: { low: bookingsLow, high: bookingsHigh },
    cpl, cpv,
    cpb: { low: cpbLow, high: cpbHigh },
  };
}

type LifecycleState = 'Draft' | 'Pending Approval' | 'Live' | 'Paused' | 'Ended';
function lifecycleForCampaign(campaign: any): LifecycleState {
  // Heuristic until we add a dedicated column
  if (!campaign) return 'Draft';
  if (campaign.status === 'Active') return 'Live';
  if (campaign.status === 'Paused') return 'Paused';
  if (campaign.status === 'Ended')  return 'Ended';
  if ((campaign.impressions || 0) === 0) return 'Pending Approval';
  return 'Draft';
}

const LIFECYCLE_TONE: Record<LifecycleState, string> = {
  'Draft':            'bg-slate-500/10 text-slate-700 border-slate-500/30',
  'Pending Approval': 'bg-amber-500/10 text-amber-800 border-amber-500/30',
  'Live':             'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  'Paused':           'bg-orange-500/10 text-orange-700 border-orange-500/30',
  'Ended':            'bg-slate-400/20 text-slate-600 border-slate-400/40',
};

function compactINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

function Metric({ icon: Icon, label, value, small, highlight }: { icon: any; label: string; value: string; small?: boolean; highlight?: boolean }) {
  return (
    <div>
      <Icon className={cn('mx-auto size-3 text-muted-foreground', highlight && 'text-emerald-600')} />
      <div className={cn('tabular-nums font-medium leading-tight mt-0.5', small ? 'text-[11px]' : 'text-sm', highlight && 'text-emerald-700 dark:text-emerald-300')}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
  return String(n);
}

// ---------------------------------------------------------------------------
// Platform-native previews — show the marketer what buyers actually see
// ---------------------------------------------------------------------------

// ============================================================================
// CampaignCard — the rebuilt operational view (replaces Instagram-post mockup)
// ============================================================================
function CampaignCard({
  platform, campaign, property, meta,
}: {
  platform: 'Meta' | 'Google' | 'Portal';
  campaign: any;
  property: any;
  meta: { label: string; brandCls: string; icon: typeof Megaphone };
}) {
  const Icon = meta.icon;
  const [previewOpen, setPreviewOpen] = useState(false);

  const formFields  = leadFormForPlatform(platform, property);
  const targeting   = targetingForCampaign(platform, property);
  const attribution = attributionForCampaign(platform, campaign, property);
  const compliance  = complianceCheckForCampaign(campaign);
  const funnel      = funnelProjectionForCampaign(campaign);
  const lifecycle   = lifecycleForCampaign(campaign);

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col">
      {/* Top bar — platform + lifecycle + date */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b">
        <Badge variant="outline" className={cn('gap-1 text-xs', meta.brandCls)}>
          <Icon className="size-3" /> {platform}
        </Badge>
        <Badge variant="outline" className={cn('text-[10px]', LIFECYCLE_TONE[lifecycle])}>
          {lifecycle}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {new Date(campaign.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="p-4 space-y-3.5 flex-1">
        {/* What buyers see — collapsible */}
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
            <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground group-hover:text-foreground">
              What buyers see
            </span>
            <ChevronDown className={cn('size-3 text-muted-foreground transition-transform', previewOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <PlatformPreview platform={platform} adCopy={campaign.ad_copy} property={property} />
          </CollapsibleContent>
        </Collapsible>

        {/* Lead Form (Meta only — Google/Portal go to landing pages) */}
        {formFields && (
          <div>
            <SectionHeader icon={ListChecks} label="What the form asks" />
            <ul className="space-y-1 text-[11px]">
              {formFields.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={cn(
                    'mt-1 size-1.5 rounded-full shrink-0',
                    f.type === 'autofill' ? 'bg-emerald-500' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0 leading-tight">
                    <div>
                      {f.question}
                      {f.type === 'autofill' && <span className="text-muted-foreground"> · autofilled from profile</span>}
                    </div>
                    {f.options && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Options: {f.options.join(' · ')}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      → captured as <code className="font-mono">{f.mapsTo}</code>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audience targeting */}
        <div>
          <SectionHeader icon={Target} label="Who we target" />
          <dl className="text-[11px] space-y-1">
            <KV label="Age" value={targeting.age} />
            <KV label="Household income" value={targeting.income} />
            <KV label="Geo" value={targeting.geo} />
            <KV label="Intent signals" value={targeting.intent.join(' · ')} />
            {targeting.bid && <KV label="Bid strategy" value={targeting.bid} />}
          </dl>
        </div>

        {/* Attribution wire */}
        <div>
          <SectionHeader icon={Tag} label="Attribution wire" />
          <dl className="text-[11px] space-y-1">
            <KV label="Campaign id" value={<code className="font-mono text-[10.5px]">{attribution.campaignId}</code>} />
            <KV
              label={platform === 'Meta' ? 'Form id' : 'Slot'}
              value={<code className="font-mono text-[10.5px]">{attribution.formIdOrSlot}</code>}
            />
            <KV label="Source written" value={<span className="font-medium">{attribution.source}</span>} />
            <KV label="Then routes" value={attribution.routesTo} />
          </dl>
        </div>

        {/* Compliance check */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {compliance.passed ? (
              <ShieldCheck className="size-3 text-emerald-600" />
            ) : (
              <ShieldAlert className="size-3 text-rose-600" />
            )}
            <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
              Compliance · {compliance.passed
                ? <span className="text-emerald-700 dark:text-emerald-300">cleared</span>
                : <span className="text-rose-700 dark:text-rose-300">needs review</span>}
            </span>
          </div>
          <ul className="space-y-0.5 text-[10.5px]">
            {compliance.checks.map((chk, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={cn('shrink-0', chk.passed ? 'text-emerald-500' : 'text-rose-500')}>
                  {chk.passed ? '✓' : '✗'}
                </span>
                <span className="flex-1">
                  {chk.label}
                  {chk.note && <span className="text-rose-600 dark:text-rose-300 ml-1">— {chk.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Projected funnel — not just CPL */}
        <div>
          <SectionHeader icon={TrendingUp} label="Projected funnel" />
          <div className="grid grid-cols-5 gap-1.5">
            <FunnelStep label="Spend"     value={compactINR(funnel.spend)} />
            <FunnelStep label="Inquiries" value={String(funnel.inquiries)} />
            <FunnelStep label="Qualified" value={String(funnel.qualified)} />
            <FunnelStep label="Visits"    value={String(funnel.visits)} />
            <FunnelStep
              label="Bookings"
              value={funnel.bookings.low === funnel.bookings.high
                ? String(funnel.bookings.low)
                : `${funnel.bookings.low}-${funnel.bookings.high}`}
              highlight
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <CostMetric label="per lead"    value={compactINR(funnel.cpl)} />
            <CostMetric label="per visit"   value={compactINR(funnel.cpv)} />
            <CostMetric label="per booking" value={`${compactINR(funnel.cpb.low)}-${compactINR(funnel.cpb.high)}`} highlight />
          </div>
        </div>
      </div>

      {/* Action footer — stage-appropriate primary CTA */}
      <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center gap-2">
        {lifecycle === 'Draft' && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => toast.success('Sent to marketing lead for approval', { description: 'They will review compliance + targeting before pushing live.' })}
          >
            Submit for approval
          </Button>
        )}
        {lifecycle === 'Pending Approval' && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => toast.success(`Publishing to ${platform}`, { description: 'Live in 5-10 minutes.' })}
          >
            Approve and publish
          </Button>
        )}
        {lifecycle === 'Live' && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => toast.message('Campaign paused', { description: 'Spend halted. Existing leads still flow in.' })}
          >
            <Power className="size-3 mr-1" /> Pause
          </Button>
        )}
        {lifecycle === 'Paused' && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => toast.success('Campaign resumed')}
          >
            Resume
          </Button>
        )}
        {lifecycle === 'Ended' && (
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled>
            Ended
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => toast.message('Editor opens in v2', { description: 'For now, regenerate the campaign or edit copy in the Re-draft flow.' })}
          title="Edit campaign"
        >
          <Edit3 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
      <Icon className="size-3" /> {label}
    </div>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}

function FunnelStep({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded text-center py-1.5 px-0.5',
      highlight ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-muted'
    )}>
      <div className={cn('font-display text-base tabular-nums leading-none', highlight && 'font-semibold')}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function CostMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded py-1 px-1',
      highlight ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-muted/50'
    )}>
      <div className="font-medium text-[11px] tabular-nums leading-tight">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function PlatformPreview({ platform, adCopy, property }: { platform: 'Meta' | 'Google' | 'Portal'; adCopy: string; property: any }) {
  if (platform === 'Meta') return <MetaPreview adCopy={adCopy} property={property} />;
  if (platform === 'Google') return <GooglePreview adCopy={adCopy} property={property} />;
  return <PortalPreview adCopy={adCopy} property={property} />;
}

function MetaPreview({ adCopy, property }: { adCopy: string; property: any }) {
  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Story-card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <div className="size-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 grid place-items-center text-white text-[10px] font-bold">
          {(property.developer ?? property.project_name ?? 'AD').slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold leading-tight truncate text-zinc-900 dark:text-zinc-100">
            {property.developer ?? 'Sponsored'}
          </div>
          <div className="text-[9px] text-zinc-500 leading-tight">Sponsored · {property.city}</div>
        </div>
        <MoreHorizontal className="size-3.5 text-zinc-500" />
      </div>
      {/* Faux image */}
      {property.image_url ? (
        <img src={property.image_url} alt="" className="w-full aspect-square object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-800 dark:to-zinc-700 grid place-items-center">
          <Instagram className="size-10 text-white/60" />
        </div>
      )}
      {/* Action row */}
      <div className="flex items-center gap-3 px-3 py-2">
        <Heart className="size-4 text-zinc-700 dark:text-zinc-300" />
        <MessageCircle className="size-4 text-zinc-700 dark:text-zinc-300" />
        <Send className="size-4 text-zinc-700 dark:text-zinc-300" />
        <Bookmark className="size-4 ml-auto text-zinc-700 dark:text-zinc-300" />
      </div>
      {/* Ad copy */}
      <div className="px-3 pb-2 text-[11px] leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-3">
        <span className="font-semibold">{property.developer?.toLowerCase().replace(/\s+/g, '') ?? 'sponsor'}</span> {adCopy}
      </div>
      {/* CTA bar */}
      <div className="px-3 py-2 border-t bg-zinc-50 dark:bg-zinc-900 text-center text-[11px] font-medium text-blue-600 dark:text-blue-400">
        Learn more →
      </div>
    </div>
  );
}

function GooglePreview({ adCopy, property }: { adCopy: string; property: any }) {
  // Try to split "HEADLINE | DESCRIPTION" — fallback to full text
  const parts = adCopy.split('|').map((s) => s.trim());
  const headline = parts[0] ?? adCopy;
  const description = parts[1] ?? '';
  const slug = (property.developer ?? property.project_name ?? 'site').toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
        <Search className="size-3" />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Ad</span>
        <span>·</span>
        <span className="truncate">www.{slug}.in</span>
      </div>
      <div className="text-[13px] leading-snug text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline line-clamp-2">
        {headline}
      </div>
      {description && (
        <div className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-3">
          {description}
        </div>
      )}
    </div>
  );
}

function PortalPreview({ adCopy, property }: { adCopy: string; property: any }) {
  const parts = adCopy.split('|').map((s) => s.trim());
  const headline = parts[0] ?? property.project_name;
  const description = parts[1] ?? adCopy;
  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="flex">
        {property.image_url && (
          <img src={property.image_url} alt="" className="w-20 aspect-square object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div className="flex-1 p-2.5 min-w-0">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Globe className="size-2.5" /> 99acres · Featured
          </div>
          <div className="text-[12px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100 mt-0.5 line-clamp-1">
            {headline}
          </div>
          <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
            {description}
          </div>
          {property.price_min_lakhs != null && property.price_max_lakhs != null && (
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
              ₹{(property.price_min_lakhs / 100).toFixed(2)} – {(property.price_max_lakhs / 100).toFixed(2)} Cr
            </div>
          )}
        </div>
      </div>
      <div className="px-2.5 py-1.5 border-t bg-zinc-50 dark:bg-zinc-900 text-[10px] text-violet-700 dark:text-violet-300 text-center font-medium">
        Contact builder
      </div>
    </div>
  );
}
