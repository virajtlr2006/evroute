import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { LocationPicker } from '@/components/ChargerMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/field';

const CONNECTORS = ['CCS2', 'CHAdeMO', 'Type2', 'GB/T', '15A socket', 'Battery swap'];
const AMENITIES = ['restroom', 'food', 'wifi', 'shelter'];

export default function AddChargerPage() {
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [f, setF] = useState({ name: '', network: 'Independent', city: '', address: '', type: 'slow_ac', vehicle: 'car', powerKw: 7.4, pricePerKwh: 10, isPrivate: false });
  const [conn, setConn] = useState<string[]>(['Type2']);
  const [am, setAm] = useState<string[]>([]);
  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const create = useMutation({
    mutationFn: () => api<{ id: number }>('/chargers', { body: { ...f, lat: pos![0], lng: pos![1], connectors: conn, amenities: am } }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['chargers'] }); nav(`/chargers/${d.id}`); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (pos) create.mutate(); };

  if (!user) return <Card>Please <Link className="underline" to="/login">log in</Link> to add a charger.</Card>;

  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-bold">Add a charger</h1>
        <p className="text-ink/70">Know a charger that is missing? Add it. Or share your home charger with travellers: tick "private" and approve each booking yourself.</p></div>
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div><Label htmlFor="n">Name</Label><Input id="n" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="c">City</Label><Input id="c" required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div><Label htmlFor="nw">Network</Label><Input id="nw" value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} /></div>
          </div>
          <div><Label htmlFor="a">Address or landmark</Label><Input id="a" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="t">Charger type</Label>
              <Select id="t" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="fast_dc">DC fast</option><option value="slow_ac">Slow AC</option><option value="swap">Battery swap</option></Select></div>
            <div><Label htmlFor="v">For</Label>
              <Select id="v" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })}>
                <option value="car">Cars</option><option value="bike">Bikes / scooters</option><option value="both">Both</option></Select></div>
            <div><Label htmlFor="p">Power (kW)</Label><Input id="p" type="number" step="0.1" min={0} value={f.powerKw} onChange={(e) => setF({ ...f, powerKw: Number(e.target.value) })} /></div>
            <div><Label htmlFor="pr">Price (Rs/kWh)</Label><Input id="pr" type="number" min={0} value={f.pricePerKwh} onChange={(e) => setF({ ...f, pricePerKwh: Number(e.target.value) })} /></div>
          </div>
          <fieldset><legend className="mb-1 text-sm font-medium">Connectors</legend>
            <div className="flex flex-wrap gap-3 text-sm">{CONNECTORS.map((x) => <label key={x} className="flex items-center gap-1.5"><input type="checkbox" checked={conn.includes(x)} onChange={() => toggle(conn, x, setConn)} />{x}</label>)}</div></fieldset>
          <fieldset><legend className="mb-1 text-sm font-medium">Nearby amenities</legend>
            <div className="flex flex-wrap gap-3 text-sm">{AMENITIES.map((x) => <label key={x} className="flex items-center gap-1.5"><input type="checkbox" checked={am.includes(x)} onChange={() => toggle(am, x, setAm)} />{x}</label>)}</div></fieldset>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.isPrivate} onChange={(e) => setF({ ...f, isPrivate: e.target.checked })} />Private charger: travellers must request a booking</label>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium">Click the map to set the location {pos && <span className="font-normal text-ink/60">({pos[0].toFixed(4)}, {pos[1].toFixed(4)})</span>}</p>
          <div className="overflow-hidden rounded-xl border border-line"><LocationPicker value={pos} onChange={setPos} /></div>
          {create.error && <p className="text-sm text-bad">{(create.error as Error).message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={!pos || !conn.length || create.isPending}>{pos ? 'Save charger' : 'Pick a location first'}</Button>
        </Card>
      </form>
    </div>
  );
}
