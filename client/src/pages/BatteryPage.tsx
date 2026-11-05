import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { BatteryLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/field';

const KIND = { home_ac: 'Home AC', public_ac: 'Public AC', dc_fast: 'DC fast', swap: 'Battery swap' };
const today = () => new Date().toISOString().slice(0, 10);

export default function BatteryPage() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { data: logs = [] } = useQuery({ queryKey: ['battery'], enabled: !!user, queryFn: () => api<BatteryLog[]>('/battery-logs') });
  const [f, setF] = useState({ logDate: today(), odometerKm: 0, kwhAdded: 0, socStart: 20, socEnd: 80, chargeKind: 'dc_fast', cost: 0 });
  const add = useMutation({ mutationFn: () => api('/battery-logs', { body: f }), onSuccess: () => qc.invalidateQueries({ queryKey: ['battery'] }) });
  const del = useMutation({ mutationFn: (id: number) => api(`/battery-logs/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['battery'] }) });

  const stats = useMemo(() => {
    const eff: number[] = [];
    for (let i = 1; i < logs.length; i++) {
      const km = logs[i].odometerKm - logs[i - 1].odometerKm;
      if (km > 5 && logs[i].kwhAdded > 0) eff.push((logs[i].kwhAdded * 1000) / km);
    }
    const fastShare = logs.length ? logs.filter((l) => l.chargeKind === 'dc_fast').length / logs.length : 0;
    const totalKwh = logs.reduce((s, l) => s + l.kwhAdded, 0);
    const totalCost = logs.reduce((s, l) => s + l.cost, 0);
    const km = logs.length > 1 ? logs[logs.length - 1].odometerKm - logs[0].odometerKm : 0;
    return { eff, fastShare, totalKwh, totalCost, km };
  }, [logs]);

  if (!user) return <Card>Please <Link className="underline" to="/login">log in</Link> to keep a battery log.</Card>;
  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate(); };
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });

  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-bold">Battery log</h1>
        <p className="text-ink/70">Log each charge. We work out your real efficiency and how often you rely on fast charging, which wears batteries faster.</p></div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="d">Date</Label><Input id="d" type="date" value={f.logDate} onChange={(e) => setF({ ...f, logDate: e.target.value })} /></div>
            <div><Label htmlFor="o">Odometer (km)</Label><Input id="o" type="number" min={0} required value={f.odometerKm} onChange={num('odometerKm')} /></div>
            <div><Label htmlFor="s1">Charge before (%)</Label><Input id="s1" type="number" min={0} max={100} value={f.socStart} onChange={num('socStart')} /></div>
            <div><Label htmlFor="s2">Charge after (%)</Label><Input id="s2" type="number" min={0} max={100} value={f.socEnd} onChange={num('socEnd')} /></div>
            <div><Label htmlFor="k">Energy added (kWh)</Label><Input id="k" type="number" step="0.1" min={0} required value={f.kwhAdded} onChange={num('kwhAdded')} /></div>
            <div><Label htmlFor="c">Cost (Rs)</Label><Input id="c" type="number" min={0} value={f.cost} onChange={num('cost')} /></div>
            <div className="col-span-2"><Label htmlFor="t">Charger type</Label>
              <Select id="t" value={f.chargeKind} onChange={(e) => setF({ ...f, chargeKind: e.target.value })}>
                {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
            <Button type="submit" className="col-span-2" disabled={add.isPending}>Save charge</Button>
            {add.error && <p className="col-span-2 text-sm text-bad">{(add.error as Error).message}</p>}
          </form>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Mini label="Avg efficiency" value={stats.eff.length ? `${Math.round(stats.eff.reduce((a, b) => a + b, 0) / stats.eff.length)} Wh/km` : 'Log 2+ charges'} />
            <Mini label="Fast-charge share" value={`${Math.round(stats.fastShare * 100)}%`} />
            <Mini label="Energy added" value={`${stats.totalKwh.toFixed(1)} kWh`} />
            <Mini label="Cost per km" value={stats.km > 0 ? `Rs ${(stats.totalCost / stats.km).toFixed(2)}` : 'n/a'} />
          </div>
          {stats.fastShare > 0.7 && logs.length >= 4 && <Card className="border-warn bg-warn/5 text-sm">Most of your charges are DC fast. Fast charging and heat speed up battery wear, so use slower AC charging when you are not in a hurry and avoid charging to 100% on fast chargers.</Card>}
          {stats.eff.length > 1 && <Card><CardTitle>Efficiency trend (Wh/km, lower is better)</CardTitle><Spark data={stats.eff} /></Card>}
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left"><tr>{['Date', 'Odometer', 'Type', 'kWh', 'Charge', 'Cost', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{[...logs].reverse().map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-3 py-2">{l.logDate}</td><td className="px-3 py-2">{l.odometerKm} km</td><td className="px-3 py-2">{KIND[l.chargeKind]}</td>
                  <td className="px-3 py-2">{l.kwhAdded}</td><td className="px-3 py-2">{l.socStart}% to {l.socEnd}%</td><td className="px-3 py-2">Rs {l.cost}</td>
                  <td className="px-3 py-2"><button className="text-bad underline" onClick={() => del.mutate(l.id)}>Delete</button></td>
                </tr>))}
                {!logs.length && <tr><td colSpan={7} className="px-3 py-4 text-ink/70">No charges logged yet. Add your last charge on the left.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <Card className="p-3"><p className="text-xs text-ink/60">{label}</p><p className="font-display text-xl font-bold">{value}</p></Card>
);

function Spark({ data }: { data: number[] }) {
  const w = 600, h = 100, min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 10 - ((v - min) / span) * (h - 20)}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Efficiency trend"><polyline points={pts} fill="none" stroke="#0b5d4b" strokeWidth="3" /></svg>;
}
