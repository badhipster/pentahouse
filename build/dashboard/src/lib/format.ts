export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  // Indian grouping: ₹X,XX,XXX
  const s = Math.round(n).toString();
  if (s.length <= 3) return '₹' + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + grouped + ',' + last3;
}

export function formatLakhs(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 100) return `₹${(n / 100).toFixed(2)} Cr`;
  return `₹${n}L`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + ' •••• ' + clean.slice(-3);
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
