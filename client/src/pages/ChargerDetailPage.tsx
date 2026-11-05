import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { ChargerDetail, Status } from '@/lib/types';
import { StatusBadge, TYPE_LABEL } from '@/components/StatusBadge';
import { ChargerMap } from '@/components/ChargerMap';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { timeAgo } from '@/lib/utils';

export default function ChargerDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const { data: c, isLoading, error } = useQuery({ queryKey: ['charger', id], queryFn: () => api<ChargerDetail>(`/chargers/${id}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['charger', id] }); qc.invalidateQueries({ queryKey: ['chargers'] }); };

  const [note, setNote] = useState('');
  const report = useMutation({ mutationFn: (status: Status) => api(`/chargers/${id}/reports`, { body: { status, note } }), onSuccess: () => { setNote(''); refresh(); } });

  const [rv, setRv] = useState({ rating: 5, comment: '' });
  const review = useMutation({ mutationFn: () => api(`/chargers/${id}/reviews`, { body: rv }), onSuccess: () => { setRv({ rating: 5, comment: '' }); refresh(); } });

  const [bk, setBk] = useState({ startTime: '', durationMin: 60 });
  const book = useMutation({ mutationFn: () => api(`/chargers/${id}/bookings`, { body: { startTime: new Date(bk.startTime).toISOString(), durationMin: Number(bk.durationMin) } }) });

  if (isLoading) return <p>Loading...</p>;
  if (error || !c) return <p className="text-bad">{(error as Error)?.message ?? 'Not found'}</p>;
  const loginHint = <p className="text-sm">Please <Link className="underline" to="/login">log in</Link> to do this.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <p className="text-ink/70">{c.address}{c.address ? ', ' : ''}{c.city} - {c.network}</p>
            </div>
            <div className="text-right">
              <StatusBadge status={c.status} />
              <p className="mt-1 text-xs text-ink/60">Updated {timeAgo(c.statusUpdatedAt)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>{TYPE_LABEL[c.type]}{c.powerKw ? ` ${c.powerKw} kW` : ''}</Badge>
            <Badge>Rs {c.pricePerKwh}/kWh</Badge>
            <Badge>For {c.vehicle === 'both' ? 'cars and bikes' : c.vehicle === 'car' ? 'cars' : 'bikes'}</Badge>
            {c.connectors.map((x) => <Badge key={x}>{x}</Badge>)}
            {c.amenities.map((x) => <Badge key={x} className="bg-road/10 text-road">{x}</Badge>)}
          </div>
        </Card>

        <Card>
          <CardTitle>Is it working right now?</CardTitle>
          <p className="mb-3 text-sm text-ink/70">Your report helps the next driver. Reports older than 24 hours are shown as "no recent report".</p>
          {user ? (
            <div className="space-y-2">
              <Input placeholder="Optional note, e.g. 2 cars waiting" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => report.mutate('available')} disabled={report.isPending}>Working</Button>
                <Button variant="accent" onClick={() => report.mutate('busy')} disabled={report.isPending}>Busy</Button>
                <Button variant="danger" onClick={() => report.mutate('broken')} disabled={report.isPending}>Out of order</Button>
              </div>
              {report.error && <p className="text-sm text-bad">{(report.error as Error).message}</p>}
            </div>
          ) : loginHint}
          <ul className="mt-4 space-y-1 text-sm">
            {c.reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} /> <span>{r.userName}, {timeAgo(r.createdAt)}</span>{r.note && <span className="text-ink/70">- {r.note}</span>}
              </li>
            ))}
            {!c.reports.length && <li className="text-ink/70">No reports yet. Be the first.</li>}
          </ul>
        </Card>

        <Card>
          <CardTitle>Reviews {c.avgRating ? `(${c.avgRating}/5 from ${c.reviewCount})` : ''}</CardTitle>
          {user ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <Select value={rv.rating} onChange={(e) => setRv({ ...rv, rating: Number(e.target.value) })} aria-label="Rating">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
              </Select>
              <Input placeholder="Speed, cleanliness, food nearby..." value={rv.comment} onChange={(e) => setRv({ ...rv, comment: e.target.value })} maxLength={400} />
              <Button onClick={() => review.mutate()} disabled={review.isPending}>Post review</Button>
            </div>
          ) : <div className="mb-3">{loginHint}</div>}
          <ul className="space-y-2">
            {c.reviews.map((r) => (
              <li key={r.id} className="rounded-lg bg-paper p-3 text-sm">
                <p className="font-semibold">{r.rating}/5 <span className="font-normal text-ink/70">by {r.userName}, {timeAgo(r.createdAt)}</span></p>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
            {!c.reviews.length && <li className="text-sm text-ink/70">No reviews yet.</li>}
          </ul>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="h-64 overflow-hidden rounded-xl border border-line"><ChargerMap chargers={[c]} selectedId={c.id} className="h-full w-full" /></div>
        {c.isPrivate && (
          <Card>
            <CardTitle>Book this private charger</CardTitle>
            <p className="mb-3 text-sm text-ink/70">The owner confirms each request. The exact address is shared by the owner after confirmation.</p>
            {user ? (
              <div className="space-y-2">
                <div><Label htmlFor="st">Start time</Label><Input id="st" type="datetime-local" value={bk.startTime} onChange={(e) => setBk({ ...bk, startTime: e.target.value })} /></div>
                <div><Label htmlFor="du">Duration</Label>
                  <Select id="du" value={bk.durationMin} onChange={(e) => setBk({ ...bk, durationMin: Number(e.target.value) })}>
                    {[30, 60, 120, 180, 240, 480].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} h` : `${m} min`}</option>)}
                  </Select></div>
                <Button className="w-full" disabled={!bk.startTime || book.isPending} onClick={() => book.mutate()}>Request booking</Button>
                {book.isSuccess && <p className="text-sm text-ok">Request sent. Track it under <Link className="underline" to="/bookings">Bookings</Link>.</p>}
                {book.error && <p className="text-sm text-bad">{(book.error as Error).message}</p>}
              </div>
            ) : loginHint}
          </Card>
        )}
      </div>
    </div>
  );
}
