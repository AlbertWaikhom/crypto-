import { ApiResponse, isAdminRole, PublicUserDto } from '@navrix/types';
import { useAdminStore } from '../store/admin-store';

export const ADMIN_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class AdminApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function tryRefreshAdmin(): Promise<string | null> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/auth/refresh`, {
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
    if (json.success && isAdminRole(json.data.user.role)) {
      useAdminStore
        .getState()
        .setAdminSession(json.data.accessToken, json.data.user);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function adminApi<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const store = useAdminStore.getState();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (store.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${store.accessToken}`);
  }

  const res = await fetch(`${ADMIN_API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/login')) {
    const nextToken = await tryRefreshAdmin();
    if (nextToken) {
      headers.set('Authorization', `Bearer ${nextToken}`);
      return adminApi<T>(path, { ...options, headers }, false);
    }
  }

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new AdminApiError(
      'NETWORK_ERROR',
      'Could not reach NAVRIX API server.',
      res.status,
    );
  }

  if (!res.ok || !body.success) {
    const err = !body.success
      ? body.error
      : { code: 'ADMIN_REQUEST_FAILED', message: 'Admin operation failed.' };
    throw new AdminApiError(err.code, err.message, res.status);
  }

  return body.data;
}

export async function fetchAuthorizedScreenshotObjectUrl(
  depositUid: string,
): Promise<string | null> {
  const token = useAdminStore.getState().accessToken;
  if (!token) return null;
  const res = await fetch(`${ADMIN_API_URL}/deposits/${depositUid}/screenshot`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

