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

async function send(path, { method = 'GET', body, query, raw = false } = {}) {
  const token = tokenStore.get();
  const headers = { Accept: raw ? '*/*' : 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'; // FormData sets its own boundary
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: body === undefined || isForm ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server');
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    // Only a request that carried a token means "session expired"; a failed login is just a 401.
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, payload.message || `Permintaan gagal (${res.status})`, payload.details);
  }
  return res;
}

/** Returns the parsed body { status, error, message, data?, meta? }; throws ApiError on failure. */
export async function apiRequest(path, options = {}) {
  const res = await send(path, options);
  return res.json().catch(() => ({}));
}

export const api = {
  get: (path, query) => apiRequest(path, { query }),
  post: (path, body = {}) => apiRequest(path, { method: 'POST', body }),
  put: (path, body = {}) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
  /** multipart/form-data (file uploads): api.postForm('/orders/1/po', formData). */
  postForm: (path, formData) => apiRequest(path, { method: 'POST', body: formData }),
  /** A file (PDF, image) as a Blob, sent with the login token. */
  blob: async (path) => (await send(path, { raw: true })).blob()
};

/**
 * Opens a protected file (attachment, PDF) in a new tab. The tab opens right away (inside the click, so
 * pop-up blockers allow it) and shows the file once it has downloaded with the login token.
 */
export async function openFile(path) {
  const tab = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await api.blob(path));
    if (tab) tab.location.href = url;
    else window.location.assign(url); // pop-ups fully blocked: open in this tab
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
