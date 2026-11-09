import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@mobileshop/db';
import { errorCode } from '@mobileshop/shared';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, errorCode.NOT_FOUND, `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: errorCode.VALIDATION, message: 'Validation failed', details: err.flatten().fieldErrors },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: errorCode.CONFLICT, message: 'A record with that value already exists' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: errorCode.NOT_FOUND, message: 'Record not found' } });
      return;
    }
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: errorCode.INTERNAL, message: 'Internal server error' } });
}
