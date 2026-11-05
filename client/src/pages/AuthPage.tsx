import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/field';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const m = useMutation({
    mutationFn: () => api<{ token: string; user: { id: number; name: string; email: string } }>(`/auth/${mode}`, { body: form }),
    onSuccess: (d) => { login(d.token, d.user); nav('/'); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  return (
    <Card className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <div><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        )}
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        {m.error && <p className="text-sm text-bad">{(m.error as Error).message}</p>}
        <Button type="submit" className="w-full" disabled={m.isPending}>{mode === 'login' ? 'Log in' : 'Create account'}</Button>
      </form>
      <button className="mt-4 text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
      <p className="mt-4 rounded-lg bg-paper p-3 text-xs">Demo account: demo@evroute.test / demo1234</p>
    </Card>
  );
}
