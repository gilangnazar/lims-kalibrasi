import { can } from 'config/permissions';

const user = { permissions: ['customers:view', 'customers:add', 'methods:view'] };

describe('can()', () => {
  it.each([
    ['customers', 'view', true],
    ['customers', 'add', true],
    ['customers', 'delete', false],
    ['methods', undefined, true], // action defaults to view
    ['users', 'view', false]
  ])('%s:%s → %s', (menu, action, expected) => {
    expect(can(user, menu, action)).toBe(expected);
  });

  it('denies when there is no user or no permissions', () => {
    expect(can(null, 'customers')).toBe(false);
    expect(can({}, 'customers')).toBe(false);
  });
});
