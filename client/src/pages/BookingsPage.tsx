import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BookingsPage() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['bookings'], enabled: !!user, queryFn: () => api<{ made: Booking[]; incoming: Booking[] }>('/bookings/mine') });
  const act = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api(`/bookings/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
  if (!user) return <Card>Please <Link className="underline" to="/login">log in</Link> to see your bookings.</Card>;

  const row = (b: Booking, incoming: boolean) => (
    <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold"><Link className="underline" to={`/chargers/${b.chargerId}`}>{b.chargerName}</Link>, {b.city}</p>
        <p className="text-sm text-ink/70">{new Date(b.startTime).toLocaleString()} for {b.durationMin} min{incoming ? ` - requested by ${b.driverName}` : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge>{b.status}</Badge>
        {incoming && b.status === 'requested' && (<>
          <Button size="sm" onClick={() => act.mutate({ id: b.id, status: 'confirmed' })}>Confirm</Button>
          <Button size="sm" variant="outline" onClick={() => act.mutate({ id: b.id, status: 'declined' })}>Decline</Button>
        </>)}
        {(b.status === 'requested' || b.status === 'confirmed') && <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: b.id, status: 'cancelled' })}>Cancel</Button>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bookings</h1>
      {act.error && <p className="text-bad">{(act.error as Error).message}</p>}
      <section className="space-y-2"><CardTitle>Requests for your chargers</CardTitle>
        {data?.incoming.map((b) => row(b, true))}{!data?.incoming.length && <p className="text-sm text-ink/70">None yet. Share a private charger from "Add a charger".</p>}</section>
      <section className="space-y-2"><CardTitle>Your bookings</CardTitle>
        {data?.made.map((b) => row(b, false))}{!data?.made.length && <p className="text-sm text-ink/70">You have not booked a private charger yet.</p>}</section>
    </div>
  );
}
