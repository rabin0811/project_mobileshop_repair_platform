import type { NextFunction, Request, Response } from 'express';

/** Respond with the `{ data, meta? }` envelope (docs/api.md). */
export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  res.status(status).json(meta ? { data, meta } : { data });
}

/** Wrap an async handler; Express 5 also catches async rejections natively, this is belt-and-braces. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
