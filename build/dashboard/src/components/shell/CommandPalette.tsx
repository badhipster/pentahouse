import { useNavigate } from '@tanstack/react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAppStore } from '@/stores/app-store';
import { fixtures } from '@/lib/fixtures';

export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const setOpen = useAppStore((s) => s.setPaletteOpen);
  const navigate = useNavigate();

  const go = (path: string, params?: Record<string, string>) => {
    setOpen(false);
    navigate({ to: path as any, params: params as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search leads, projects, localities…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Leads">
          {fixtures.lead_queue.map((l) => (
            <CommandItem
              key={l.lead_id}
              value={`${l.name} ${l.phone} ${l.preferred_city ?? ''} ${l.matched_project ?? ''}`}
              onSelect={() => go('/leads/$id', { id: l.lead_id })}
            >
              <span className="font-medium">{l.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {l.preferred_city} · {l.stage}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Projects">
          {fixtures.properties.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.project_name} ${p.locality} ${p.city} ${p.developer}`}
              onSelect={() => go('/leads')}
            >
              <span className="font-medium">{p.project_name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {p.locality}, {p.city}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go('/')}>Command Center</CommandItem>
          <CommandItem onSelect={() => go('/leads')}>Lead Pipeline</CommandItem>
          <CommandItem onSelect={() => go('/approvals')}>Approvals</CommandItem>
          <CommandItem onSelect={() => go('/visits')}>Visits</CommandItem>
          <CommandItem onSelect={() => go('/analytics')}>Analytics</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
