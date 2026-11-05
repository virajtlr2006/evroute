import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Chargers' },
  { to: '/trip', label: 'Trip planner' },
  { to: '/cost', label: 'Cost' },
  { to: '/services', label: 'Roadside help' },
  { to: '/battery', label: 'Battery log' },
  { to: '/learn', label: 'Learn' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-road text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            EV<span className="text-signal">Route</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}
                className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm font-medium hover:bg-white/10', isActive && 'bg-white/15')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <Button size="sm" variant="accent" onClick={() => nav('/add')}>Add a charger</Button>
            {user ? (
              <>
                <Link to="/bookings" className="rounded-md px-3 py-1.5 hover:bg-white/10">Bookings</Link>
                <span className="hidden sm:inline">{user.name}</span>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => { logout(); nav('/'); }}>Log out</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10" onClick={() => nav('/login')}>Log in</Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line py-4 text-center text-xs text-ink/60">
        Map data &copy; OpenStreetMap contributors. Routing by OSRM demo server. Seeded chargers are demo data, not verified stations.
      </footer>
    </div>
  );
}
