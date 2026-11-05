import { Card, CardTitle } from '@/components/ui/card';

const tips = [
  ['Plan with real range, not the brochure', 'Highway speed, AC, passengers, hills and heat or cold can cut range by a quarter or more. Use the trip planner and keep a reserve.'],
  ['Charge to 80% on fast chargers', 'DC charging slows a lot above about 80%. Two shorter stops are usually faster than one long stop to 100%.'],
  ['Check before you detour', 'Look at the latest reports on a charger before you commit. Pick a backup charger within your reserve.'],
  ['Report what you find', 'A 10-second report saves the next driver a wasted trip. Mention queues, broken connectors and good cafes.'],
  ['Be kind at the charger', 'Move your vehicle when done, do not park in a charging bay without charging, and do not unplug someone else without asking.'],
  ['E-scooter and bike riders', 'Check connector type and swap-network compatibility before you ride out. Consider sharing a private home charger on your route.'],
];

export default function LearnPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Long-trip tips for EV drivers</h1>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tips.map(([t, d]) => <Card key={t}><CardTitle>{t}</CardTitle><p className="mt-1 text-sm text-ink/80">{d}</p></Card>)}
      </div>
    </div>
  );
}
