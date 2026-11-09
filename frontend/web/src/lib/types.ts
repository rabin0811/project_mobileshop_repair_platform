import type { BookingStatus, PriceModel, RepairStage, ServiceCategory } from '@mobileshop/shared';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { models: number };
}

export interface DeviceModel {
  id: string;
  name: string;
  slug: string;
  releaseYear: number | null;
  imageUrl: string | null;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  category: ServiceCategory;
  estTimeMin: number;
  warrantyDays: number | null;
  priceModel: PriceModel;
  startingPrice: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  fromPrice: number;
}

export interface EstimateItemService {
  id: string;
  name: string;
  slug: string;
  estTimeMin: number;
  warrantyDays: number | null;
}

export interface EstimateItem {
  service: EstimateItemService;
  quote: number;
  partsCost: number;
  isFromPrice: boolean;
}

export interface EstimateResponse {
  brand: { id: string; name: string };
  model: { id: string; name: string };
  items: EstimateItem[];
  total: number;
  isEstimateOnly: boolean;
}

export interface BookingService {
  service: EstimateItemService;
  quotedPrice: number;
  isPrimary: boolean;
}

export interface BookingEvent {
  id: string;
  actorType: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  status: BookingStatus;
  repairStage: RepairStage | null;
  branch: { id: string; name: string };
  brand: { id: string; name: string } | null;
  model: { id: string; name: string } | null;
  services: BookingService[];
  events: BookingEvent[];
  scheduledAt: string;
  timeSlot: string | null;
  estimatedCost: number;
  problemDescription: string | null;
  images: string[];
  guestName: string | null;
  createdAt: string;
}

export interface TrackResponse {
  id: string;
  bookingRef: string;
  status: BookingStatus;
  repairStage: RepairStage | null;
  branch: { id: string; name: string };
  brand: { id: string; name: string } | null;
  model: { id: string; name: string } | null;
  services: BookingService[];
  events: BookingEvent[];
  scheduledAt: string;
  estimatedCost: number;
  problemDescription: string | null;
  images: string[];
}

export type BusinessHours = Record<string, [string, string] | null>;

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  mapsUrl: string | null;
  timezone: string | null;
  businessHours: BusinessHours;
}
