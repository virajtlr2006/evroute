import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base = 'w-full rounded-lg border border-line bg-white px-3 text-sm h-10';

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(base, className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(base, className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(base, 'h-auto py-2', className)} {...p} />
);
export const Label = ({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1 block text-sm font-medium', className)} {...p} />
);
