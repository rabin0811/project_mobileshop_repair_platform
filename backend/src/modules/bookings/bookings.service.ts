import { prisma } from '@mobileshop/db';
import type { ActorType } from '@mobileshop/db';
import {
  errorCode,
  REPAIR_STAGE_LABELS,
  STAGE_TRANSITIONS,
  type CreateBookingInput,
  type RepairStage,
} from '@mobileshop/shared';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { generateRef } from '../../lib/refs';
import { emailShell, sendEmail } from '../../lib/mailer';
import { estimateItems } from '../catalog/catalog.service';
import type { AuthUser } from '../../middleware/auth';

type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;

export function getBookingDetail(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      model: { select: { id: true, name: true } },
      customer: { select: { id: true, user: { select: { id: true, name: true, email: true, phone: true } } } },
      technician: { select: { id: true, user: { select: { id: true, name: true } } } },
      services: {
        include: { service: { select: { id: true, name: true, slug: true, estTimeMin: true, warrantyDays: true } } },
      },
      events: { orderBy: { createdAt: 'asc' } },
      invoice: true,
    },
  });
}

/** Public-safe projection — `devicePassword` never leaves the server (security.md). */
export function toPublicBooking(b: BookingDetail) {
  return {
    id: b.id,
    bookingRef: b.bookingRef,
    status: b.status,
    repairStage: b.repairStage,
    paymentStatus: b.paymentStatus,
    branch: b.branch,
    brand: b.brand,
    model: b.model,
    customer: b.customer,
    technician: b.technician,
    services: b.services,
    events: b.events,
    invoice: b.invoice,
    scheduledAt: b.scheduledAt,
    timeSlot: b.timeSlot,
    estimatedCost: b.estimatedCost,
    depositAmount: b.depositAmount,
    problemDescription: b.problemDescription,
    images: b.images,
    deviceImei: b.deviceImei,
    deviceSerial: b.deviceSerial,
    guestName: b.guestName,
    notes: b.notes,
    isWalkIn: b.isWalkIn,
    createdAt: b.createdAt,
  };
}

export async function bookingContactEmail(booking: { guestEmail?: string | null; customerId?: string | null }) {
  if (booking.guestEmail) return booking.guestEmail;
  if (booking.customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: booking.customerId },
      select: { user: { select: { email: true } } },
    });
    return c?.user.email ?? null;
  }
  return null;
}

export async function createBooking(input: CreateBookingInput, user?: AuthUser) {
  const branch = await prisma.branch.findFirst({ where: { id: input.branchId, isActive: true } });
  if (!branch) throw new AppError(404, errorCode.NOT_FOUND, 'Branch not found');

  // Idempotent retry: same key → return the already-created booking.
  if (input.idempotencyKey) {
    const existing = await prisma.booking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      const detail = await getBookingDetail(existing.id);
      return toPublicBooking(detail!);
    }
  }

  let customerId: string | null = null;
  let guestEmail: string | null = input.customer?.email?.toLowerCase() ?? null;
  let guestName: string | null = input.customer?.name ?? null;
  let guestPhone: string | null = input.customer?.phone ?? null;

  if (user) {
    const customer = await prisma.customer.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (customer) {
      customerId = customer.id;
      guestEmail = guestName = guestPhone = null;
    }
  } else if (guestEmail) {
    const matched = await prisma.user.findUnique({ where: { email: guestEmail }, select: { id: true, role: true } });
    if (matched?.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { userId: matched.id }, select: { id: true } });
      customerId = customer?.id ?? null;
    }
  }

  const { items, total } = await estimateItems(input.serviceIds, input.brandId, input.modelId);

  const booking = await prisma.$transaction(async (tx) => {
    if (input.timeSlot) {
      // Serialize concurrent slot claims on the same (branch, datetime, slot).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.branchId}:${String(input.scheduledAt)}:${input.timeSlot}`}))`;
      const clash = await tx.booking.findFirst({
        where: {
          branchId: input.branchId,
          scheduledAt: new Date(input.scheduledAt),
          timeSlot: input.timeSlot,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      if (clash) throw new AppError(409, errorCode.SLOT_TAKEN, 'That time slot was just booked — please choose another.');
    }
    return tx.booking.create({
      data: {
        bookingRef: generateRef('MF'),
        branchId: input.branchId,
        customerId,
        guestName,
        guestEmail,
        guestPhone,
        brandId: input.brandId,
        modelId: input.modelId,
        problemDescription: input.problemDescription,
        images: input.images ?? [],
        deviceImei: input.deviceImei,
        deviceSerial: input.deviceSerial,
        devicePassword: input.devicePassword, // TODO: encrypt at rest (Phase 2 hardening, security.md)
        scheduledAt: new Date(input.scheduledAt),
        timeSlot: input.timeSlot,
        estimatedCost: total,
        idempotencyKey: input.idempotencyKey,
        status: 'PENDING',
        services: {
          create: items.map((it, i) => ({ serviceId: it.serviceId, quotedPrice: it.quote, isPrimary: i === 0 })),
        },
        events: { create: { actorType: 'CUSTOMER', toStatus: 'PENDING', note: 'Booking submitted online' } },
      },
    });
  });

  const contact = await bookingContactEmail(booking);
  if (contact) {
    await sendEmail({
      to: contact,
      subject: `Booking confirmed — ${booking.bookingRef}`,
      html: emailShell(
        `<p>Thanks for booking with {{SHOP_NAME}}.</p>` +
          `<p>Your booking reference is <strong>${booking.bookingRef}</strong>.<br/>` +
          `Track it live: <a href="${env.CLIENT_URL}/track/${booking.bookingRef}">${env.CLIENT_URL}/track/${booking.bookingRef}</a></p>`,
      ),
    });
  }

  const detail = await getBookingDetail(booking.id);
  return toPublicBooking(detail!);
}

export async function trackBooking(bookingRef: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      branch: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      model: { select: { id: true, name: true } },
      services: {
        include: { service: { select: { id: true, name: true, slug: true, estTimeMin: true, warrantyDays: true } } },
      },
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!booking) throw new AppError(404, errorCode.NOT_FOUND, 'Booking not found');
  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    status: booking.status,
    repairStage: booking.repairStage,
    branch: booking.branch,
    brand: booking.brand,
    model: booking.model,
    services: booking.services,
    events: booking.events,
    scheduledAt: booking.scheduledAt,
    estimatedCost: booking.estimatedCost,
    problemDescription: booking.problemDescription,
    images: booking.images,
  };
}

export async function myBookings(user: AuthUser) {
  const customer = await prisma.customer.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!customer) return [];
  const rows = await prisma.booking.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    include: {
      branch: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      model: { select: { id: true, name: true } },
      services: { include: { service: { select: { id: true, name: true, slug: true } } } },
    },
  });
  return rows.map(stripSecret);
}

export async function cancelBooking(id: string, opts: { byCustomerId?: string; byAdmin?: boolean }) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError(404, errorCode.NOT_FOUND, 'Booking not found');
  if (!opts.byAdmin) {
    if (!opts.byCustomerId || booking.customerId !== opts.byCustomerId) {
      throw new AppError(403, errorCode.FORBIDDEN, 'Not your booking');
    }
  }
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    throw new AppError(409, errorCode.CONFLICT, 'This booking can no longer be cancelled');
  }
  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } }),
    prisma.bookingEvent.create({
      data: {
        bookingId: id,
        actorType: opts.byAdmin ? 'ADMIN' : 'CUSTOMER',
        fromStatus: booking.status,
        toStatus: 'CANCELLED',
      },
    }),
  ]);
  const contact = await bookingContactEmail(booking);
  if (contact) {
    await sendEmail({
      to: contact,
      subject: 'Booking cancelled',
      html: emailShell(`<p>Your booking <strong>${booking.bookingRef}</strong> has been cancelled.</p>`),
    });
  }
}

/** Advance the repair stage — enforced against the STAGE_TRANSITIONS machine. */
export async function advanceStage(bookingId: string, to: RepairStage, opts: { note?: string; actor?: ActorType } = {}) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError(404, errorCode.NOT_FOUND, 'Booking not found');
  const allowed = booking.repairStage ? STAGE_TRANSITIONS[booking.repairStage] : ['DEVICE_RECEIVED'];
  if (!allowed.includes(to)) {
    throw new AppError(409, errorCode.ILLEGAL_TRANSITION, `Cannot move from ${booking.repairStage ?? '—'} to ${to}`);
  }
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { repairStage: to } }),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        actorType: opts.actor ?? 'ADMIN',
        fromStatus: booking.repairStage ?? null,
        toStatus: to,
        note: opts.note,
      },
    }),
  ]);
  const contact = await bookingContactEmail(booking);
  if (contact) {
    await sendEmail({
      to: contact,
      subject: `Repair update: ${REPAIR_STAGE_LABELS[to]}`,
      html: emailShell(
        `<p>Your repair for booking <strong>${booking.bookingRef}</strong> is now: <strong>${REPAIR_STAGE_LABELS[to]}</strong>.</p>`,
      ),
    });
  }
  const detail = await getBookingDetail(bookingId);
  return toPublicBooking(detail!);
}

function stripSecret<T extends { devicePassword?: string | null }>(row: T): Omit<T, 'devicePassword'> {
  const { devicePassword: _pwd, ...rest } = row;
  return rest;
}
