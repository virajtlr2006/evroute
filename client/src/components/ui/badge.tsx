import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Badge = ({ className, ...p }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold', className)} {...p} />
);
