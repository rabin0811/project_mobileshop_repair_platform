import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  errorCode,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@mobileshop/shared';
import { ok, asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import * as auth from './auth.service';

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: errorCode.RATE_LIMITED, message: 'Too many attempts, please try again later' } },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    ok(res, await auth.register(req.body, res), 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    ok(res, await auth.login(req.body, res));
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    ok(res, await auth.refresh(req, res));
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await auth.logout(req, res);
    ok(res, {});
  }),
);

authRouter.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    await auth.verifyEmail(req.body);
    ok(res, { verified: true });
  }),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await auth.forgotPassword(req.body);
    ok(res, { sent: true, ...(result.devOtp ? { devOtp: result.devOtp } : {}) });
  }),
);

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await auth.resetPassword(req.body);
    ok(res, { reset: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await auth.getMe(req.user!));
  }),
);
