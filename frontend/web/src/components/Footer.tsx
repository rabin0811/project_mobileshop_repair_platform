import { Link } from 'react-router-dom';
import { Container } from '@mobileshop/ui';
import { APP_NAME, SHOP_NAME } from '@mobileshop/shared';

const QUICK_LINKS = [
  { label: 'Services', to: '/services' },
  { label: 'Book a repair', to: '/book' },
  { label: 'Track your repair', to: '/track' },
  { label: 'Branches', to: '/branches' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="text-base font-semibold text-ink">{SHOP_NAME}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {APP_NAME} — professional phone repairs with a warranty on every job.
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Footer">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="py-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} {SHOP_NAME}. All rights reserved.
        </Container>
      </div>
    </footer>
  );
}
