import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Container, EmptyState, Skeleton } from '@mobileshop/ui';
import { ApiClientError, api } from '../../lib/api';
import { formatMoney, type PriceModel } from '@mobileshop/shared';
import type { Service } from '../../lib/types';
import { Clock, PackageX, ShieldCheck, Tag } from 'lucide-react';

const PRICE_MODEL_LABELS: Record<PriceModel, string> = {
  FIXED: 'Fixed price',
  FROM: 'Starting at',
  RANGE: 'Price range',
};

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: service, isLoading, isError, error } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => api<Service>(`/services/${slug ?? ''}`),
    enabled: !!slug,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Container className="py-16">
        {isLoading ? (
          <div className="mx-auto max-w-3xl">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-10 w-72" />
            <Skeleton className="mt-6 h-24" />
            <Skeleton className="mt-8 h-56" />
          </div>
        ) : isError || !service ? (
          <div className="mx-auto max-w-3xl">
            <EmptyState
              icon={PackageX}
              title={error instanceof ApiClientError && error.status === 404 ? 'Service not found' : "Couldn't load this service"}
              description={
                error instanceof ApiClientError && error.status === 404
                  ? 'The service you are looking for does not exist.'
                  : error instanceof Error
                    ? error.message
                    : 'Something went wrong.'
              }
              action={
                <Link to="/services">
                  <Button variant="secondary">Browse services</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {service.category.replace(/_/g, ' ')}
              </p>
              <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-ink">{service.name}</h1>
              {service.shortDescription && (
                <p className="mt-3 text-base font-medium text-ink">{service.shortDescription}</p>
              )}
              {service.description && (
                <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">{service.description}</p>
              )}
            </div>

            <Card className="h-fit flex-col gap-4 sm:sticky sm:top-24">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">from</p>
                <p className="text-3xl font-bold tabular-nums text-ink">{formatMoney(service.fromPrice)}</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-muted">
                    <Clock className="h-4 w-4" aria-hidden /> Est. time
                  </dt>
                  <dd className="font-medium tabular-nums text-ink">~{service.estTimeMin} min</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-muted">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> Warranty
                  </dt>
                  <dd className="font-medium text-ink">
                    {service.warrantyDays ? `${service.warrantyDays} days` : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-ink-muted">
                    <Tag className="h-4 w-4" aria-hidden /> Price model
                  </dt>
                  <dd className="font-medium text-ink">
                    {PRICE_MODEL_LABELS[service.priceModel] ?? service.priceModel}
                  </dd>
                </div>
              </dl>
              <Button className="w-full" size="lg" onClick={() => navigate('/book')}>
                Book this repair
              </Button>
            </Card>
          </div>
        )}
      </Container>
    </motion.div>
  );
}
