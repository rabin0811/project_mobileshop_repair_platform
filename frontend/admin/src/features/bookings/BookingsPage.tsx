import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BOOKING_STATUSES, REPAIR_STAGE_LABELS, formatMoney } from '@mobileshop/shared';
import { Button, Card, EmptyState, Input, Select, Skeleton } from '@mobileshop/ui';
import { fetchBookings, formatDateTime } from '../../lib/admin';
import { StatusBadge } from './statusBadge';
import type { BookingRow } from '../../lib/types';

const PAGE_SIZE = 15;

function deviceLabel(b: BookingRow): string {
  if (b.brand && b.model) return `${b.brand.name} ${b.model.name}`;
  return b.brand?.name ?? b.model?.name ?? '—';
}

export function BookingsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'bookings', { page, status, search: debouncedSearch }],
    queryFn: () =>
      fetchBookings({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const rows = data?.items ?? [];
  const meta = data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Bookings</h1>
        <p className="mt-1 text-sm text-ink-muted">Search, filter, and manage customer repairs</p>
      </div>

      {/* Filter bar */}
      <Card className="mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="md:w-44"
        >
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Booking ref, name, email"
          aria-label="Search bookings"
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2 md:ml-auto">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <span className="whitespace-nowrap text-sm text-ink-muted">
            Page {meta?.page ?? 1} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </Card>

      {isError ? (
        <EmptyState title="Failed to load bookings" description="Please try again in a moment." />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Reference', 'Device', 'Customer', 'Scheduled', 'Status', 'Stage', 'Est. cost'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t border-line">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <EmptyState title="No bookings found" description="Try adjusting the search or filters." />
                    </td>
                  </tr>
                ) : (
                  rows.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      className="cursor-pointer border-t border-line transition-colors hover:bg-surface"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/bookings/${b.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                        >
                          {b.bookingRef}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{deviceLabel(b)}</td>
                      <td className="px-4 py-3 text-sm text-ink">{b.customer?.user.name ?? b.guestName ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{formatDateTime(b.scheduledAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">
                        {b.repairStage ? REPAIR_STAGE_LABELS[b.repairStage] : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-ink">{formatMoney(b.estimatedCost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <Card className="p-0 md:hidden">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No bookings found" description="Try adjusting the search or filters." />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((b) => (
                  <li key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="cursor-pointer px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-medium text-ink">{b.bookingRef}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink">{deviceLabel(b)}</p>
                    <p className="text-xs text-ink-muted">
                      {b.customer?.user.name ?? b.guestName ?? '—'} · {formatDateTime(b.scheduledAt)} ·{' '}
                      {formatMoney(b.estimatedCost)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </motion.div>
  );
}
