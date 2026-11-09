import { Router } from 'express';
import { z } from 'zod';
import { BOOKING_STATUSES, createBookingSchema, REPAIR_STAGES } from '@mobileshop/shared';
import { ok, asyncHandler } from '../../lib/http';
import { authorize } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { advanceStage } from '../bookings/bookings.service';
import * as admin from './admin.service';

const bookingParams = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  branchId: z.string().optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  repairStage: z.enum(REPAIR_STAGES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateBody = z.object({
  technicianId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  estimatedCost: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  timeSlot: z.string().optional(),
  problemDescription: z.string().max(2000).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  deviceImei: z.string().max(32).optional(),
  deviceSerial: z.string().max(64).optional(),
});

const stageBody = z.object({
  stage: z.enum(REPAIR_STAGES),
  note: z.string().max(500).optional(),
});

export const adminRouter = Router();

adminRouter.get(
  '/admin/bookings',
  authorize('bookings:read'),
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    const result = await admin.listAdmin(req.query);
    ok(res, result.items, 200, result.meta);
  }),
);

adminRouter.post(
  '/admin/bookings',
  authorize('bookings:write'),
  validateBody(createBookingSchema),
  asyncHandler(async (req, res) => {
    ok(res, await admin.adminCreateWalkIn(req.body), 201);
  }),
);

adminRouter.get(
  '/admin/bookings/:id',
  authorize('bookings:read'),
  validateParams(bookingParams),
  asyncHandler(async (req, res) => {
    ok(res, await admin.getBooking(req.params.id as string));
  }),
);

adminRouter.patch(
  '/admin/bookings/:id',
  authorize('bookings:write'),
  validateParams(bookingParams),
  validateBody(updateBody),
  asyncHandler(async (req, res) => {
    ok(res, await admin.adminUpdate(req.params.id as string, req.body));
  }),
);

adminRouter.post(
  '/admin/bookings/:id/stage',
  authorize('bookings:write'),
  validateParams(bookingParams),
  validateBody(stageBody),
  asyncHandler(async (req, res) => {
    ok(res, await advanceStage(req.params.id as string, req.body.stage, { note: req.body.note }));
  }),
);

adminRouter.post(
  '/admin/bookings/:id/cancel',
  authorize('bookings:write'),
  validateParams(bookingParams),
  asyncHandler(async (req, res) => {
    await admin.adminCancel(req.params.id as string);
    ok(res, { cancelled: true });
  }),
);

adminRouter.get(
  '/admin/analytics/overview',
  authorize('analytics:read'),
  asyncHandler(async (req, res) => {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    ok(res, await admin.analyticsOverview(branchId));
  }),
);
