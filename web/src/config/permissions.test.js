import { can, ROLES } from 'config/permissions';

describe('can()', () => {
  it.each([
    [ROLES.ADMIN, 'users.write', true],
    [ROLES.TEKNISI, 'users.read', false],
    [ROLES.FINANCE, 'customers.read', true],
    [ROLES.FINANCE, 'methods.read', false],
    [ROLES.TEKNISI, 'methods.read', true],
    [ROLES.TEKNISI, 'methods.write', false],
    [ROLES.CUSTOMER, 'customers.read', false]
  ])('%s → %s = %s', (role, permission, expected) => {
    expect(can({ role }, permission)).toBe(expected);
  });

  it('denies when there is no user or the permission is unknown', () => {
    expect(can(null, 'customers.read')).toBe(false);
    expect(can({ role: ROLES.ADMIN }, 'does.not.exist')).toBe(false);
  });
});
