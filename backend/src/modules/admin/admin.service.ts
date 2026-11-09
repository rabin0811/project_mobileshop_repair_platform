import { prisma, Prisma } from '@mobileshop/db';
import {
  errorCode,
  type BookingStatus,
  type CreateBookingInput,
  type RepairStage,
} from '@mobileshop/shared';
import { AppError } from '../../lib/errors';
import { generateRef } from '../../lib/refs';
import { estimateItems } from '../catalog/catalog.service';
import { cancelBooking, getBookingDetail, toPublicBooking } from '../bookings/bookings.service';

export async function adminCreateWalkIn(input: CreateBookingInput) {
  const branch = await prisma.branch.findFirst({ where: { id: input.branchId, isActive: true } });
  if (!branch) throw new AppError(404, errorCode.NOT_FOUND, 'Branch not found');

  const { items, total } = await estimateItems(input.serviceIds, input.brandId, input.modelId);
  const booking = await prisma.booking.create({
    data: {
      bookingRef: generateRef('MF'),
      branchId: input.branchId,
      guestName: input.customer?.name ?? null,
      guestEmail: input.customer?.email?.toLowerCase() ?? null,
      guestPhone: input.customer?.phone ?? null,
      brandId: input.brandId,
      modelId: input.modelId,
      problemDescription: input.problemDescription,
      images: input.images ?? [],
      deviceImei: input.deviceImei,
      deviceSerial: input.deviceSerial,
      devicePassword: input.devicePassword,
      scheduledAt: new Date(input.scheduledAt),
      timeSlot: input.timeSlot,
      estimatedCost: total,
      status: 'CONFIRMED',
      repairStage: 'DEVICE_RECEIVED',
      isWalkIn: true,
      services: { create: items.map((it, i) => ({ serviceId: it.serviceId, quotedPrice: it.quote, isPrimary: i === 0 })) },
      events: { create: { actorType: 'ADMIN', toStatus: 'CONFIRMED', note: 'Walk-in intake' } },
    },
  });
  const detail = await getBookingDetail(booking.id);
  return toPublicBooking(detail!);
}

export async function getBooking(id: string) {
  const detail = await getBookingDetail(id);
  if (!detail) throw new AppError(404, errorCode.NOT_FOUND, 'Booking not found');
  return toPublicBooking(detail);
}

export async function adminUpdate(id: string, data: Record<string, unknown>) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError(404, errorCode.NOT_FOUND, 'Booking not found');

  if (data.status && data.status !== booking.status) {
    await prisma.bookingEvent.create({
      data: {
        bookingId: id,
        actorType: 'ADMIN',
        fromStatus: booking.status,
        toStatus: String(data.status),
        note: 'Status updated by admin',
      },
    });
  }
  // `data as never`: the validated zod body is already shaped like BookingUpdateInput.
  const updated = await prisma.booking.update({ where: { id }, data: data as never });
  const detail = await getBookingDetail(updated.id);
  return toPublicBooking(detail!);
}

export function adminCancel(id: string) {
  return cancelBooking(id, { byAdmin: true });
}

export interface AdminListQuery {
  branchId?: string;
  status?: BookingStatus;
  repairStage?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAdmin(q: AdminListQuery) {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
  const where: Prisma.BookingWhereInput = {};
  if (q.branchId) where.branchId = q.branchId;
  if (q.status) where.status = q.status;
  if (q.repairStage) where.repairStage = q.repairStage as RepairStage;
  if (q.from || q.to) {
    where.scheduledAt = {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    };
  }
  if (q.search) {
    const term = q.search;
    where.OR = [
      { bookingRef: { contains: term, mode: 'insensitive' } },
      { guestName: { contains: term, mode: 'insensitive' } },
      { guestEmail: { contains: term, mode: 'insensitive' } },
      { customer: { user: { name: { contains: term, mode: 'insensitive' } } } },
      { customer: { user: { email: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        branch: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        model: { select: { id: true, name: true } },
        customer: { select: { id: true, user: { select: { name: true, email: true } } } },
        services: { include: { service: { select: { id: true, name: true, slug: true } } } },
        invoice: { select: { id: true, invoiceNo: true, total: true, status: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items: rows.map(stripSecret),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function analyticsOverview(branchId?: string) {
  const whereBranch = branchId ? { branchId } : {};
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [bookingsToday, activeRepairs, pendingReviews, invoices, top] = await Promise.all([
    prisma.booking.count({ where: { ...whereBranch, scheduledAt: { gte: startOfDay } } }),
    prisma.booking.count({ where: { ...whereBranch, status: 'CONFIRMED', repairStage: { not: 'DELIVERED' } } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.invoice.findMany({ where: { status: { in: ['ISSUED', 'PAID'] } }, select: { total: true } }),
    prisma.bookingService.groupBy({
      by: ['serviceId'],
      _count: { _all: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    }),
  ]);

  const monthRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const services = await prisma.service.findMany({
    where: { id: { in: top.map((t) => t.serviceId) } },
    select: { id: true, name: true },
  });
  const topServices = top.map((t) => ({
    serviceId: t.serviceId,
    name: services.find((s) => s.id === t.serviceId)?.name ?? '—',
    count: t._count._all,
  }));

  return { bookingsToday, activeRepairs, monthRevenue, pendingReviews, topServices };
}

function stripSecret<T extends { devicePassword?: string | null }>(row: T): Omit<T, 'devicePassword'> {
  const { devicePassword: _pwd, ...rest } = row;
  return rest;
}
