import { Link } from 'react-router-dom';
import { Badge, Card } from '@mobileshop/ui';
import { formatMoney } from '@mobileshop/shared';
import type { Service } from '../../lib/types';
import { Clock, ShieldCheck } from 'lucide-react';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <Card interactive className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
          <span className="flex flex-col items-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">from</span>
            <span className="text-base font-semibold tabular-nums text-ink">{formatMoney(service.fromPrice)}</span>
          </span>
        </div>
        {service.shortDescription && (
          <p className="line-clamp-2 text-sm text-ink-muted">{service.shortDescription}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          <Badge>
            <Clock className="h-3 w-3" aria-hidden /> ~{service.estTimeMin} min
          </Badge>
          {service.warrantyDays ? (
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" aria-hidden /> {service.warrantyDays}-day warranty
            </Badge>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
