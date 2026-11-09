import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Container, EmptyState, Skeleton } from '@mobileshop/ui';
import { api } from '../../lib/api';
import type { Service } from '../../lib/types';
import { ServiceCard } from '../services/ServiceCard';
import { ArrowRight, Radar, ShieldCheck, Zap } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: Zap,
    title: 'Fast turnaround',
    copy: 'Most repairs are done the same day — many within the hour.',
  },
  {
    icon: ShieldCheck,
    title: 'Warranty on every repair',
    copy: 'Every fix is backed by a warranty for total peace of mind.',
  },
  {
    icon: Radar,
    title: 'Live tracking',
    copy: 'Follow your repair through every stage, in real time.',
  },
];

const STEPS = [
  {
    title: 'Pick your device & service',
    copy: 'Choose your phone model and the repair you need — screen, battery, camera and more.',
  },
  {
    title: 'Book a time slot',
    copy: 'Tell us when to expect you. Our technicians are ready at the counter.',
  },
  {
    title: 'Track the repair live',
    copy: 'Get a booking reference and watch each stage of the repair online.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  });

  const popular = services?.slice(0, 6) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Hero */}
      <section className="bg-canvas">
        <Container className="flex flex-col items-center gap-6 py-24 text-center">
          <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.15] tracking-tight text-ink">
            Phone repairs, done right
          </h1>
          <p className="max-w-xl text-base text-ink-muted">
            Screen, battery, camera and more — repaired fast with a warranty on every job. Book online and
            track your repair live.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/book')}>
              Book a repair
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/services')}>
              Browse services
            </Button>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-surface">
        <Container className="grid gap-8 py-12 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-soft text-accent">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="max-w-xs text-sm text-ink-muted">{item.copy}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* How it works */}
      <section className="bg-canvas py-24">
        <Container>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Three steps to a fixed phone</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="flex flex-col gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted">{step.copy}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Popular services */}
      <section className="bg-surface py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Popular services</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Most common repairs</h2>
            </div>
            <Button variant="secondary" onClick={() => navigate('/services')}>
              View all services
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)
              : popular.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
          {!isLoading && popular.length === 0 && (
            <div className="mt-10">
              <EmptyState
                title="No services yet"
                description="We're adding services — check back soon."
              />
            </div>
          )}
        </Container>
      </section>

      {/* Final CTA */}
      <section className="bg-accent-soft">
        <Container className="flex flex-col items-center gap-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Ready to fix your phone?</h2>
          <p className="max-w-md text-sm text-ink-muted">
            Book a repair in under a minute — or walk into any of our branches.
          </p>
          <Button size="lg" onClick={() => navigate('/book')}>
            Book a repair
          </Button>
        </Container>
      </section>
    </motion.div>
  );
}
