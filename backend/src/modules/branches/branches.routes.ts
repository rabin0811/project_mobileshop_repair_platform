import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@mobileshop/db';
import { errorCode } from '@mobileshop/shared';
import { AppError } from '../../lib/errors';
import { ok, asyncHandler } from '../../lib/http';
import { validateParams } from '../../middleware/validate';

const branchParams = z.object({ id: z.string().min(1) });

const publicBranchSelect = {
  id: true,
  name: true,
  slug: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  whatsapp: true,
  email: true,
  mapsUrl: true,
  timezone: true,
  businessHours: true,
} as const;

export const branchesRouter = Router();

branchesRouter.get('/branches', asyncHandler(async (_req, res) => {
  const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: publicBranchSelect });
  ok(res, branches);
}));

branchesRouter.get('/branches/:id', validateParams(branchParams), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id as string, isActive: true }, select: publicBranchSelect });
  if (!branch) throw new AppError(404, errorCode.NOT_FOUND, 'Branch not found');
  ok(res, branch);
}));
