import { ApiResponse, PublicUserDto } from '@navrix/types';
import { useUiStore } from '../store/ui-store';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ClientApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function tryRefreshSession(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<{
      accessToken: string;
      user: PublicUserDto;
    }>;
    if (json.success && json.data.accessToken) {
      useUiStore
        .getState()
        .setSession(json.data.accessToken, json.data.user);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const store = useUiStore.getState();
  const headers = new Headers(options.headers || {});
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (store.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${store.accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retryOn401 && !path.startsWith('/auth/login')) {
    const refreshedToken = await tryRefreshSession();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      return apiRequest<T>(path, { ...options, headers }, false);
    }
  }

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ClientApiError(
      'NETWORK_ERROR',
      'Unable to parse server response. Check API connectivity.',
      res.status,
    );
  }

  if (!res.ok || !body.success) {
    const errPayload = !body.success
      ? body.error
      : { code: 'REQUEST_FAILED', message: 'Request failed.' };
    throw new ClientApiError(errPayload.code, errPayload.message, res.status);
  }

  return body.data;
}

