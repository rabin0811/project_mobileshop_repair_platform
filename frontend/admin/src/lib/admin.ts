import type { PaginationMeta } from '@mobileshop/shared';
import { ApiClientError, clearToken, getToken } from './api';
import type { BookingRow } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface BookingListResult {
  items: BookingRow[];
  meta: PaginationMeta;
}

/**
 * Fetch the paginated booking list. The `api()` helper unwraps `{ data }` and
 * drops the `meta` envelope, so the list query needs its own fetch that keeps it.
 */
export async function fetchBookings(params: BookingListParams = {}): Promise<BookingListResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const query = qs.toString();

  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}/admin/bookings${query ? `?${query}` : ''}`, {
    headers,
    credentials: 'include',
  });

  if (res.status === 401) clearToken();

  if (!res.ok) {
    throw new ApiClientError(res.status, 'UNKNOWN', res.statusText || 'Failed to load bookings');
  }

  const json = (await res.json()) as { data: BookingRow[]; meta: PaginationMeta };
  return { items: json.data, meta: json.meta };
}

/** Localized date + time for the admin console. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
