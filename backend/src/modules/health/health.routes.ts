import { Router } from 'express';
import { prisma } from '@mobileshop/db';
import { ok, asyncHandler } from '../../lib/http';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(async (_req, res) => {
  let db = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'up';
  } catch {
    // db down — still report, don't crash the health probe
  }
  ok(res, { status: 'ok', db, uptime: process.uptime(), version: '0.1.0', time: new Date().toISOString() });
}));
