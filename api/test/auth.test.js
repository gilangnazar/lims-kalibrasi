const { api, createUser, db, PASSWORD } = require('./helpers');

describe('auth', () => {
  it('logs in with valid credentials and never returns the password hash', async () => {
    const { user } = await createUser('Teknisi');
    const res = await api().post('/api/auth/login').send({ username: user.username, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user).toMatchObject({ username: user.username, roles: [{ name: 'Teknisi' }] });
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    const { user } = await createUser();
    const res = await api().post('/api/auth/login').send({ username: user.username, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(true);
  });

  it('rejects inactive users at login and on existing tokens', async () => {
    const { user, token } = await createUser('Admin', { is_active: false });
    expect((await api().post('/api/auth/login').send({ username: user.username, password: PASSWORD })).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('requires a token for protected routes', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/customers').set('Authorization', 'Bearer not-a-jwt')).status).toBe(401);
  });

  it('returns the current user from /me', async () => {
    const { user, token } = await createUser('Finance');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, roles: [{ name: 'Finance' }], permissions: [], menus: [] });
  });

  it('changes password only when the current password is correct', async () => {
    const { user, token } = await createUser();
    const auth = { Authorization: `Bearer ${token}` };

    const wrong = await api().post('/api/auth/change-password').set(auth).send({ current_password: 'nope', new_password: 'newpassword1' });
    expect(wrong.status).toBe(400);

    const ok = await api().post('/api/auth/change-password').set(auth).send({ current_password: PASSWORD, new_password: 'newpassword1' });
    expect(ok.status).toBe(200);

    const login = await api().post('/api/auth/login').send({ username: user.username, password: 'newpassword1' });
    expect(login.status).toBe(200);
  });

  it('writes an audit entry on login', async () => {
    const { user } = await createUser();
    await api().post('/api/auth/login').send({ username: user.username, password: PASSWORD });
    const entry = await db('audit_logs').where({ user_id: user.id, action: 'login' }).first();
    expect(entry).toBeTruthy();
  });
});
