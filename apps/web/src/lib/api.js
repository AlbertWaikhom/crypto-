import { useUiStore } from '../store/ui-store';

export const API_BASE_URL = '/api/v1';

export class ClientApiError extends Error {
  code;
  status;
  details;
  constructor(code, message, status, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function tryRefreshSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data.accessToken) {
      useUiStore.getState().setSession(json.data.accessToken, json.data.user);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiRequest(path, options = {}, retryOn401 = true, retryCount = 0) {
  const store = useUiStore.getState();
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token =
    store.accessToken ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('navrix_access_token') ||
        sessionStorage.getItem('navrix_admin_token')
      : null);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (netErr) {
    // Retry once on network disconnect / transient socket drop
    if (retryCount < 1) {
      await sleep(300);
      return apiRequest(path, options, retryOn401, retryCount + 1);
    }
    throw new ClientApiError(
      'NETWORK_DISCONNECTED',
      'Unable to connect to service. Please check your internet connection.',
      0,
    );
  }

  // Handle 401 Unauthorized via session token refresh (skip on public auth endpoints)
  const isPublicAuthCall =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/verify') ||
    path.startsWith('/auth/google') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password') ||
    path.startsWith('/auth/refresh');

  if (res.status === 401 && retryOn401 && !isPublicAuthCall) {
    const refreshedToken = await tryRefreshSession();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      return apiRequest(path, { ...options, headers }, false, retryCount);
    }
  }

  // Transient 5xx error retry (handles brief DB pool queue spikes)
  if (res.status >= 500 && retryCount < 1 && options.method !== 'POST') {
    await sleep(350);
    return apiRequest(path, options, retryOn401, retryCount + 1);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    if (res.status >= 500 && retryCount < 1) {
      await sleep(350);
      return apiRequest(path, options, retryOn401, retryCount + 1);
    }
    throw new ClientApiError(
      'SERVER_BUSY',
      'Service is momentarily busy. Please refresh the page.',
      res.status,
    );
  }

  if (!res.ok || !body.success) {
    const errPayload = !body.success
      ? body.error
      : { code: 'REQUEST_FAILED', message: 'Request failed.' };
    throw new ClientApiError(
      errPayload.code,
      errPayload.message,
      res.status,
      errPayload.details || null,
    );
  }

  return body.data;
}
