import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Container, EmptyState, Skeleton } from '@mobileshop/ui';
import { api } from '../../lib/api';
import type { Service } from '../../lib/types';
import { ServiceCard } from './ServiceCard';
import { Wrench } from 'lucide-react';

export default function ServicesPage() {
  const { data: services, isLoading, isError, error } = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Container className="py-16">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Our services</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Repairs, priced upfront</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Transparent pricing for the most common phone repairs. Book online or walk into any branch.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)
            : services?.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>

        {!isLoading && isError && (
          <div className="mt-10">
            <EmptyState
              icon={Wrench}
              title="Couldn't load services"
              description={error instanceof Error ? error.message : 'Something went wrong.'}
            />
          </div>
        )}
        {!isLoading && !isError && services && services.length === 0 && (
          <div className="mt-10">
            <EmptyState
              icon={Wrench}
              title="No services yet"
              description="We're adding services — check back soon."
            />
          </div>
        )}
      </Container>
    </motion.div>
  );
}
