import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/field';

export default function CostPage() {
  const [f, setF] = useState({ km: 500, whkm: 160, fastPct: 70, fastPrice: 18, homePrice: 8, mileage: 15, petrol: 100 });
  const n = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  const LOSS = 1.1; // ~10% charging losses
  const kwh = (f.km * f.whkm) / 1000 * LOSS;
  const price = (f.fastPct / 100) * f.fastPrice + (1 - f.fastPct / 100) * f.homePrice;
  const ev = kwh * price;
  const petrol = (f.km / f.mileage) * f.petrol;
  const saving = petrol - ev;
  const max = Math.max(ev, petrol, 1);

  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-bold">EV or petrol: what does this trip cost?</h1>
        <p className="text-ink/70">Public fast charging can cost close to petrol per km. Mix in home charging to see the real difference.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="km">Trip distance (km)</Label><Input id="km" type="number" value={f.km} onChange={n('km')} /></div>
          <div><Label htmlFor="wh">EV use (Wh/km)</Label><Input id="wh" type="number" value={f.whkm} onChange={n('whkm')} /></div>
          <div><Label htmlFor="fp">Share on fast chargers (%)</Label><Input id="fp" type="number" min={0} max={100} value={f.fastPct} onChange={n('fastPct')} /></div>
          <div><Label htmlFor="fpr">Fast charger price (Rs/kWh)</Label><Input id="fpr" type="number" value={f.fastPrice} onChange={n('fastPrice')} /></div>
          <div><Label htmlFor="hp">Home price (Rs/kWh)</Label><Input id="hp" type="number" value={f.homePrice} onChange={n('homePrice')} /></div>
          <div><Label htmlFor="ml">Petrol car mileage (km/l)</Label><Input id="ml" type="number" value={f.mileage} onChange={n('mileage')} /></div>
          <div className="col-span-2"><Label htmlFor="pp">Petrol price (Rs/litre)</Label><Input id="pp" type="number" value={f.petrol} onChange={n('petrol')} /></div>
          <p className="col-span-2 text-xs text-ink/60">Includes about 10% charging loss. Check current local prices; the defaults are rough placeholders.</p>
        </Card>
        <Card>
          <CardTitle>Result for {f.km} km</CardTitle>
          <Bar label="EV" value={ev} max={max} color="bg-road" per={ev / f.km} />
          <Bar label="Petrol" value={petrol} max={max} color="bg-signal" per={petrol / f.km} />
          <p className={`mt-4 text-lg font-bold ${saving >= 0 ? 'text-ok' : 'text-bad'}`}>
            {saving >= 0 ? `EV saves Rs ${Math.round(saving)}` : `EV costs Rs ${Math.round(-saving)} more`} on this trip
          </p>
          <p className="text-sm text-ink/70">Energy needed: {kwh.toFixed(1)} kWh at an average of Rs {price.toFixed(1)}/kWh.</p>
        </Card>
      </div>
    </div>
  );
}

const Bar = ({ label, value, max, color, per }: { label: string; value: number; max: number; color: string; per: number }) => (
  <div className="mt-3">
    <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{label}</span><span>Rs {Math.round(value)} (Rs {per.toFixed(2)}/km)</span></div>
    <div className="h-4 rounded bg-paper"><div className={`h-4 rounded ${color}`} style={{ width: `${(value / max) * 100}%` }} /></div>
  </div>
);
