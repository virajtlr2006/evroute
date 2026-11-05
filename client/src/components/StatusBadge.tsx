import { Badge } from '@/components/ui/badge';
import type { Status } from '@/lib/types';

export const STATUS_META: Record<Status, { label: string; color: string; cls: string }> = {
  available: { label: 'Working', color: '#1b8a4b', cls: 'bg-ok/15 text-ok' },
  busy: { label: 'Busy', color: '#c77d00', cls: 'bg-warn/15 text-warn' },
  broken: { label: 'Out of order', color: '#c2362b', cls: 'bg-bad/15 text-bad' },
  unknown: { label: 'No recent report', color: '#6b7a75', cls: 'bg-black/5 text-ink/70' },
};

export const StatusBadge = ({ status }: { status: Status }) => (
  <Badge className={STATUS_META[status].cls}>{STATUS_META[status].label}</Badge>
);

export const TYPE_LABEL = { fast_dc: 'DC fast', slow_ac: 'Slow AC', swap: 'Battery swap' } as const;
