import type { BookingStatus, PaymentStatus, RepairStage, UserRole } from '@mobileshop/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface TopService {
  serviceId: string;
  name: string;
  count: number;
}

export interface AnalyticsOverview {
  bookingsToday: number;
  activeRepairs: number;
  monthRevenue: number;
  pendingReviews: number;
  topServices: TopService[];
}

interface NamedRef {
  id: string;
  name: string;
}

export interface BookingRow {
  id: string;
  bookingRef: string;
  status: BookingStatus;
  repairStage: RepairStage | null;
  brand: NamedRef | null;
  model: NamedRef | null;
  customer: { id: string; user: { name: string; email: string } } | null;
  guestName: string | null;
  scheduledAt: string;
  timeSlot: string | null;
  estimatedCost: number;
  services: { service: { id: string; name: string; slug: string } }[];
}

export interface BookingEvent {
  actorType: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
}

export interface BookingDetailService {
  quotedPrice: number;
  isPrimary: boolean;
  service: {
    id: string;
    name: string;
    slug: string;
    estTimeMin: number | null;
    warrantyDays: number | null;
  };
}

export interface BookingDetail {
  id: string;
  bookingRef: string;
  status: BookingStatus;
  repairStage: RepairStage | null;
  paymentStatus: PaymentStatus;
  branch: NamedRef | null;
  brand: NamedRef | null;
  model: NamedRef | null;
  customer: {
    id: string;
    user: { id: string; name: string; email: string; phone: string | null };
  } | null;
  technician: { id: string; user: { id: string; name: string } } | null;
  services: BookingDetailService[];
  events: BookingEvent[];
  invoice: { id: string; invoiceNo: string; total: number; status: string } | null;
  scheduledAt: string;
  timeSlot: string | null;
  estimatedCost: number;
  problemDescription: string | null;
  images: string[];
  deviceImei: string | null;
  deviceSerial: string | null;
  guestName: string | null;
  notes: string | null;
  isWalkIn: boolean;
  createdAt: string;
}
