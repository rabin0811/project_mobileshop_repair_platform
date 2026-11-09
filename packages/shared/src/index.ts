import { z } from 'zod';

/** Brand strings used across the public site, admin console, and API. */
export const APP_NAME = 'MobileFix Pro';
export const SHOP_NAME = 'MobileFix Pro';

export const USER_ROLES = ['CUSTOMER', 'TECHNICIAN', 'MANAGER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const REPAIR_STAGES = [
  'DEVICE_RECEIVED',
  'DIAGNOSING',
  'WAITING_PARTS',
  'REPAIRING',
  'QUALITY_CHECK',
  'COMPLETED',
  'READY_FOR_PICKUP',
  'DELIVERED',
] as const;
export type RepairStage = (typeof REPAIR_STAGES)[number];

export const PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SERVICE_CATEGORIES = [
  'SCREEN',
  'BATTERY',
  'CHARGING_PORT',
  'CAMERA',
  'SPEAKER',
  'MOTHERBOARD',
  'WATER_DAMAGE',
  'SOFTWARE',
  'UNLOCKING',
  'DATA_RECOVERY',
  'ACCESSORY',
  'OTHER',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const PRICE_MODELS = ['FIXED', 'FROM', 'RANGE'] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

export const REPAIR_STAGE_LABELS: Record<RepairStage, string> = {
  DEVICE_RECEIVED: 'Device received',
  DIAGNOSING: 'Diagnosing',
  WAITING_PARTS: 'Waiting for parts',
  REPAIRING: 'Repairing',
  QUALITY_CHECK: 'Quality check',
  COMPLETED: 'Repair complete',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERED: 'Delivered',
};

/**
 * Allowed forward transitions in the repair pipeline. `null` (not started)
 * is handled by the service layer as "DEVICE_RECEIVED is allowed".
 */
export const STAGE_TRANSITIONS: Record<RepairStage, readonly RepairStage[]> = {
  DEVICE_RECEIVED: ['DIAGNOSING'],
  DIAGNOSING: ['WAITING_PARTS', 'REPAIRING'],
  WAITING_PARTS: ['REPAIRING'],
  REPAIRING: ['WAITING_PARTS', 'QUALITY_CHECK'],
  QUALITY_CHECK: ['COMPLETED'],
  COMPLETED: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['DELIVERED'],
  DELIVERED: [],
};

export type Capability =
  | 'bookings:read'
  | 'bookings:write'
  | 'analytics:read'
  | 'catalog:read'
  | 'catalog:write'
  | 'customers:read'
  | 'customers:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'reviews:read'
  | 'reviews:write'
  | 'technicians:read'
  | 'technicians:write'
  | 'settings:read'
  | 'settings:write';

const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  CUSTOMER: [],
  TECHNICIAN: ['bookings:read', 'catalog:read'],
  MANAGER: [
    'bookings:read',
    'bookings:write',
    'analytics:read',
    'catalog:read',
    'catalog:write',
    'customers:read',
    'customers:write',
    'invoices:read',
    'invoices:write',
    'reviews:read',
    'reviews:write',
    'technicians:read',
    'technicians:write',
    'settings:read',
  ],
  ADMIN: [
    'bookings:read',
    'bookings:write',
    'analytics:read',
    'catalog:read',
    'catalog:write',
    'customers:read',
    'customers:write',
    'invoices:read',
    'invoices:write',
    'reviews:read',
    'reviews:write',
    'technicians:read',
    'technicians:write',
    'settings:read',
    'settings:write',
  ],
};

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

/** Standard API error codes used by the Express error handler. */
export const errorCode = {
  VALIDATION: 'VAL_001',
  UNAUTHORIZED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  FORBIDDEN: 'AUTH_003',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_IN_USE: 'AUTH_004',
  OTP_INVALID: 'AUTH_005',
  RATE_LIMITED: 'RATE_LIMITED',
  SLOT_TAKEN: 'BOOKING_001',
  ILLEGAL_TRANSITION: 'REPAIR_001',
  INTERNAL: 'INTERNAL',
} as const;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Money is stored as integer minor units (paise). */
export function formatMoney(minorUnits: number): string {
  const amount = (Number.isFinite(minorUnits) ? minorUnits : 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const emailSchema = z.string().trim().email('Enter a valid email address');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  phone: z.string().trim().max(20).optional(),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const customerDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailSchema,
  phone: z.string().trim().max(20).optional(),
});

export const createBookingSchema = z.object({
  branchId: z.string().min(1),
  brandId: z.string().min(1),
  modelId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1, 'Choose at least one service').max(10),
  scheduledAt: z.string().datetime({ offset: true }),
  timeSlot: z.string().trim().max(10).optional(),
  problemDescription: z.string().trim().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  deviceImei: z.string().trim().max(32).optional(),
  deviceSerial: z.string().trim().max(64).optional(),
  devicePassword: z.string().max(100).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
  customer: customerDetailsSchema.optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const estimateSchema = z.object({
  brandId: z.string().min(1),
  modelId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1).max(10),
});
