import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Badge,
  BookingStepper,
  Button,
  Card,
  Container,
  Input,
  Select,
  Skeleton,
  Textarea,
  cn,
} from '@mobileshop/ui';
import { emailSchema, formatMoney } from '@mobileshop/shared';
import { ApiClientError, api } from '../../lib/api';
import type { Booking, Branch, Brand, DeviceModel, EstimateResponse, Service } from '../../lib/types';
import { CheckCircle2, ChevronRight } from 'lucide-react';

const STEPS: string[] = ['Model', 'Service', 'Details', 'Confirm'];

const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 9 + i;
  return `${String(hour).padStart(2, '0')}:00`;
});

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDay(isoDate: string): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

type CreateBookingPayload = {
  branchId: string;
  brandId: string;
  modelId: string;
  serviceIds: string[];
  scheduledAt: string;
  timeSlot: string;
  problemDescription?: string;
  customer?: { name: string; email: string; phone?: string };
};

export default function BookingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [booking, setBooking] = useState<Booking | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: () => api<Brand[]>('/brands') });
  const modelsQuery = useQuery({
    queryKey: ['brands', brandId, 'models'],
    queryFn: () => api<DeviceModel[]>(`/brands/${brandId}/models`),
    enabled: !!brandId,
  });
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: () => api<Branch[]>('/branches') });

  useEffect(() => {
    if (!branchId && branchesQuery.data && branchesQuery.data.length > 0) {
      setBranchId(branchesQuery.data[0].id);
    }
  }, [branchId, branchesQuery.data]);

  const estimateMutation = useMutation({
    mutationFn: (input: { brandId: string; modelId: string; serviceIds: string[] }) =>
      api<EstimateResponse>('/repair/estimate', { method: 'POST', body: input }),
  });
  const {
    data: estimate,
    isPending: estimatePending,
    error: estimateError,
    reset: resetEstimate,
    mutate: mutateEstimate,
  } = estimateMutation;

  useEffect(() => {
    if (step !== 1) return;
    if (!brandId || !modelId || serviceIds.length === 0) {
      resetEstimate();
      return;
    }
    resetEstimate();
    mutateEstimate({ brandId, modelId, serviceIds });
  }, [step, brandId, modelId, serviceIds, resetEstimate, mutateEstimate]);

  const createMutation = useMutation({
    mutationFn: (input: CreateBookingPayload) => api<Booking>('/bookings', { method: 'POST', body: input }),
    onSuccess: (data) => setBooking(data),
    onError: (err) => {
      setSubmitError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    },
  });

  const selectedBrand = brandsQuery.data?.find((b) => b.id === brandId);
  const selectedModel = modelsQuery.data?.find((m) => m.id === modelId);
  const selectedBranch = branchesQuery.data?.find((b) => b.id === branchId) ?? branchesQuery.data?.[0];

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validateDetails(): boolean {
    const next: Record<string, string> = {};
    const minDate = todayIso();
    if (!date) next.date = 'Choose a date';
    else if (date < minDate) next.date = 'Date must be today or later';
    if (!time) next.time = 'Choose a time slot';
    if (!name.trim()) next.name = 'Enter your name';
    if (!email.trim()) next.email = 'Enter your email';
    else if (!emailSchema.safeParse(email).success) next.email = 'Enter a valid email address';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (step === 2 && !validateDetails()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleConfirm() {
    if (!branchId || !brandId || !modelId || serviceIds.length === 0) return;
    setSubmitError(null);
    createMutation.mutate({
      branchId,
      brandId,
      modelId,
      serviceIds,
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      timeSlot: time,
      problemDescription: problemDescription.trim() || undefined,
      customer: { name: name.trim(), email: email.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) },
    });
  }

  function resetBooking() {
    setBooking(null);
    setStep(0);
    setBrandId('');
    setModelId('');
    setServiceIds([]);
    setDate('');
    setTime('');
    setProblemDescription('');
    setName('');
    setEmail('');
    setPhone('');
    setErrors({});
    setSubmitError(null);
    setBranchId('');
    estimateMutation.reset();
    createMutation.reset();
  }

  if (booking) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Container className="py-16">
          <div className="mx-auto max-w-2xl">
            <Card className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Booking confirmed</h1>
              <p className="text-sm text-ink-muted">Keep this reference handy to track your repair:</p>
              <p className="rounded-md border border-line bg-surface px-4 py-2 font-mono text-lg font-semibold tabular-nums text-ink">
                {booking.bookingRef}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={() => navigate(`/track/${booking.bookingRef}`)}>Track your repair</Button>
                <Button variant="secondary" onClick={resetBooking}>
                  Make another booking
                </Button>
              </div>
            </Card>
          </div>
        </Container>
      </motion.div>
    );
  }

  const canNext =
    step === 0 ? !!brandId && !!modelId : step === 1 ? serviceIds.length > 0 : step === 2 ? true : false;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Book a repair</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Book a repair</h1>
          <div className="mt-8">
            <BookingStepper steps={STEPS} current={step} />
          </div>

          <div className="mt-10">
            {step === 0 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  {brandsQuery.isLoading ? (
                    <Skeleton className="h-[72px]" />
                  ) : (
                    <Select
                      id="brand"
                      label="Brand"
                      value={brandId}
                      onChange={(e) => {
                        setBrandId(e.target.value);
                        setModelId('');
                      }}
                    >
                      <option value="">Select a brand</option>
                      {brandsQuery.data?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <div>
                  {!brandId ? (
                    <div className="flex h-[72px] items-center rounded-md border border-line bg-surface px-3 text-sm text-ink-muted">
                      Choose a brand first
                    </div>
                  ) : modelsQuery.isLoading ? (
                    <Skeleton className="h-[72px]" />
                  ) : (
                    <Select id="model" label="Model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                      <option value="">Select a model</option>
                      {modelsQuery.data?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.releaseYear ? ` (${m.releaseYear})` : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-ink-muted">
                  {selectedModel
                    ? `Select the services you need for your ${selectedBrand?.name ?? ''} ${selectedModel.name}.`
                    : 'Select the services you need.'}
                </p>
                {servicesQuery.isLoading ? (
                  <div className="flex flex-col gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {servicesQuery.data?.map((s) => {
                      const checked = serviceIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border bg-raised p-4 transition-colors',
                            checked ? 'border-accent bg-accent-soft' : 'border-line hover:border-line',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded-sm accent-accent"
                            checked={checked}
                            onChange={() => toggleService(s.id)}
                          />
                          <span className="flex-1">
                            <span className="block text-sm font-medium text-ink">{s.name}</span>
                            {s.shortDescription && (
                              <span className="mt-0.5 block text-xs text-ink-muted">{s.shortDescription}</span>
                            )}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-ink">{formatMoney(s.fromPrice)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-lg border border-line bg-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Estimated cost</p>
                  {serviceIds.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">Select at least one service to see an estimate.</p>
                  ) : estimatePending ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-6 w-1/3" />
                    </div>
                  ) : estimateError ? (
                    <p className="mt-2 text-sm text-danger">
                      {estimateError instanceof ApiClientError ? estimateError.message : 'Could not get an estimate.'}
                    </p>
                  ) : estimate ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {estimate.items.map((it) => (
                        <div key={it.service.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-ink">
                            {it.service.name}
                            {it.isFromPrice && <Badge tone="warning">estimate</Badge>}
                          </span>
                          <span className="font-medium tabular-nums text-ink">{formatMoney(it.quote)}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
                        <span className="text-sm font-semibold text-ink">Estimated total</span>
                        <span className="text-lg font-bold tabular-nums text-ink">{formatMoney(estimate.total)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-5">
                  <p className="text-sm font-semibold text-ink">Pick a time</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      type="date"
                      id="date"
                      label="Date"
                      min={todayIso()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      error={errors.date}
                    />
                    <Select id="time" label="Time slot" value={time} onChange={(e) => setTime(e.target.value)} error={errors.time}>
                      <option value="">Select a time</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Textarea
                    id="problem"
                    label="Describe the problem (optional)"
                    placeholder="e.g. Screen cracked, battery drains fast…"
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                  />
                </Card>

                <Card className="flex flex-col gap-5">
                  <p className="text-sm font-semibold text-ink">Your contact details</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      id="name"
                      label="Name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={errors.name}
                    />
                    <Input
                      id="email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                    />
                    <Input
                      id="phone"
                      label="Phone (optional)"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </Card>
              </div>
            )}

            {step === 3 && (
              <Card className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-ink">Review your booking</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Branch</dt>
                    <dd className="font-medium text-ink">{selectedBranch?.name ?? 'Main store'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Device</dt>
                    <dd className="font-medium text-ink">
                      {selectedBrand ? `${selectedBrand.name} ${selectedModel?.name ?? ''}` : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Services</dt>
                    <dd className="text-right font-medium text-ink">
                      {estimate ? estimate.items.map((i) => i.service.name).join(', ') : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">When</dt>
                    <dd className="font-medium text-ink">
                      {formatDay(date)} at {time}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Contact</dt>
                    <dd className="font-medium text-ink">
                      {name} · {email}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                    <dt className="text-sm font-semibold text-ink">Estimated total</dt>
                    <dd className="text-lg font-bold tabular-nums text-ink">
                      {estimate ? formatMoney(estimate.total) : '—'}
                    </dd>
                  </div>
                </dl>
                {submitError && (
                  <p className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger">
                    {submitError}
                  </p>
                )}
                <Button className="w-full" size="lg" loading={createMutation.isPending} onClick={handleConfirm}>
                  Confirm booking
                </Button>
              </Card>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 && (
              <Button onClick={goNext} disabled={!canNext}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </Container>
    </motion.div>
  );
}
