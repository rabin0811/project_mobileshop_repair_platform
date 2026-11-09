import type { BookingStatus } from '@mobileshop/shared';
import { Badge, type BadgeTone } from '@mobileshop/ui';

const STATUS_TONES: Record<BookingStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'accent',
  CANCELLED: 'danger',
};

export function statusTone(status: BookingStatus): BadgeTone {
  return STATUS_TONES[status];
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge tone={statusTone(status)} dot>
      {status}
    </Badge>
  );
}
