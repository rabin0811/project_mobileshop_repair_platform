import type { ApiErrorBody } from '@mobileshop/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
const TOKEN_KEY = 'mfp_access';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** Fetch helper that unwraps the `{ data }` envelope, attaches the admin token, normalizes errors. */
export async function api<T>(path: string, init: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Session expired → drop the token; the route guard redirects to /login.
    clearToken();
  }

  if (!res.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body
    }
    throw new ApiClientError(
      res.status,
      errorBody?.error?.code ?? 'UNKNOWN',
      errorBody?.error?.message ?? res.statusText,
      errorBody?.error?.details,
    );
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}
