import bcrypt from 'bcryptjs';
import { db } from './db';

// ILLUSTRATIVE DEMO DATA: names/locations approximate real highway corridors,
// but these are NOT verified stations. Replace with real data (e.g. Open Charge Map import).
type Seed = {
  name: string; network: string; lat: number; lng: number; city: string; address: string;
  connectors: string[]; powerKw: number; type: 'fast_dc' | 'slow_ac' | 'swap'; vehicle: 'car' | 'bike' | 'both';
  price: number; amenities: string[]; status: 'available' | 'busy' | 'broken' | 'unknown'; priv?: boolean;
};

const chargers: Seed[] = [
  { name: 'BKC Fast Hub', network: 'DemoNet', lat: 19.0669, lng: 72.8683, city: 'Mumbai', address: 'Bandra Kurla Complex', connectors: ['CCS2', 'CHAdeMO'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food', 'wifi'], status: 'available' },
  { name: 'Thane Highway Plaza', network: 'DemoNet', lat: 19.2183, lng: 72.9781, city: 'Thane', address: 'Eastern Express Highway', connectors: ['CCS2'], powerKw: 50, type: 'fast_dc', vehicle: 'car', price: 17, amenities: ['restroom', 'food'], status: 'busy' },
  { name: 'Palghar Dhaba Charger', network: 'HighwayVolt', lat: 19.6967, lng: 72.7699, city: 'Palghar', address: 'NH48', connectors: ['CCS2'], powerKw: 30, type: 'fast_dc', vehicle: 'car', price: 16, amenities: ['food', 'restroom'], status: 'available' },
  { name: 'Vapi Highway Charging Point', network: 'HighwayVolt', lat: 20.3715, lng: 72.904, city: 'Vapi', address: 'NH48 service road', connectors: ['CCS2'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food', 'shelter'], status: 'available' },
  { name: 'Valsad Slow AC Point', network: 'Independent', lat: 20.5992, lng: 72.9342, city: 'Valsad', address: 'Station Road', connectors: ['Type2'], powerKw: 7.4, type: 'slow_ac', vehicle: 'car', price: 10, amenities: ['food'], status: 'unknown' },
  { name: 'Navsari Fuel Stop EV', network: 'DemoNet', lat: 20.9467, lng: 72.952, city: 'Navsari', address: 'NH48 fuel station', connectors: ['CCS2'], powerKw: 50, type: 'fast_dc', vehicle: 'car', price: 17, amenities: ['restroom'], status: 'broken' },
  { name: 'Bardoli Town Charger', network: 'Independent', lat: 21.124, lng: 73.112, city: 'Bardoli', address: 'Main Road', connectors: ['CCS2', 'Type2'], powerKw: 30, type: 'fast_dc', vehicle: 'car', price: 16, amenities: ['food'], status: 'available' },
  { name: 'Surat Adajan Hub', network: 'DemoNet', lat: 21.1959, lng: 72.7933, city: 'Surat', address: 'Adajan', connectors: ['CCS2', 'CHAdeMO'], powerKw: 120, type: 'fast_dc', vehicle: 'car', price: 19, amenities: ['restroom', 'food', 'wifi', 'shelter'], status: 'available' },
  { name: 'Surat Scooter Charging Point', network: 'Independent', lat: 21.1802, lng: 72.8205, city: 'Surat', address: 'Ring Road', connectors: ['15A socket'], powerKw: 3.3, type: 'slow_ac', vehicle: 'bike', price: 8, amenities: ['shelter'], status: 'available' },
  { name: 'Surat Swap Station', network: 'SwapGo', lat: 21.1702, lng: 72.8311, city: 'Surat', address: 'Station Road', connectors: ['Battery swap'], powerKw: 0, type: 'swap', vehicle: 'bike', price: 12, amenities: [], status: 'available' },
  { name: 'Bharuch Toll Plaza Charger', network: 'HighwayVolt', lat: 21.705, lng: 72.998, city: 'Bharuch', address: 'NH48 toll plaza', connectors: ['CCS2'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food'], status: 'busy' },
  { name: 'Vadodara Expressway Hub', network: 'DemoNet', lat: 22.3072, lng: 73.1812, city: 'Vadodara', address: 'Expressway entry', connectors: ['CCS2', 'CHAdeMO'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food', 'wifi'], status: 'available' },
  { name: 'Vadodara Scooter Point', network: 'Independent', lat: 22.31, lng: 73.17, city: 'Vadodara', address: 'Alkapuri', connectors: ['15A socket'], powerKw: 3.3, type: 'slow_ac', vehicle: 'bike', price: 8, amenities: ['food'], status: 'unknown' },
  { name: 'Anand Highway Charger', network: 'HighwayVolt', lat: 22.556, lng: 72.952, city: 'Anand', address: 'NH48', connectors: ['CCS2'], powerKw: 30, type: 'fast_dc', vehicle: 'car', price: 16, amenities: ['restroom'], status: 'available' },
  { name: 'Nadiad Slow Charger', network: 'Independent', lat: 22.6916, lng: 72.8634, city: 'Nadiad', address: 'College Road', connectors: ['Type2'], powerKw: 7.4, type: 'slow_ac', vehicle: 'car', price: 9, amenities: ['food'], status: 'unknown' },
  { name: 'SG Highway Fast Hub', network: 'DemoNet', lat: 23.03, lng: 72.507, city: 'Ahmedabad', address: 'SG Highway', connectors: ['CCS2', 'CHAdeMO', 'Type2'], powerKw: 150, type: 'fast_dc', vehicle: 'car', price: 20, amenities: ['restroom', 'food', 'wifi', 'shelter'], status: 'available' },
  { name: 'Ahmedabad Swap Station', network: 'SwapGo', lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', address: 'Ashram Road', connectors: ['Battery swap'], powerKw: 0, type: 'swap', vehicle: 'bike', price: 12, amenities: [], status: 'available' },
  { name: 'Lonavala Expressway Charger', network: 'HighwayVolt', lat: 18.7546, lng: 73.4062, city: 'Lonavala', address: 'Mumbai-Pune Expressway food mall', connectors: ['CCS2'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food', 'shelter'], status: 'available' },
  { name: 'Hinjewadi Fast Hub', network: 'DemoNet', lat: 18.5913, lng: 73.7389, city: 'Pune', address: 'Hinjewadi Phase 1', connectors: ['CCS2'], powerKw: 60, type: 'fast_dc', vehicle: 'car', price: 18, amenities: ['restroom', 'food'], status: 'available' },
  { name: 'Farmhouse home charger', network: 'Private', lat: 21.1, lng: 73.13, city: 'Bardoli', address: 'Near Bardoli (exact address shared after booking)', connectors: ['Type2'], powerKw: 7.4, type: 'slow_ac', vehicle: 'car', price: 8, amenities: ['food', 'shelter'], status: 'available', priv: true },
  { name: 'Homestay charger', network: 'Private', lat: 20.62, lng: 72.92, city: 'Valsad', address: 'Near Valsad (exact address shared after booking)', connectors: ['Type2', '15A socket'], powerKw: 7.4, type: 'slow_ac', vehicle: 'both', price: 8, amenities: ['restroom', 'shelter'], status: 'available', priv: true },
];

const services = [
  { name: 'Mumbai EV Service Center', kind: 'service_center', city: 'Mumbai', phone: '+91 00000 00001', cert: 1, notes: 'Demo entry: replace with a verified listing' },
  { name: 'Vapi Highway Towing', kind: 'towing', city: 'Vapi', phone: '+91 00000 00002', cert: 0, notes: 'Flatbed available (demo entry)' },
  { name: 'Bardoli EV Mechanic', kind: 'mechanic', city: 'Bardoli', phone: '+91 00000 00003', cert: 1, notes: 'Two-wheelers and cars (demo entry)' },
  { name: 'Surat Tow & EV Support', kind: 'towing', city: 'Surat', phone: '+91 00000 00004', cert: 1, notes: 'Flatbed with portable charger (demo entry)' },
  { name: 'Vadodara EV Garage', kind: 'mechanic', city: 'Vadodara', phone: '+91 00000 00005', cert: 1, notes: 'Battery diagnostics (demo entry)' },
  { name: 'Ahmedabad EV Service Hub', kind: 'service_center', city: 'Ahmedabad', phone: '+91 00000 00006', cert: 1, notes: 'Multi-brand (demo entry)' },
];

export function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM chargers').get() as { n: number }).n;
  if (count > 0) return;

  const demo = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
    .run('Demo Driver', 'demo@evroute.test', bcrypt.hashSync('demo1234', 10));
  const demoId = Number(demo.lastInsertRowid);

  const ins = db.prepare(`INSERT INTO chargers
    (name, network, lat, lng, address, city, connectors, power_kw, type, vehicle, price_per_kwh, amenities, status, status_updated_at, is_private, owner_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?,?)`);
  for (const c of chargers) {
    ins.run(c.name, c.network, c.lat, c.lng, c.address, c.city, JSON.stringify(c.connectors), c.powerKw, c.type, c.vehicle,
      c.price, JSON.stringify(c.amenities), c.status, c.priv ? 1 : 0, c.priv ? demoId : null);
  }

  const insS = db.prepare('INSERT INTO services (name, kind, city, phone, ev_certified, notes) VALUES (?,?,?,?,?,?)');
  for (const s of services) insS.run(s.name, s.kind, s.city, s.phone, s.cert, s.notes);

  db.prepare('INSERT INTO reviews (charger_id, user_id, rating, comment) VALUES (?,?,?,?)')
    .run(8, demoId, 5, 'Fast and clean, good cafe next door.');
  db.prepare('INSERT INTO reports (charger_id, user_id, status, note) VALUES (?,?,?,?)')
    .run(6, demoId, 'broken', 'Connector would not lock.');
  console.log('Seeded demo data. Demo login: demo@evroute.test / demo1234');
}
