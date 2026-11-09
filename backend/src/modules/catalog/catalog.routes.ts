import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { errorCode, estimateSchema } from '@mobileshop/shared';
import { ok, asyncHandler } from '../../lib/http';
import { validateBody, validateParams } from '../../middleware/validate';
import * as catalog from './catalog.service';

const brandParams = z.object({ brandId: z.string().min(1) });
const serviceParams = z.object({ slug: z.string().min(1) });

const estimateLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: errorCode.RATE_LIMITED, message: 'Too many requests, slow down' } },
});

export const catalogRouter = Router();

catalogRouter.get('/brands', asyncHandler(async (_req, res) => ok(res, await catalog.listBrands())));
catalogRouter.get('/brands/:brandId/models', validateParams(brandParams), asyncHandler(async (req, res) =>
  ok(res, await catalog.listModels(req.params.brandId as string)),
));
catalogRouter.get('/services', asyncHandler(async (_req, res) => ok(res, await catalog.listServices())));
catalogRouter.get('/services/:slug', validateParams(serviceParams), asyncHandler(async (req, res) =>
  ok(res, await catalog.getService(req.params.slug as string)),
));
catalogRouter.post('/repair/estimate', estimateLimiter, validateBody(estimateSchema), asyncHandler(async (req, res) =>
  ok(res, await catalog.estimate(req.body)),
));
