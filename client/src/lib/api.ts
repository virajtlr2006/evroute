import { useAuth } from '@/store/auth';

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) useAuth.getState().logout();
    throw new Error(data.error ?? res.statusText);
  }
  return data as T;
}

export async function geocode(q: string): Promise<{ lat: number; lng: number; label: string }> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find "${q}". Try adding the state, e.g. "Surat, Gujarat".`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name as string };
}
