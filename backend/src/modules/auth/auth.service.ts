import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@mobileshop/db';
import type { User, OtpPurpose } from '@mobileshop/db';
import { errorCode, type UserRole } from '@mobileshop/shared';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { generateOtp, hashValue } from '../../lib/refs';
import { emailShell, sendEmail } from '../../lib/mailer';

const REFRESH_COOKIE = 'mfp_refresh';

interface TokenUser {
  id: string;
  role: UserRole;
  email: string;
}

function publicUser(user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone'>) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone };
}

function signAccess(user: TokenUser): string {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as never, // ms StringValue, e.g. '15m'
  });
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  };
}

async function issueTokens(user: TokenUser, res: Response): Promise<string> {
  const refreshToken = randomBytes(32).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashValue(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts());
  return signAccess(user);
}

async function createOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const code = generateOtp();
  await prisma.otp.create({
    data: { email, purpose, codeHash: hashValue(code), expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  return code;
}

function devOtpOrUndefined(code: string): string | undefined {
  return env.DEV_ECHO_OTP === 'true' ? code : undefined;
}

export async function register(
  input: { name: string; email: string; password: string; phone?: string },
  res: Response,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new AppError(409, errorCode.EMAIL_IN_USE, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        phone: input.phone ?? null,
        role: 'CUSTOMER',
      },
    });
    await tx.customer.create({ data: { userId: created.id } });
    return created;
  });

  const code = await createOtp(user.email, 'EMAIL_VERIFICATION');
  await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html: emailShell(`<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`),
  });

  const accessToken = await issueTokens({ id: user.id, role: user.role, email: user.email }, res);
  return { user: publicUser(user), accessToken, devOtp: devOtpOrUndefined(code) };
}

export async function login(input: { email: string; password: string }, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) throw new AppError(401, errorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  const match = await bcrypt.compare(input.password, user.passwordHash);
  if (!match) throw new AppError(401, errorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  if (!user.isActive) throw new AppError(403, errorCode.FORBIDDEN, 'This account is disabled');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const accessToken = await issueTokens({ id: user.id, role: user.role, email: user.email }, res);
  return { user: publicUser(user), accessToken };
}

export async function refresh(req: Request, res: Response) {
  const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;
  if (!token) throw new AppError(401, errorCode.UNAUTHORIZED, 'No refresh token');
  const tokenHash = hashValue(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored) throw new AppError(401, errorCode.UNAUTHORIZED, 'Invalid refresh token');

  if (stored.revokedAt || stored.expiresAt < new Date()) {
    // Reuse detection: a revoked token being presented means the session family is compromised.
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revokedAt: new Date() } });
    }
    throw new AppError(401, errorCode.UNAUTHORIZED, 'Refresh token expired or revoked');
  }

  const next = randomBytes(32).toString('base64url');
  const nextHash = hashValue(next);
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenId: nextHash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: nextHash,
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 200),
      },
    }),
  ]);
  res.cookie(REFRESH_COOKIE, next, cookieOpts());

  const { user } = stored; // includes.user — the generated client adds relations here
  return {
    user: publicUser({ id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone }),
    accessToken: signAccess({ id: user.id, role: user.role, email: user.email }),
  };
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashValue(token) }, data: { revokedAt: new Date() } });
  }
  res.clearCookie(REFRESH_COOKIE, cookieOpts());
}

async function consumeOtp(email: string, purpose: OtpPurpose, code: string) {
  const otp = await prisma.otp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw new AppError(400, errorCode.OTP_INVALID, 'No code found for this email');
  if (otp.expiresAt < new Date()) throw new AppError(400, errorCode.OTP_INVALID, 'Code expired');
  if (otp.attempts >= 5) throw new AppError(400, errorCode.OTP_INVALID, 'Too many attempts');
  if (!timingSafeEqual(Buffer.from(hashValue(code)), Buffer.from(otp.codeHash))) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(400, errorCode.OTP_INVALID, 'Incorrect code');
  }
  await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

export async function getMe(user: TokenUser) {
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    include: { customer: { select: { id: true } } },
  });
  if (!u) throw new AppError(404, errorCode.NOT_FOUND, 'User not found');
  return { ...publicUser(u), customerId: u.customer?.id ?? null };
}

export async function verifyEmail(input: { email: string; otp: string }) {
  await consumeOtp(input.email.toLowerCase(), 'EMAIL_VERIFICATION', input.otp);
  await prisma.user.update({ where: { email: input.email.toLowerCase() }, data: { emailVerifiedAt: new Date() } });
}

export async function forgotPassword(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (user) {
    const code = await createOtp(user.email, 'PASSWORD_RESET');
    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: emailShell(`<p>Your password reset code is <strong>${code}</strong>. It expires in 10 minutes.</p>`),
    });
    return { devOtp: devOtpOrUndefined(code) };
  }
  // Always succeed to avoid user enumeration.
  return { devOtp: undefined };
}

export async function resetPassword(input: { email: string; otp: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) throw new AppError(400, errorCode.OTP_INVALID, 'Invalid reset request');
  await consumeOtp(user.email, 'PASSWORD_RESET', input.otp);
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } }),
  ]);
}
