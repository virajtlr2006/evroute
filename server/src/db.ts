import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.resolve(here, '../data');
fs.mkdirSync(dataDir, { recursive: true });
export const dbFile = path.join(dataDir, 'evroute.db');

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chargers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'Independent',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  connectors TEXT NOT NULL DEFAULT '[]',
  power_kw REAL NOT NULL DEFAULT 7.4,
  type TEXT NOT NULL CHECK (type IN ('fast_dc','slow_ac','swap')),
  vehicle TEXT NOT NULL CHECK (vehicle IN ('car','bike','both')),
  price_per_kwh REAL NOT NULL DEFAULT 0,
  amenities TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('available','busy','broken','unknown')),
  status_updated_at TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  owner_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('available','busy','broken')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  start_time TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','declined','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mechanic','towing','service_center')),
  city TEXT NOT NULL,
  lat REAL,
  lng REAL,
  phone TEXT NOT NULL DEFAULT '',
  ev_certified INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS battery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  log_date TEXT NOT NULL,
  odometer_km REAL NOT NULL,
  kwh_added REAL NOT NULL,
  soc_start REAL NOT NULL,
  soc_end REAL NOT NULL,
  charge_kind TEXT NOT NULL CHECK (charge_kind IN ('home_ac','public_ac','dc_fast','swap')),
  cost REAL NOT NULL DEFAULT 0
);
`);
