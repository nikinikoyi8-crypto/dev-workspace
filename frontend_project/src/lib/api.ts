import { env } from '@/lib/env';

type ApiValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiValidationErrors;
  readonly code?: string;

  constructor(message: string, status: number, errors: ApiValidationErrors = {}, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

function urlFor(path: string): string {
  const baseUrl = env.apiUrl.replace(/\/+$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchCsrfCookie(): Promise<void> {
  const response = await fetch(urlFor('/sanctum/csrf-cookie'), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new ApiError('Unable to initialize the CSRF session.', response.status);
}

function getXsrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='));
  if (!cookie) return undefined;
  const value = cookie.slice('XSRF-TOKEN='.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null) as {
    message?: string;
    errors?: ApiValidationErrors;
    code?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status}).`,
      response.status,
      response.status === 422 ? payload?.errors ?? {} : {},
      payload?.code,
    );
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const changesState = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (changesState) await fetchCsrfCookie();

  const send = () => {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    const xsrfToken = changesState ? getXsrfToken() : undefined;
    if (xsrfToken) headers.set('X-XSRF-TOKEN', xsrfToken);

    return fetch(urlFor(path), {
      ...options,
      method,
      credentials: 'include',
      headers,
    });
  };

  let response = await send();
  if (changesState && response.status === 419) {
    await fetchCsrfCookie();
    response = await send();
  }
  return parseResponse<T>(response);
}