import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, Star, Wallet, Wrench } from 'lucide-react';
import { formatMoney } from '@mobileshop/shared';
import { Card, EmptyState, Skeleton, StatTile } from '@mobileshop/ui';
import { api } from '../../lib/api';
import { fetchBookings, formatDateTime } from '../../lib/admin';
import { StatusBadge } from '../bookings/statusBadge';
import type { AnalyticsOverview, TopService } from '../../lib/types';

export function DashboardPage() {
  const analytics = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api<AnalyticsOverview>('/admin/analytics/overview'),
  });
  const recent = useQuery({
    queryKey: ['admin', 'bookings', 'recent'],
    queryFn: () => fetchBookings({ page: 1, pageSize: 5 }),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">Store overview and live repair activity</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {analytics.isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[108px] rounded-lg" />
            ))}
          </>
        ) : (
          <>
            <StatTile label="Bookings today" value={String(analytics.data?.bookingsToday ?? 0)} icon={CalendarDays} />
            <StatTile label="Active repairs" value={String(analytics.data?.activeRepairs ?? 0)} icon={Wrench} />
            <StatTile label="Revenue this month" value={formatMoney(analytics.data?.monthRevenue ?? 0)} icon={Wallet} />
            <StatTile label="Pending reviews" value={String(analytics.data?.pendingReviews ?? 0)} icon={Star} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-base font-semibold text-ink">Top services</h2>
          <p className="mt-0.5 text-sm text-ink-muted">Most-booked repairs this month</p>
          <div className="mt-4 h-[280px]">
            {analytics.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics.data && analytics.data.topServices.length > 0 ? (
              <TopServicesBars services={analytics.data.topServices} />
            ) : (
              <EmptyState title="No services data yet" description="Top services will appear once bookings come in." />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent bookings</h2>
            <Link to="/bookings" className="text-sm font-medium text-accent transition-colors hover:text-accent-hover">
              View all
            </Link>
          </div>
          {recent.isLoading ? (
            <div className="mt-4 space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.data && recent.data.items.length > 0 ? (
            <ul className="mt-2 divide-y divide-line">
              {recent.data.items.map((b) => (
                <li key={b.id}>
                  <Link to={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-ink">{b.bookingRef}</p>
                      <p className="truncate text-xs text-ink-muted">{formatDateTime(b.scheduledAt)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState title="No bookings yet" description="Bookings will appear here once customers make a repair." />
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}

/** Top-services bar chart. Token-styled (no raw hex) — recharts is declared in package.json but not installed in this workspace, so bars are rendered with layout primitives. */
function TopServicesBars({ services }: { services: TopService[] }) {
  const max = Math.max(...services.map((s) => s.count), 1);
  return (
    <div
      className="flex h-full items-end gap-4"
      role="img"
      aria-label={`Top services: ${services.map((s) => `${s.name} (${s.count})`).join(', ')}`}
    >
      {services.map((s) => (
        <div key={s.serviceId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-sm font-semibold tabular-nums text-ink">{s.count}</span>
          <div
            className="w-full rounded-t-md bg-accent"
            style={{ height: `${Math.max(4, Math.round((s.count / max) * 100))}%` }}
            title={`${s.name}: ${s.count}`}
          />
          <span className="w-full truncate text-center text-xs text-ink-muted" title={s.name}>
            {s.name}
          </span>
        </div>
      ))}
    </div>
  );
}
