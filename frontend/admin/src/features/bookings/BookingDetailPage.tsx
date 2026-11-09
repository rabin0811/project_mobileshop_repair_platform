import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatMoney, REPAIR_STAGE_LABELS, STAGE_TRANSITIONS, type RepairStage } from '@mobileshop/shared';
import { Badge, Button, Card, EmptyState, Skeleton, StageTracker } from '@mobileshop/ui';
import { api, ApiClientError } from '../../lib/api';
import { formatDateTime } from '../../lib/admin';
import { StatusBadge } from './statusBadge';
import type { BookingDetail } from '../../lib/types';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ['admin', 'bookings', id],
    queryFn: () => api<BookingDetail>(`/admin/bookings/${id}`),
    enabled: !!id,
  });

  const advance = useMutation({
    mutationFn: (stage: RepairStage) =>
      api<BookingDetail>(`/admin/bookings/${id}/stage`, { method: 'POST', body: { stage } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const cancel = useMutation({
    mutationFn: () => api<{ cancelled: boolean }>(`/admin/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  if (!id) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <EmptyState title="Booking not found" />
      </motion.div>
    );
  }

  if (detail.isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </motion.div>
    );
  }

  if (detail.isError || !detail.data) {
    const notFound = detail.error instanceof ApiClientError && detail.error.status === 404;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <EmptyState
          title={notFound ? 'Booking not found' : 'Something went wrong'}
          description={
            notFound ? 'This booking may have been removed.' : 'Failed to load this booking. Please try again.'
          }
        />
      </motion.div>
    );
  }

  const booking = detail.data;

  function handleCancel() {
    if (window.confirm(`Cancel booking ${booking.bookingRef}? This cannot be undone.`)) {
      cancel.mutate();
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-ink">{booking.bookingRef}</h1>
        <StatusBadge status={booking.status} />
        {booking.isWalkIn && <Badge tone="info">Walk-in</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stage card */}
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-ink">Repair stage</h2>
          {booking.repairStage ? (
            <>
              <div className="mt-5">
                <StageTracker current={booking.repairStage} />
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Advance to</p>
                {STAGE_TRANSITIONS[booking.repairStage].length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {STAGE_TRANSITIONS[booking.repairStage].map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant="secondary"
                        loading={advance.isPending && advance.variables === next}
                        onClick={() => advance.mutate(next)}
                      >
                        {REPAIR_STAGE_LABELS[next]}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">This repair is complete.</p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-ink-muted">This booking has not been received at the workshop yet.</p>
              <Button size="sm" className="mt-4" loading={advance.isPending} onClick={() => advance.mutate('DEVICE_RECEIVED')}>
                Mark device received
              </Button>
            </div>
          )}
          {advance.isError && <p className="mt-3 text-sm text-danger">{advance.error?.message}</p>}
        </Card>

        {/* Details card */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Details</h2>
          <dl className="mt-3">
            <DetailRow label="Device" value={deviceName(booking)} />
            <DetailRow label="Customer" value={booking.customer?.user.name ?? booking.guestName ?? '—'} />
            <DetailRow label="Email" value={booking.customer?.user.email ?? '—'} />
            <DetailRow label="Phone" value={booking.customer?.user.phone ?? '—'} />
            <DetailRow label="Scheduled" value={scheduledLabel(booking)} />
            <DetailRow label="Problem" value={booking.problemDescription ?? '—'} />
            <DetailRow label="IMEI" value={booking.deviceImei ?? '—'} />
            <DetailRow label="Serial" value={booking.deviceSerial ?? '—'} />
            <DetailRow label="Est. cost" value={formatMoney(booking.estimatedCost)} />
          </dl>
          {booking.services.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Services</h3>
              <ul className="mt-2 space-y-2">
                {booking.services.map((s) => (
                  <li key={s.service.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink">{s.service.name}</span>
                    <span className="text-right">
                      <span className="text-sm tabular-nums text-ink">{formatMoney(s.quotedPrice)}</span>
                      {s.service.warrantyDays != null && (
                        <span className="ml-2 whitespace-nowrap text-xs text-ink-muted">
                          {s.service.warrantyDays}d warranty
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Timeline card */}
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-ink">Timeline</h2>
          {booking.events.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No events yet" />
            </div>
          ) : (
            <ol className="mt-4 space-y-5">
              {booking.events.map((ev, i) => (
                <li key={i} className="relative flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{ev.actorType}</Badge>
                      <span className="text-sm font-medium text-ink">
                        {ev.fromStatus ?? '—'} <span aria-hidden>→</span> {ev.toStatus ?? '—'}
                      </span>
                    </div>
                    {ev.note && <p className="mt-1 text-sm text-ink-muted">{ev.note}</p>}
                    <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(ev.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Actions card */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Actions</h2>
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <Button variant="danger" className="mt-4" loading={cancel.isPending} onClick={handleCancel}>
              Cancel booking
            </Button>
          )}
          {booking.status === 'CANCELLED' && <p className="mt-2 text-sm text-ink-muted">This booking is cancelled.</p>}
          {cancel.isError && <p className="mt-3 text-sm text-danger">{cancel.error?.message}</p>}
        </Card>
      </div>
    </motion.div>
  );
}

function deviceName(b: BookingDetail): string {
  const parts = [b.brand?.name, b.model?.name].filter((x): x is string => Boolean(x));
  return parts.length > 0 ? parts.join(' ') : '—';
}

function scheduledLabel(b: BookingDetail): string {
  return b.timeSlot ? `${formatDateTime(b.scheduledAt)} · ${b.timeSlot}` : formatDateTime(b.scheduledAt);
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-line py-2.5 first:border-t-0">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );
}
