import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { errorCode } from '@mobileshop/shared';
import { AppError } from '../lib/errors';

function validationError(schema: ZodType, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, errorCode.VALIDATION, 'Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = validationError(schema, req.body);
    next();
  };

export const validateParams =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.params = validationError(schema, req.params) as typeof req.params;
    next();
  };

export const validateQuery =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = validationError(schema, req.query);
    // Express 5 exposes req.query through a getter; define an own property to
    // replace it with the validated, coerced query without mutating the getter.
    Object.defineProperty(req, 'query', {
      value: parsed,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
