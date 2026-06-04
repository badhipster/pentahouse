import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProperties, syncListing } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus, Building2, MapPin, CalendarClock, BadgeCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLakhs } from '@/lib/format';

export const Route = createFileRoute('/properties/')({
  head: () => ({
    meta: [
      { title: 'Inventory — Pentahouse' },
      { name: 'description', content: 'Your project catalogue. Add new projects by pasting their info; the Listing Agent extracts the structured fields.' },
    ],
  }),
  component: PropertiesIndex,
});

const SAMPLE = `Lodha Supremus Lower Parel by Macrotech Developers in Mumbai. 3BHK and 4BHK only, carpet area 1180 to 2050 sqft, prices 4.25 Cr to 8.5 Cr. Possession December 2026. MahaRERA A51800000454. Walking distance to Phoenix Palladium. Amenities: sea-view deck, sky lounge, concierge, spa, indoor sports.`;

function PropertiesIndex() {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
    refetchInterval: 8000,
  });

  const submit = async () => {
    if (!rawText.trim()) {
      toast.error('Paste the project info first');
      return;
    }
    setSubmitting(true);
    const result = await syncListing(rawText);
    setSubmitting(false);
    if (result.ok) {
      toast.success(`${result.project_name} added`, {
        description: 'Fields extracted. Open the project to draft ad copy.',
      });
      setSheetOpen(false);
      setRawText('');
      qc.invalidateQueries({ queryKey: ['properties'] });
    } else {
      toast.error('Could not add property', { description: result.error });
    }
  };

  return (
    <div className="p-8 space-y-7 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4" data-anim="rise" data-stagger="1">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 className="font-display text-[40px] leading-[1.05] mt-1">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {properties.length} active project{properties.length === 1 ? '' : 's'}. Paste a project paragraph and we extract the fields. No data entry.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90 btn-press">
          <Plus className="size-4" /> Add a project
        </Button>
      </header>

      {properties.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="size-12 mx-auto mb-3 opacity-30" />
          <div className="text-base font-medium">No projects yet</div>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Add a project" and paste anything — a paragraph, a CSV row, a brochure excerpt.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p: any) => (
            <Link key={p.id} to="/properties/$id" params={{ id: p.id }}>
              <Card className="overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all">
                {p.image_url && (
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={p.image_url}
                      alt={p.project_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <Badge
                      variant="outline"
                      className={cn(
                        'absolute top-2 right-2 bg-background/95 text-[10px]',
                        p.rera_number ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                      )}
                    >
                      {p.rera_number ? <BadgeCheck className="size-3" /> : <AlertTriangle className="size-3" />}
                      {p.rera_number ? 'RERA verified' : 'RERA missing'}
                    </Badge>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-base truncate">{p.project_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.developer}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{p.locality}, {p.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarClock className="size-3 shrink-0" />
                      <span>Possession {p.possession_date ?? 'TBD'}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold tabular-nums">
                      {p.price_min_lakhs != null && p.price_max_lakhs != null
                        ? `${formatLakhs(p.price_min_lakhs)} – ${formatLakhs(p.price_max_lakhs)}`
                        : '—'}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{p.config ?? '—'}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600" /> Add a new project
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Paste anything — a paragraph, brochure excerpt, broker note
              </label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                placeholder="Drop the project info here. The Listing Agent will extract project name, developer, city, locality, BHK, prices, RERA, possession date, and amenities automatically."
                className="mt-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setRawText(SAMPLE)}
                className="text-[11px] text-primary hover:underline mt-1.5"
              >
                Use a sample to try
              </button>
            </div>
            <div className="rounded-md bg-success/10 border border-success/30 px-3 py-2.5 text-xs">
              <div className="font-semibold text-success mb-1">What happens next</div>
              <p className="text-muted-foreground leading-relaxed">
                Fields extracted in seconds. Property card appears in your catalogue. Ad copy for Meta, Google, and Portal drafted on the next page.
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting || !rawText.trim()}>
              {submitting ? 'Reading…' : 'Add to catalogue'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
