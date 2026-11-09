import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/mobileshop'),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me-please-000'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please-000'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('MobileFix Pro <no-reply@example.com>'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  DEV_ECHO_OTP: z.string().optional().default('true'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
