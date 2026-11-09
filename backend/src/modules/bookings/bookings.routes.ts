import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '@mobileshop/db';
import { createBookingSchema, errorCode } from '@mobileshop/shared';
import { ok, asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import * as svc from './bookings.service';

const createLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: errorCode.RATE_LIMITED, message: 'Too many bookings, please try again later' } },
});

const trackParams = z.object({ bookingRef: z.string().regex(/^MF-\d{8}-[A-Z2-9]{5}$/, 'Invalid booking reference') });
const cancelParams = z.object({ id: z.string().min(1) });

export const bookingsRouter = Router();

bookingsRouter.post('/bookings', createLimiter, validateBody(createBookingSchema), asyncHandler(async (req, res) => {
  const booking = await svc.createBooking(req.body, req.user);
  ok(res, booking, 201);
}));

// Public tracker — keyed by the high-entropy bookingRef (the bearer secret).
bookingsRouter.get('/bookings/track/:bookingRef', validateParams(trackParams), asyncHandler(async (req, res) => {
  ok(res, await svc.trackBooking(req.params.bookingRef as string));
}));

bookingsRouter.get('/bookings/my', requireAuth, asyncHandler(async (req, res) => {
  ok(res, await svc.myBookings(req.user!));
}));

bookingsRouter.post('/bookings/:id/cancel', validateParams(cancelParams), asyncHandler(async (req, res) => {
  let byCustomerId: string | undefined;
  if (req.user) {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    byCustomerId = customer?.id;
  }
  await svc.cancelBooking(req.params.id as string, { byCustomerId });
  ok(res, { cancelled: true });
}));
