const AppError = require('../lib/AppError');
const { MENU_BY_CODE } = require('../config/menus');

/**
 * Usage: router.get('/', requirePermission('customers', 'view'), handler). Must run after `authenticate`.
 * An unknown menu or an action the menu doesn't allow throws when the route is defined (at boot).
 */
function requirePermission(menu, action) {
  const entry = MENU_BY_CODE.get(menu);
  if (!entry) throw new Error(`requirePermission: unknown menu "${menu}" (see config/menus.js)`);
  if (!entry.actions.includes(action)) {
    throw new Error(`requirePermission: menu "${menu}" does not allow action "${action}"`);
  }

  const key = `${menu}:${action}`;
  const check = (req, _res, next) => {
    if (!req.user?.permissions?.has(key)) throw AppError.forbidden();
    next();
  };
  check.permission = key; // read by the route-coverage test
  return check;
}

module.exports = requirePermission;
