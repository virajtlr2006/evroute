// Approximate specs for demo purposes. Edit freely - verify against your own vehicle's manual.
export interface Vehicle {
  id: string;
  name: string;
  kind: 'car' | 'bike';
  batteryKwh: number;
  ratedKm: number; // certified range, optimistic
  maxDcKw: number; // peak DC charging power (cars)
  maxAcKw: number; // AC charging power
  swappable: boolean; // can use battery-swap stations
}

export const vehicles: Vehicle[] = [
  { id: 'nexon-ev-lr', name: 'Tata Nexon EV (Long Range)', kind: 'car', batteryKwh: 40.5, ratedKm: 465, maxDcKw: 50, maxAcKw: 7.2, swappable: false },
  { id: 'tiago-ev', name: 'Tata Tiago EV (Long Range)', kind: 'car', batteryKwh: 24, ratedKm: 315, maxDcKw: 25, maxAcKw: 7.2, swappable: false },
  { id: 'xuv400', name: 'Mahindra XUV400 (EL Pro)', kind: 'car', batteryKwh: 39.4, ratedKm: 456, maxDcKw: 50, maxAcKw: 7.2, swappable: false },
  { id: 'zs-ev', name: 'MG ZS EV', kind: 'car', batteryKwh: 50.3, ratedKm: 461, maxDcKw: 76, maxAcKw: 7.4, swappable: false },
  { id: 'generic-car', name: 'Generic EV car (40 kWh)', kind: 'car', batteryKwh: 40, ratedKm: 400, maxDcKw: 50, maxAcKw: 7.2, swappable: false },
  { id: 'ola-s1-pro', name: 'Ola S1 Pro (e-scooter)', kind: 'bike', batteryKwh: 4, ratedKm: 195, maxDcKw: 0, maxAcKw: 0.75, swappable: false },
  { id: 'ather-450x', name: 'Ather 450X (e-scooter)', kind: 'bike', batteryKwh: 3.7, ratedKm: 146, maxDcKw: 0, maxAcKw: 0.9, swappable: false },
  { id: 'swap-scooter', name: 'Swappable e-scooter', kind: 'bike', batteryKwh: 1.5, ratedKm: 80, maxDcKw: 0, maxAcKw: 0.6, swappable: true },
];
