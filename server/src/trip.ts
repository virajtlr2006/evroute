import type { Vehicle } from './vehicles';

export interface LatLng { lat: number; lng: number }
export interface PlanInput {
  from: LatLng; to: LatLng; vehicle: Vehicle;
  startSoc: number;   // 0-1
  reserveSoc: number; // 0-1, never plan to arrive below this
  speedKmh: number; acOn: boolean; loadKg: number; tempC: number;
}
export interface ChargerRow {
  id: number; name: string; network: string; lat: number; lng: number; city: string;
  powerKw: number; type: 'fast_dc' | 'slow_ac' | 'swap'; vehicle: 'car' | 'bike' | 'both';
  status: 'available' | 'busy' | 'broken' | 'unknown'; pricePerKwh: number;
}

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
export function haversine(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Heuristic real-world range. These factors are rules of thumb, not lab data. */
export function realRange(v: Vehicle, i: Pick<PlanInput, 'speedKmh' | 'acOn' | 'loadKg' | 'tempC'>) {
  const speed = Math.max(0.55, 1 - Math.max(0, i.speedKmh - 60) * 0.006);
  const ac = i.acOn ? 0.92 : 1;
  const load = Math.max(0.8, 1 - (i.loadKg / 100) * 0.015);
  const temp = i.tempC < 10 ? 1 - (10 - i.tempC) * 0.01 : i.tempC > 35 ? 1 - (i.tempC - 35) * 0.008 : 1;
  const total = Math.max(0.4, speed * ac * load * Math.max(0.7, temp));
  return { km: v.ratedKm * total, factors: { speed, ac, load, temp: Math.max(0.7, temp), total } };
}

function usable(c: ChargerRow, v: Vehicle) {
  if (c.status === 'broken') return false;
  if (v.kind === 'car') return c.vehicle !== 'bike' && c.type !== 'swap';
  if (c.vehicle === 'car') return false;
  if (c.type === 'swap') return v.swappable;
  if (c.type === 'fast_dc') return false;
  return true;
}

function chargeMinutes(c: ChargerRow, v: Vehicle, fromSoc: number, toSoc: number) {
  if (c.type === 'swap') return 5;
  const kwh = Math.max(0, toSoc - fromSoc) * v.batteryKwh;
  const limit = c.type === 'fast_dc' ? Math.min(c.powerKw, v.maxDcKw) * 0.75 : Math.min(c.powerKw, v.maxAcKw) * 0.9;
  if (limit <= 0) return 9999;
  return Math.round((kwh / limit) * 60);
}

export interface RouteGeom { coords: [number, number][]; distanceKm: number } // coords are [lng, lat]

export function planTrip(route: RouteGeom, chargers: ChargerRow[], input: PlanInput) {
  const v = input.vehicle;
  const rr = realRange(v, input);
  const range = rr.km;
  const total = route.distanceKm;

  // cumulative distance along the route
  const cum: number[] = [0];
  for (let i = 1; i < route.coords.length; i++) {
    const a = { lat: route.coords[i - 1][1], lng: route.coords[i - 1][0] };
    const b = { lat: route.coords[i][1], lng: route.coords[i][0] };
    cum.push(cum[i - 1] + haversine(a, b));
  }
  const scale = total / (cum[cum.length - 1] || 1);

  const MAX_DETOUR_KM = 8;
  const candidates = chargers.filter((c) => usable(c, v)).map((c) => {
    let best = Infinity, idx = 0;
    for (let i = 0; i < route.coords.length; i++) {
      const d = haversine({ lat: route.coords[i][1], lng: route.coords[i][0] }, c);
      if (d < best) { best = d; idx = i; }
    }
    return { c, along: cum[idx] * scale, detour: best };
  }).filter((x) => x.detour <= MAX_DETOUR_KM);

  const warnings: string[] = [];
  const stops: any[] = [];
  let pos = 0;
  let soc = input.startSoc;
  let chargeTotal = 0;
  let ok = true;
  let reason = '';
  let guard = 0;

  const reach = () => Math.max(0, (soc - input.reserveSoc) * range);

  while (pos + reach() < total && guard++ < 25) {
    const maxReach = pos + reach();
    const options = candidates.filter((x) => x.along > pos + 1 && x.along <= maxReach);
    if (!options.length) {
      ok = false;
      reason = `No usable charger found between km ${Math.round(pos)} and km ${Math.round(maxReach)} on this route. Try a higher starting charge, a lower reserve, slower speed, or add a charger on the map.`;
      break;
    }
    const score = (x: (typeof options)[number]) =>
      x.along - (x.c.status === 'busy' ? 25 : 0) - (x.c.status === 'unknown' ? 10 : 0) - x.detour * 2;
    const pick = options.reduce((a, b) => (score(b) > score(a) ? b : a));

    const legKm = pick.along - pos + pick.detour;
    const arriveSoc = soc - legKm / range;
    const target = pick.c.type === 'fast_dc' ? 0.8 : 1;
    const needed = input.reserveSoc + (total - pick.along + pick.detour) / range + 0.05;
    const chargeTo = Math.min(1, Math.max(arriveSoc, Math.min(target, needed)));
    const mins = chargeMinutes(pick.c, v, arriveSoc, chargeTo);
    chargeTotal += mins;

    if (pick.c.status === 'busy') warnings.push(`${pick.c.name} was reported busy: expect a queue.`);
    if (pick.c.status === 'unknown') warnings.push(`${pick.c.name} has no recent status report: confirm it works before relying on it.`);
    if (arriveSoc < input.reserveSoc + 0.03) warnings.push(`Arrival at ${pick.c.name} is close to your reserve. Keep speed steady.`);

    stops.push({
      charger: pick.c, alongKm: Math.round(pick.along), detourKm: Math.round(pick.detour * 10) / 10,
      legKm: Math.round(legKm), arriveSoc, chargeToSoc: chargeTo, chargeMinutes: mins,
    });
    pos = pick.along;
    soc = chargeTo - pick.detour / range;
  }

  const arrivalSoc = ok ? soc - (total - pos) / range : null;
  const driveMinutes = Math.round((total / input.speedKmh) * 60);

  // thin the polyline for the response
  const step = Math.max(1, Math.floor(route.coords.length / 800));
  const line = route.coords.filter((_, i) => i % step === 0 || i === route.coords.length - 1).map(([lng, lat]) => [lat, lng]);

  return {
    ok, reason, totalKm: Math.round(total), ratedKm: v.ratedKm, realRangeKm: Math.round(range),
    factors: rr.factors, stops, warnings: [...new Set(warnings)],
    driveMinutes, chargeMinutes: chargeTotal, totalMinutes: driveMinutes + chargeTotal, arrivalSoc, line,
  };
}

export async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteGeom> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'evroute-demo/1.0' } });
    if (!res.ok) throw new Error(`Routing service returned ${res.status}`);
    const data: any = await res.json();
    const r = data.routes?.[0];
    if (!r) throw new Error('No driving route found between these places.');
    return { coords: r.geometry.coordinates, distanceKm: r.distance / 1000 };
  } finally {
    clearTimeout(t);
  }
}
