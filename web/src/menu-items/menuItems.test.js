import { buildMenuItems } from 'menu-items';

describe('buildMenuItems', () => {
  it('maps the API tree to sidebar items, keeping labels and order', () => {
    const { items } = buildMenuItems([
      { code: 'administration', label: 'Admin Area', children: [{ code: 'users', label: 'Akun', path: '/users' }] },
      { code: 'master-data', label: 'Master Data', children: [{ code: 'methods', label: 'Metode', path: '/methods' }] }
    ]);
    expect(items.map((group) => group.title)).toEqual(['Admin Area', 'Master Data']);
    expect(items[0].children[0]).toMatchObject({ id: 'users', title: 'Akun', url: '/users', type: 'item' });
    expect(items[0].children[0].icon).toBeTruthy();
  });

  it('skips pages the web does not have yet and drops empty groups', () => {
    const { items } = buildMenuItems([
      { code: 'administration', label: 'Administrasi', children: [{ code: 'audit-trail', label: 'Audit Trail', path: '/audit-trail' }] }
    ]);
    expect(items).toEqual([]);
  });

  it('handles a user without menus', () => {
    expect(buildMenuItems(undefined).items).toEqual([]);
  });
});
