import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Service } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/field';

const KIND = { mechanic: 'Mechanic', towing: 'Towing', service_center: 'Service center' } as Record<string, string>;

export default function ServicesPage() {
  const [kind, setKind] = useState('');
  const [city, setCity] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['services', kind, city],
    queryFn: () => api<Service[]>(`/services?${new URLSearchParams({ ...(kind && { kind }), ...(city && { city }) })}`),
  });
  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-bold">Roadside help for EVs</h1>
        <p className="text-ink/70">Find EV-capable mechanics, flatbed towing and service centres before you need them. Save the number for your route.</p></div>
      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
        <Input placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Service type">
          <option value="">All services</option><option value="mechanic">Mechanic</option><option value="towing">Towing</option><option value="service_center">Service center</option>
        </Select>
      </div>
      {isLoading && <p>Loading...</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <Card key={s.id}>
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm text-ink/70">{s.city}</p>
            <div className="my-2 flex gap-1.5"><Badge>{KIND[s.kind]}</Badge>{s.evCertified && <Badge className="bg-ok/15 text-ok">EV certified</Badge>}</div>
            <p className="text-sm">{s.notes}</p>
            <a className="mt-2 inline-block text-sm font-semibold underline" href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>
          </Card>
        ))}
        {!isLoading && !data.length && <p className="text-ink/70">Nothing listed for that filter yet.</p>}
      </div>
      <p className="text-xs text-ink/60">Listings are demo entries with placeholder numbers. Add real, verified businesses in the database (services table).</p>
    </div>
  );
}
