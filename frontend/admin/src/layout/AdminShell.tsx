import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  Star,
  Store,
  TicketPercent,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { APP_NAME } from '@mobileshop/shared';
import { Button, cn } from '@mobileshop/ui';
import { useAuth } from '../lib/auth';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/technicians', label: 'Technicians', icon: UserCog },
  { to: '/invoices', label: 'Invoices', icon: ReceiptText },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/branches', label: 'Branches', icon: Store },
  { to: '/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/cms', label: 'CMS', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
];

export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Off-canvas drawer (below lg) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface shadow-popover">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              <span className="text-sm font-bold text-ink">{APP_NAME}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="shrink-0 border-t border-line p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop icon rail (lg+) */}
      <aside className="hidden w-16 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-line">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
            {APP_NAME.split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)}
          </span>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          <button
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur lg:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="text-sm text-ink-muted">Main branch</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-medium text-ink">{user?.name ?? 'Admin'}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
