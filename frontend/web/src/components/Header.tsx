import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button, Container, cn } from '@mobileshop/ui';
import { SHOP_NAME } from '@mobileshop/shared';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Track', to: '/track' },
  { label: 'Branches', to: '/branches' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-ink transition-colors hover:text-accent"
          onClick={() => setOpen(false)}
        >
          {SHOP_NAME}
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-ink-muted hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button onClick={() => navigate('/book')}>Book a repair</Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-line bg-canvas md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-ink-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Button
              className="mt-2"
              onClick={() => {
                setOpen(false);
                navigate('/book');
              }}
            >
              Book a repair
            </Button>
          </Container>
        </div>
      )}
    </header>
  );
}
