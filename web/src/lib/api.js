// Single HTTP client for the LIMS API. Every request goes through apiRequest().
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // [{ field, message }] for validation errors
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

let onUnauthorized = () => {};
/** AuthContext registers its logout here so an expired token anywhere signs the user out. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function buildUrl(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

/** Returns the parsed body { status, error, message, data?, meta? }; throws ApiError on failure. */
export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  const token = tokenStore.get();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server');
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Only a request that carried a token means "session expired"; a failed login is just a 401.
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, payload.message || `Permintaan gagal (${res.status})`, payload.details);
  }
  return payload;
}

export const api = {
  get: (path, query) => apiRequest(path, { query }),
  post: (path, body = {}) => apiRequest(path, { method: 'POST', body }),
  put: (path, body = {}) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' })
};
