import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Badge, Button, Card, Container, EmptyState, Input, Skeleton, StageTracker } from '@mobileshop/ui';
import { ApiClientError, api } from '../../lib/api';
import { REPAIR_STAGE_LABELS, formatMoney } from '@mobileshop/shared';
import type { TrackResponse } from '../../lib/types';
import { MapPin, PackageSearch, Search } from 'lucide-react';

const STATUS_TONES: Record<string, 'warning' | 'accent' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  CANCELLED: 'danger',
};

const EVENT_LABELS: Record<string, string> = {
  PENDING: 'Booking submitted',
  CONFIRMED: 'Booking confirmed',
  CANCELLED: 'Booking cancelled',
  ...REPAIR_STAGE_LABELS,
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TrackPage() {
  const { ref: refParam } = useParams<{ ref?: string }>();
  const [refInput, setRefInput] = useState(refParam ?? '');

  const trackMutation = useMutation({
    mutationFn: (ref: string) => api<TrackResponse>(`/bookings/track/${encodeURIComponent(ref)}`),
  });
  const { mutate, data: result, isPending, error, reset } = trackMutation;

  useEffect(() => {
    if (refParam) {
      setRefInput(refParam);
      reset();
      mutate(refParam);
    }
  }, [refParam, reset, mutate]);

  const errorMessage =
    error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : null;

  function handleTrack() {
    const ref = refInput.trim();
    if (!ref) return;
    reset();
    mutate(ref);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Track your repair</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Where is my phone?</h1>

          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack();
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  id="booking-ref"
                  label="Booking reference"
                  placeholder="e.g. MF-20260802-AB12C"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                />
              </div>
              <Button type="submit" loading={isPending} className="shrink-0">
                <Search className="h-4 w-4" aria-hidden />
                Track
              </Button>
            </div>
          </form>

          {isPending && (
            <div className="mt-10 flex flex-col gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}

          {errorMessage && !isPending && (
            <div className="mt-10">
              <Card>
                <p className="text-sm font-semibold text-danger">We couldn't find that booking</p>
                <p className="mt-1 text-sm text-ink-muted">{errorMessage}</p>
              </Card>
            </div>
          )}

          {result && !isPending && (
            <div className="mt-10 flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Booking reference</p>
                  <p className="font-mono text-xl font-semibold tabular-nums text-ink">{result.bookingRef}</p>
                </div>
                <Badge tone={STATUS_TONES[result.status] ?? 'neutral'} dot>
                  {result.status}
                </Badge>
              </div>

              {result.repairStage && (
                <Card>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Repair progress</p>
                  <div className="mt-6">
                    <StageTracker current={result.repairStage} />
                  </div>
                </Card>
              )}

              {result.events.length > 0 && (
                <Card>
                  <p className="text-sm font-semibold text-ink">Updates</p>
                  <ol className="mt-4 space-y-4">
                    {result.events.map((ev) => (
                      <li key={ev.id} className="flex gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {EVENT_LABELS[ev.toStatus ?? ''] ?? ev.toStatus ?? 'Updated'}
                          </p>
                          {ev.note && <p className="mt-0.5 text-xs text-ink-muted">{ev.note}</p>}
                          <p className="mt-0.5 text-xs text-ink-muted">{formatWhen(ev.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}

              <Card>
                <p className="text-sm font-semibold text-ink">Services</p>
                <div className="mt-4 flex flex-col gap-2">
                  {result.services.map((s) => (
                    <div key={s.service.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink">{s.service.name}</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(s.quotedPrice)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm font-semibold text-ink">Estimated total</span>
                    <span className="text-lg font-bold tabular-nums text-ink">{formatMoney(result.estimatedCost)}</span>
                  </div>
                </div>
              </Card>

              {(result.branch || result.problemDescription) && (
                <Card>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <dt className="flex w-24 shrink-0 items-center gap-2 text-ink-muted">
                        <MapPin className="h-4 w-4" aria-hidden /> Branch
                      </dt>
                      <dd className="font-medium text-ink">{result.branch.name}</dd>
                    </div>
                    {result.problemDescription && (
                      <div className="flex items-start gap-3">
                        <dt className="w-24 shrink-0 text-ink-muted">Problem</dt>
                        <dd className="font-medium text-ink">{result.problemDescription}</dd>
                      </div>
                    )}
                  </dl>
                </Card>
              )}
            </div>
          )}

          {!result && !isPending && !errorMessage && (
            <div className="mt-10">
              <EmptyState
                icon={PackageSearch}
                title="Enter your booking reference"
                description="We'll show the live status of your repair. You'll find the reference on your booking confirmation."
              />
            </div>
          )}
        </div>
      </Container>
    </motion.div>
  );
}
