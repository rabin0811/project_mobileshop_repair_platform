import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Container, EmptyState, Skeleton } from '@mobileshop/ui';
import { api } from '../../lib/api';
import type { Branch } from '../../lib/types';
import { Clock, MapPin, Navigation, Phone, Store } from 'lucide-react';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function whatsappLink(whatsapp: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
}

export default function BranchesPage() {
  const { data: branches, isLoading, isError, error } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api<Branch[]>('/branches'),
  });

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Container className="py-16">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Find us</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Our branches</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Walk in, drop your phone, and pick it up when it's ready.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-10">
            <EmptyState
              icon={Store}
              title="Couldn't load branches"
              description={error instanceof Error ? error.message : 'Something went wrong.'}
            />
          </div>
        ) : branches && branches.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Store}
              title="No branches yet"
              description="We'll be opening soon in a city near you."
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {branches?.map((branch) => {
              const todayHours = branch.businessHours?.[todayKey];
              const isOpenToday = !!todayHours;
              return (
                <Card key={branch.id} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-ink">{branch.name}</h2>
                    {isOpenToday ? (
                      <Badge tone="success" dot>
                        Open today
                      </Badge>
                    ) : (
                      <Badge tone="neutral" dot>
                        Closed today
                      </Badge>
                    )}
                  </div>
                  <p className="flex items-start gap-2 text-sm text-ink-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {branch.address}, {branch.city}, {branch.state} {branch.postalCode}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {branch.phone && (
                      <a
                        href={`tel:${branch.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        {branch.phone}
                      </a>
                    )}
                    {branch.whatsapp && (
                      <a
                        href={whatsappLink(branch.whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                      >
                        WhatsApp
                      </a>
                    )}
                    {branch.mapsUrl && (
                      <a
                        href={branch.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                      >
                        <Navigation className="h-3.5 w-3.5" aria-hidden />
                        Get directions
                      </a>
                    )}
                  </div>
                  <div className="mt-auto border-t border-line pt-4">
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      Opening hours
                    </p>
                    <table className="mt-2 w-full text-sm">
                      <tbody>
                        {DAYS.map((day) => {
                          const hours = branch.businessHours?.[day.key];
                          return (
                            <tr key={day.key} className="border-t border-line first:border-t-0">
                              <td className="py-1.5 pr-2 text-ink-muted">{day.label}</td>
                              <td className="py-1.5 text-right tabular-nums text-ink">
                                {hours ? `${hours[0]} – ${hours[1]}` : 'Closed'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </motion.div>
  );
}
