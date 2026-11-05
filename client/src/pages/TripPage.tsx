import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, geocode } from '@/lib/api';
import type { Charger, TripResult, Vehicle } from '@/lib/types';
import { ChargerMap } from '@/components/ChargerMap';
import { StatusBadge, TYPE_LABEL } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/field';
import { fmtMinutes } from '@/lib/utils';

const PRESETS = [['Mumbai', 'Ahmedabad'], ['Surat', 'Pune'], ['Bardoli', 'Vadodara']];

export default function TripPage() {
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => api<Vehicle[]>('/vehicles') });
  const { data: chargers = [] } = useQuery({ queryKey: ['chargers'], queryFn: () => api<Charger[]>('/chargers') });
  const [f, setF] = useState({
    from: 'Surat, Gujarat', to: 'Ahmedabad, Gujarat', vehicleId: 'nexon-ev-lr', startSoc: 90, reserve: 10,
    speed: 80, ac: true, load: 150, temp: 32,
  });
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const plan = useMutation({
    mutationFn: async () => {
      const [a, b] = await Promise.all([geocode(f.from), geocode(f.to)]);
      const result = await api<TripResult>('/trip/plan', {
        body: {
          from: a, to: b, vehicleId: f.vehicleId, startSocPct: f.startSoc, reserveSocPct: f.reserve,
          speedKmh: f.speed, acOn: f.ac, loadKg: f.load, tempC: f.temp,
        },
      });
      return { result, a: a.label, b: b.label };
    },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); plan.mutate(); };
  const r = plan.data?.result;
  const vehicle = vehicles.find((v) => v.id === f.vehicleId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Plan a trip with your real range</h1>
        <p className="text-ink/70">Advertised range is a best case. This planner adjusts for speed, AC, load and weather, then picks chargers that are not reported broken.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {PRESETS.map(([a, b]) => (
                <button type="button" key={a + b} className="rounded-full border border-line px-2.5 py-1 hover:bg-paper" onClick={() => setF((p) => ({ ...p, from: `${a}, India`, to: `${b}, India` }))}>{a} to {b}</button>
              ))}
            </div>
            <div><Label htmlFor="from">From</Label><Input id="from" required value={f.from} onChange={(e) => set('from', e.target.value)} /></div>
            <div><Label htmlFor="to">To</Label><Input id="to" required value={f.to} onChange={(e) => set('to', e.target.value)} /></div>
            <div><Label htmlFor="veh">Vehicle</Label>
              <Select id="veh" value={f.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} - {v.ratedKm} km rated</option>)}
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ss">Starting charge: {f.startSoc}%</Label><input id="ss" className="w-full" type="range" min={20} max={100} value={f.startSoc} onChange={(e) => set('startSoc', Number(e.target.value))} /></div>
              <div><Label htmlFor="rs">Arrival reserve: {f.reserve}%</Label><input id="rs" className="w-full" type="range" min={0} max={30} value={f.reserve} onChange={(e) => set('reserve', Number(e.target.value))} /></div>
              <div><Label htmlFor="sp">Cruising speed (km/h)</Label><Input id="sp" type="number" min={30} max={140} value={f.speed} onChange={(e) => set('speed', Number(e.target.value))} /></div>
              <div><Label htmlFor="ld">Passengers and luggage (kg)</Label><Input id="ld" type="number" min={0} max={600} value={f.load} onChange={(e) => set('load', Number(e.target.value))} /></div>
              <div><Label htmlFor="tp">Outside temperature (C)</Label><Input id="tp" type="number" min={-10} max={50} value={f.temp} onChange={(e) => set('temp', Number(e.target.value))} /></div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium"><input type="checkbox" checked={f.ac} onChange={(e) => set('ac', e.target.checked)} /> AC on</label>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={plan.isPending}>{plan.isPending ? 'Planning...' : 'Plan trip'}</Button>
            {plan.error && <p className="text-sm text-bad">{(plan.error as Error).message}</p>}
            {vehicle && <p className="text-xs text-ink/60">Specs for {vehicle.name} are approximate. Edit server/src/vehicles.ts to match your vehicle.</p>}
          </form>
        </Card>

        <div className="space-y-4">
          {r && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Distance" value={`${r.totalKm} km`} />
                <Stat label="Real range" value={`${r.realRangeKm} km`} sub={`${r.ratedKm} km advertised (${Math.round(r.factors.total * 100)}%)`} />
                <Stat label="Total time" value={fmtMinutes(r.totalMinutes)} sub={`${fmtMinutes(r.driveMinutes)} driving + ${fmtMinutes(r.chargeMinutes)} charging`} />
                <Stat label="Arrive with" value={r.arrivalSoc == null ? 'n/a' : `${Math.round(r.arrivalSoc * 100)}%`} />
              </div>
              {!r.ok && <Card className="border-bad bg-bad/5 text-bad"><p className="font-semibold">This trip cannot be completed with the chargers we know about.</p><p className="text-sm">{r.reason}</p></Card>}
              {r.warnings.map((w) => <Card key={w} className="border-warn bg-warn/5 text-sm">{w}</Card>)}
              <div className="h-[420px] overflow-hidden rounded-xl border border-line">
                <ChargerMap chargers={r.stops.map((s) => s.charger)} line={r.line} stopIds={r.stops.map((s) => s.charger.id)} />
              </div>
              <Card>
                <CardTitle>{r.stops.length ? `${r.stops.length} charging stop${r.stops.length > 1 ? 's' : ''}` : 'No charging stop needed'}</CardTitle>
                <p className="mb-2 text-xs text-ink/60">{plan.data?.a.split(',')[0]} to {plan.data?.b.split(',')[0]}</p>
                <ol className="space-y-3">
                  {r.stops.map((s, i) => (
                    <li key={s.charger.id} className="flex gap-3 rounded-lg bg-paper p-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-road text-sm font-bold text-white">{i + 1}</span>
                      <div className="text-sm">
                        <p className="font-semibold"><Link className="underline" to={`/chargers/${s.charger.id}`}>{s.charger.name}</Link> <StatusBadge status={s.charger.status} /></p>
                        <p>km {s.alongKm} - {s.charger.city} - {TYPE_LABEL[s.charger.type]} {s.charger.powerKw ? `${s.charger.powerKw} kW` : ''}</p>
                        <p>Arrive {Math.round(s.arriveSoc * 100)}%, charge to {Math.round(s.chargeToSoc * 100)}% in about {fmtMinutes(s.chargeMinutes)}{s.detourKm > 0.5 ? `, ${s.detourKm} km off route` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          )}
          {!r && <div className="h-[460px] overflow-hidden rounded-xl border border-line"><ChargerMap chargers={chargers} /></div>}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="p-3"><p className="text-xs text-ink/60">{label}</p><p className="font-display text-2xl font-bold">{value}</p>{sub && <p className="text-xs text-ink/60">{sub}</p>}</Card>
);
