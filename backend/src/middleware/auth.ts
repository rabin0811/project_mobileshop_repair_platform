import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { errorCode, hasCapability, type Capability, type UserRole } from '@mobileshop/shared';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Optional: attach req.user if a valid Bearer token is present. Public routes use this. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as {
        sub: string;
        role: UserRole;
        email: string;
      };
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
      // leave unauthenticated; protected routes reject below
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new AppError(401, errorCode.UNAUTHORIZED, 'Authentication required');
  next();
}

/** RBAC capability gate — see packages/shared/rbac.ts. */
export function authorize(...capabilities: Capability[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, errorCode.UNAUTHORIZED, 'Authentication required');
    const missing = capabilities.filter((c) => !hasCapability(req.user!.role, c));
    if (missing.length) {
      throw new AppError(403, errorCode.FORBIDDEN, `Missing permission: ${missing.join(', ')}`);
    }
    next();
  };
}
