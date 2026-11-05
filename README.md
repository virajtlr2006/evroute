# EVRoute

A website that solves the information and coordination problems of long EV journeys (cars and e-bikes/scooters).

## Features
- Charger discovery across networks, with filters (vehicle, speed, connector, status, price) and a map
- Live status via driver reports (working / busy / out of order); reports expire after 24 h
- Reviews and amenities (food, restroom, wifi, shelter)
- Trip planner using real range (speed, AC, load, temperature) and charger reliability
- EV vs petrol cost calculator
- Private charger sharing with owner-approved bookings
- Battery-swap stations for e-scooters
- Roadside help directory (EV mechanics, towing, service centres)
- Battery log with efficiency and fast-charge-share insights

## Tech stack
Frontend: Vite, React 18, TypeScript, Tailwind CSS v4, shadcn-style components, Zustand, TanStack Query, React Router, Leaflet (OpenStreetMap)
Backend: Node 20+, Fastify 5, TypeScript (tsx), SQLite (better-sqlite3), Zod, JWT auth, bcryptjs
External: OSRM demo server (routing) and Nominatim (place search). Both need internet.

## Run it
Requires Node.js 20 or newer.

    npm install
    npm run dev

Open http://localhost:5173 (API runs on http://localhost:4000).
Demo login: demo@evroute.test / demo1234

## Other commands
    npm run typecheck     # type-check server and client
    npm run build         # production build of the client
    npm run reset-db      # delete the database; it re-seeds on next start

## Notes
- Seeded chargers and services are DEMO data, not verified stations. Replace via the Add a charger page or by importing real data (e.g. Open Charge Map) into the chargers table.
- Vehicle specs are approximate: edit server/src/vehicles.ts.
- Set JWT_SECRET (see server/.env.example) before deploying anywhere public.
- The OSRM demo server and Nominatim are for light demo use only; self-host or use a paid provider in production.
