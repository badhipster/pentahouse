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
import { Plus, Building2, MapPin, CalendarClock, BadgeCheck, AlertTriangle, Sparkles, Upload, FileText } from 'lucide-react';
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
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [fileName, setFileName] = useState('');

  const onFile = async (e: any) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(txt|csv|md|json|tsv)$/i.test(f.name)) {
      toast.error('Use a .txt, .csv, .md or .json file', {
        description: 'For a PDF brochure, copy the text out and paste it instead.',
      });
      return;
    }
    const text = await f.text();
    setRawText(text);
    setFileName(f.name);
    setMode('paste');
    toast.success(`Loaded ${f.name}`, { description: 'Review the details, then add to catalogue.' });
  };

  const CAPTURE_FIELDS = [
    'Project name', 'Developer', 'City & locality', 'Configurations (BHK)',
    'Price band', 'RERA number', 'Possession date', 'Amenities & USPs',
  ];

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
            {properties.length} active project{properties.length === 1 ? '' : 's'}. Paste a project paragraph or upload a sheet — we extract the fields. No manual data entry.
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
            Click "Add a project" — paste a paragraph or upload a price sheet, and we extract the rest.
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
            {/* Input method toggle — paste or upload a file, both feed the same extractor */}
            <div className="inline-flex rounded-md border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('paste')}
                className={cn('px-3 py-1.5 rounded transition-colors', mode === 'paste' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <FileText className="size-3 inline mr-1" /> Paste details
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={cn('px-3 py-1.5 rounded transition-colors', mode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Upload className="size-3 inline mr-1" /> Upload a file
              </button>
            </div>

            {mode === 'paste' ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Paste anything — a paragraph, brochure excerpt, broker note, or a price-sheet row
                </label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={9}
                  placeholder="Drop the project info here. We extract project name, developer, city, locality, BHK, prices, RERA, possession date, and amenities automatically."
                  className="mt-1 font-mono text-xs"
                />
                <div className="flex items-center gap-3 mt-1.5">
                  <button type="button" onClick={() => { setRawText(SAMPLE); setFileName(''); }} className="text-[11px] text-primary hover:underline">
                    Use a sample to try
                  </button>
                  {fileName && <span className="text-[11px] text-muted-foreground">From {fileName}</span>}
                </div>
              </div>
            ) : (
              <label className="block rounded-lg border-2 border-dashed px-4 py-8 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="file" accept=".txt,.csv,.md,.json,.tsv" className="hidden" onChange={onFile} />
                <Upload className="size-7 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">Choose a file to upload</div>
                <div className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  A price sheet, inventory export, or fact sheet — .txt, .csv, .md or .json. For a PDF brochure, copy the text and use Paste details.
                </div>
              </label>
            )}

            {/* What gets stored — so the user knows exactly what metadata the catalogue keeps */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">What we pull out and store</div>
              <div className="flex flex-wrap gap-1.5">
                {CAPTURE_FIELDS.map((f) => (
                  <span key={f} className="text-[11px] bg-muted/60 border rounded px-1.5 py-0.5">{f}</span>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-success/10 border border-success/30 px-3 py-2.5 text-xs">
              <div className="font-semibold text-success mb-1">What happens next</div>
              <p className="text-muted-foreground leading-relaxed">
                Fields extracted in seconds and saved to your catalogue. Anything unclear is flagged for a quick review instead of guessed. Then you can draft Meta, Google, and Portal ads for it on the next page.
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
