export type Status = 'available' | 'busy' | 'broken' | 'unknown';
export type ChargerType = 'fast_dc' | 'slow_ac' | 'swap';

export interface Charger {
  id: number; name: string; network: string; lat: number; lng: number; address: string; city: string;
  connectors: string[]; powerKw: number; type: ChargerType; vehicle: 'car' | 'bike' | 'both';
  pricePerKwh: number; amenities: string[]; status: Status; statusUpdatedAt: string | null;
  isPrivate: boolean; ownerId: number | null; avgRating: number | null; reviewCount: number;
}
export interface ChargerDetail extends Charger {
  reports: { id: number; status: Status; note: string; createdAt: string; userName: string }[];
  reviews: { id: number; rating: number; comment: string; createdAt: string; userName: string }[];
}
export interface Vehicle {
  id: string; name: string; kind: 'car' | 'bike'; batteryKwh: number; ratedKm: number;
  maxDcKw: number; maxAcKw: number; swappable: boolean;
}
export interface TripStop {
  charger: Charger; alongKm: number; detourKm: number; legKm: number;
  arriveSoc: number; chargeToSoc: number; chargeMinutes: number;
}
export interface TripResult {
  ok: boolean; reason: string; totalKm: number; ratedKm: number; realRangeKm: number;
  factors: { speed: number; ac: number; load: number; temp: number; total: number };
  stops: TripStop[]; warnings: string[]; driveMinutes: number; chargeMinutes: number; totalMinutes: number;
  arrivalSoc: number | null; line: [number, number][];
}
export interface Service { id: number; name: string; kind: string; city: string; phone: string; evCertified: boolean; notes: string }
export interface BatteryLog {
  id: number; logDate: string; odometerKm: number; kwhAdded: number; socStart: number; socEnd: number;
  chargeKind: 'home_ac' | 'public_ac' | 'dc_fast' | 'swap'; cost: number;
}
export interface Booking {
  id: number; startTime: string; durationMin: number; status: string; chargerId: number; chargerName: string; city: string; driverName: string;
}
