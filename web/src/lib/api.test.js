import { api, ApiError, setUnauthorizedHandler, tokenStore } from 'lib/api';

function mockFetch(status, body) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStore.clear();
    setUnauthorizedHandler(() => {});
  });

  it('sends the bearer token and drops empty query params', async () => {
    tokenStore.set('abc');
    const fetchMock = mockFetch(200, { data: [] });

    await api.get('/customers', { page: 2, search: '' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/customers\?page=2$/);
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('throws ApiError with the server message and field details', async () => {
    mockFetch(400, { message: 'Validasi gagal', details: [{ field: 'email', message: 'Email tidak valid' }] });

    const error = await api.post('/customers', {}).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.details[0].field).toBe('email');
  });

  it('calls the unauthorized handler on 401 only when a token was sent', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    mockFetch(401, { message: 'Username atau password salah' });
    await api.post('/auth/login', {}).catch(() => {});
    expect(handler).not.toHaveBeenCalled();

    tokenStore.set('expired');
    await api.get('/auth/me').catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports network failures in Indonesian', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/health')).rejects.toMatchObject({ status: 0, message: 'Tidak dapat terhubung ke server' });
  });
});
