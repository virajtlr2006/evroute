import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';
import { db } from './db';
import { seedIfEmpty } from './seed';
import { vehicles } from './vehicles';
import { fetchRoute, planTrip, type ChargerRow } from './trip';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number };
    user: { id: number };
  }
}

seedIfEmpty();

const app = Fastify({ logger: { level: 'warn' } });
await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' });

app.setErrorHandler((err: any, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  }
  const code = err.statusCode ?? 500;
  if (code >= 500) app.log.error(err);
  reply.code(code).send({ error: code >= 500 ? err.message || 'Server error' : err.message });
});

const auth = async (req: any, reply: any) => {
  try { await req.jwtVerify(); } catch { reply.code(401).send({ error: 'Please log in first.' }); }
};

// ---------- helpers ----------
const STALE_HOURS = 24;
function effectiveStatus(r: any) {
  if (!r.status_updated_at) return 'unknown';
  const ageH = (Date.now() - new Date(r.status_updated_at.replace(' ', 'T') + 'Z').getTime()) / 3.6e6;
  return ageH > STALE_HOURS ? 'unknown' : r.status;
}
const mapCharger = (r: any) => ({
  id: r.id, name: r.name, network: r.network, lat: r.lat, lng: r.lng, address: r.address, city: r.city,
  connectors: JSON.parse(r.connectors), powerKw: r.power_kw, type: r.type, vehicle: r.vehicle,
  pricePerKwh: r.price_per_kwh, amenities: JSON.parse(r.amenities), status: effectiveStatus(r),
  statusUpdatedAt: r.status_updated_at, isPrivate: !!r.is_private, ownerId: r.owner_id,
  avgRating: r.avg_rating == null ? null : Math.round(r.avg_rating * 10) / 10, reviewCount: r.review_count ?? 0,
});
const CHARGER_SELECT = `SELECT c.*,
  (SELECT AVG(rating) FROM reviews WHERE charger_id = c.id) AS avg_rating,
  (SELECT COUNT(*) FROM reviews WHERE charger_id = c.id) AS review_count
  FROM chargers c`;
const idParam = (v: unknown) => z.coerce.number().int().positive().parse(v);

// ---------- health & vehicles ----------
app.get('/api/health', async () => ({ ok: true }));
app.get('/api/vehicles', async () => vehicles);

// ---------- auth ----------
const registerSchema = z.object({ name: z.string().min(2).max(60), email: z.string().email(), password: z.string().min(6).max(100) });
app.post('/api/auth/register', async (req, reply) => {
  const b = registerSchema.parse(req.body);
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(b.email.toLowerCase());
  if (exists) return reply.code(409).send({ error: 'That email is already registered.' });
  const r = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
    .run(b.name, b.email.toLowerCase(), bcrypt.hashSync(b.password, 10));
  const id = Number(r.lastInsertRowid);
  return { token: app.jwt.sign({ id }, { expiresIn: '14d' }), user: { id, name: b.name, email: b.email.toLowerCase() } };
});
app.post('/api/auth/login', async (req, reply) => {
  const b = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const u: any = db.prepare('SELECT * FROM users WHERE email = ?').get(b.email.toLowerCase());
  if (!u || !bcrypt.compareSync(b.password, u.password_hash)) return reply.code(401).send({ error: 'Wrong email or password.' });
  return { token: app.jwt.sign({ id: u.id }, { expiresIn: '14d' }), user: { id: u.id, name: u.name, email: u.email } };
});
app.get('/api/auth/me', { preHandler: auth }, async (req) => {
  const u: any = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  return u;
});

// ---------- chargers ----------
app.get('/api/chargers', async () => (db.prepare(CHARGER_SELECT + ' ORDER BY c.city, c.name').all() as any[]).map(mapCharger));

app.get('/api/chargers/:id', async (req, reply) => {
  const id = idParam((req.params as any).id);
  const row = db.prepare(CHARGER_SELECT + ' WHERE c.id = ?').get(id);
  if (!row) return reply.code(404).send({ error: 'Charger not found.' });
  const reports = db.prepare(`SELECT r.id, r.status, r.note, r.created_at AS createdAt, u.name AS userName
    FROM reports r JOIN users u ON u.id = r.user_id WHERE r.charger_id = ? ORDER BY r.id DESC LIMIT 10`).all(id);
  const reviews = db.prepare(`SELECT r.id, r.rating, r.comment, r.created_at AS createdAt, u.name AS userName
    FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.charger_id = ? ORDER BY r.id DESC LIMIT 20`).all(id);
  return { ...mapCharger(row), reports, reviews };
});

const chargerSchema = z.object({
  name: z.string().min(2).max(80), network: z.string().max(40).default('Independent'),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  address: z.string().max(160).default(''), city: z.string().min(1).max(60),
  connectors: z.array(z.string()).min(1), powerKw: z.number().min(0).max(400),
  type: z.enum(['fast_dc', 'slow_ac', 'swap']), vehicle: z.enum(['car', 'bike', 'both']),
  pricePerKwh: z.number().min(0).max(200), amenities: z.array(z.string()).default([]), isPrivate: z.boolean().default(false),
});
app.post('/api/chargers', { preHandler: auth }, async (req) => {
  const b = chargerSchema.parse(req.body);
  const r = db.prepare(`INSERT INTO chargers
    (name, network, lat, lng, address, city, connectors, power_kw, type, vehicle, price_per_kwh, amenities, is_private, owner_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.name, b.isPrivate ? 'Private' : b.network, b.lat, b.lng, b.address, b.city, JSON.stringify(b.connectors),
    b.powerKw, b.type, b.vehicle, b.pricePerKwh, JSON.stringify(b.amenities), b.isPrivate ? 1 : 0, req.user.id);
  return { id: Number(r.lastInsertRowid) };
});

app.post('/api/chargers/:id/reports', { preHandler: auth }, async (req, reply) => {
  const id = idParam((req.params as any).id);
  const b = z.object({ status: z.enum(['available', 'busy', 'broken']), note: z.string().max(200).default('') }).parse(req.body);
  if (!db.prepare('SELECT id FROM chargers WHERE id = ?').get(id)) return reply.code(404).send({ error: 'Charger not found.' });
  db.prepare('INSERT INTO reports (charger_id, user_id, status, note) VALUES (?,?,?,?)').run(id, req.user.id, b.status, b.note);
  db.prepare("UPDATE chargers SET status = ?, status_updated_at = datetime('now') WHERE id = ?").run(b.status, id);
  return { ok: true };
});

app.post('/api/chargers/:id/reviews', { preHandler: auth }, async (req, reply) => {
  const id = idParam((req.params as any).id);
  const b = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(400).default('') }).parse(req.body);
  if (!db.prepare('SELECT id FROM chargers WHERE id = ?').get(id)) return reply.code(404).send({ error: 'Charger not found.' });
  db.prepare('INSERT INTO reviews (charger_id, user_id, rating, comment) VALUES (?,?,?,?)').run(id, req.user.id, b.rating, b.comment);
  return { ok: true };
});

// ---------- bookings (private chargers) ----------
app.post('/api/chargers/:id/bookings', { preHandler: auth }, async (req, reply) => {
  const id = idParam((req.params as any).id);
  const b = z.object({ startTime: z.string().min(10), durationMin: z.number().int().min(15).max(720) }).parse(req.body);
  const c: any = db.prepare('SELECT * FROM chargers WHERE id = ?').get(id);
  if (!c) return reply.code(404).send({ error: 'Charger not found.' });
  if (!c.is_private) return reply.code(400).send({ error: 'Only private chargers can be booked. Public operators need a partnership for slot booking.' });
  if (c.owner_id === req.user.id) return reply.code(400).send({ error: 'You cannot book your own charger.' });
  const start = new Date(b.startTime).getTime();
  if (Number.isNaN(start) || start < Date.now()) return reply.code(400).send({ error: 'Choose a start time in the future.' });
  const end = start + b.durationMin * 60000;
  const confirmed = db.prepare("SELECT start_time, duration_min FROM bookings WHERE charger_id = ? AND status = 'confirmed'").all(id) as any[];
  const clash = confirmed.some((x) => {
    const s = new Date(x.start_time).getTime();
    return start < s + x.duration_min * 60000 && end > s;
  });
  if (clash) return reply.code(409).send({ error: 'That slot overlaps a confirmed booking. Pick another time.' });
  db.prepare('INSERT INTO bookings (charger_id, user_id, start_time, duration_min) VALUES (?,?,?,?)').run(id, req.user.id, new Date(start).toISOString(), b.durationMin);
  return { ok: true };
});

app.get('/api/bookings/mine', { preHandler: auth }, async (req) => {
  const base = `SELECT b.id, b.start_time AS startTime, b.duration_min AS durationMin, b.status, c.id AS chargerId, c.name AS chargerName, c.city, u.name AS driverName
    FROM bookings b JOIN chargers c ON c.id = b.charger_id JOIN users u ON u.id = b.user_id`;
  const made = db.prepare(base + ' WHERE b.user_id = ? ORDER BY b.start_time DESC').all(req.user.id);
  const incoming = db.prepare(base + ' WHERE c.owner_id = ? ORDER BY b.start_time DESC').all(req.user.id);
  return { made, incoming };
});

app.patch('/api/bookings/:id', { preHandler: auth }, async (req, reply) => {
  const id = idParam((req.params as any).id);
  const { status } = z.object({ status: z.enum(['confirmed', 'declined', 'cancelled']) }).parse(req.body);
  const b: any = db.prepare('SELECT b.*, c.owner_id FROM bookings b JOIN chargers c ON c.id = b.charger_id WHERE b.id = ?').get(id);
  if (!b) return reply.code(404).send({ error: 'Booking not found.' });
  const isOwner = b.owner_id === req.user.id, isDriver = b.user_id === req.user.id;
  if (status === 'cancelled' ? !(isDriver || isOwner) : !isOwner) return reply.code(403).send({ error: 'You cannot do that on this booking.' });
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  return { ok: true };
});

// ---------- roadside / services ----------
app.get('/api/services', async (req) => {
  const q = z.object({ kind: z.string().optional(), city: z.string().optional() }).parse(req.query);
  const rows = db.prepare('SELECT * FROM services ORDER BY city, name').all() as any[];
  return rows
    .filter((r) => (!q.kind || r.kind === q.kind) && (!q.city || r.city.toLowerCase().includes(q.city.toLowerCase())))
    .map((r) => ({ id: r.id, name: r.name, kind: r.kind, city: r.city, phone: r.phone, evCertified: !!r.ev_certified, notes: r.notes }));
});

// ---------- battery logs ----------
const logSchema = z.object({
  logDate: z.string().min(8), odometerKm: z.number().min(0), kwhAdded: z.number().min(0).max(300),
  socStart: z.number().min(0).max(100), socEnd: z.number().min(0).max(100),
  chargeKind: z.enum(['home_ac', 'public_ac', 'dc_fast', 'swap']), cost: z.number().min(0).default(0),
});
app.get('/api/battery-logs', { preHandler: auth }, async (req) =>
  db.prepare(`SELECT id, log_date AS logDate, odometer_km AS odometerKm, kwh_added AS kwhAdded, soc_start AS socStart,
    soc_end AS socEnd, charge_kind AS chargeKind, cost FROM battery_logs WHERE user_id = ? ORDER BY odometer_km ASC`).all(req.user.id));
app.post('/api/battery-logs', { preHandler: auth }, async (req) => {
  const b = logSchema.parse(req.body);
  db.prepare('INSERT INTO battery_logs (user_id, log_date, odometer_km, kwh_added, soc_start, soc_end, charge_kind, cost) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.user.id, b.logDate, b.odometerKm, b.kwhAdded, b.socStart, b.socEnd, b.chargeKind, b.cost);
  return { ok: true };
});
app.delete('/api/battery-logs/:id', { preHandler: auth }, async (req) => {
  db.prepare('DELETE FROM battery_logs WHERE id = ? AND user_id = ?').run(idParam((req.params as any).id), req.user.id);
  return { ok: true };
});

// ---------- trip planner ----------
const tripSchema = z.object({
  from: z.object({ lat: z.number(), lng: z.number() }), to: z.object({ lat: z.number(), lng: z.number() }),
  vehicleId: z.string(), startSocPct: z.number().min(5).max(100), reserveSocPct: z.number().min(0).max(40),
  speedKmh: z.number().min(30).max(140), acOn: z.boolean(), loadKg: z.number().min(0).max(600), tempC: z.number().min(-10).max(50),
});
app.post('/api/trip/plan', async (req, reply) => {
  const b = tripSchema.parse(req.body);
  const vehicle = vehicles.find((v) => v.id === b.vehicleId);
  if (!vehicle) return reply.code(400).send({ error: 'Unknown vehicle.' });
  let route;
  try { route = await fetchRoute(b.from, b.to); } catch (e: any) {
    return reply.code(502).send({ error: `Could not get a route: ${e.message ?? 'routing service unavailable'}. Check your internet connection.` });
  }
  const chargers = (db.prepare('SELECT * FROM chargers WHERE is_private = 0').all() as any[]).map((r): ChargerRow => ({
    id: r.id, name: r.name, network: r.network, lat: r.lat, lng: r.lng, city: r.city, powerKw: r.power_kw,
    type: r.type, vehicle: r.vehicle, status: effectiveStatus(r) as ChargerRow['status'], pricePerKwh: r.price_per_kwh,
  }));
  return planTrip(route, chargers, {
    from: b.from, to: b.to, vehicle, startSoc: b.startSocPct / 100, reserveSoc: b.reserveSocPct / 100,
    speedKmh: b.speedKmh, acOn: b.acOn, loadKg: b.loadKg, tempC: b.tempC,
  });
});

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
console.log(`EVRoute API running on http://localhost:${port}`);
