import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins, env } from './config/env';
import { errorHandler, notFound } from './lib/errors';
import { authenticate } from './middleware/auth';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { branchesRouter } from './modules/branches/branches.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { healthRouter } from './modules/health/health.routes';

export const app = express();

app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Per-request id for correlating logs across services (docs/architecture.md §5.7).
app.use((req, res, next) => {
  res.locals.requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
  res.setHeader('x-request-id', res.locals.requestId);
  next();
});

// Optional auth — attaches req.user when a valid Bearer token is present.
app.use(authenticate);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', branchesRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1', bookingsRouter);
app.use('/api/v1', adminRouter);

app.use(notFound);
app.use(errorHandler);
