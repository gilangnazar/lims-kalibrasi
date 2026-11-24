const AppError = require('../lib/AppError');
const { MENU_BY_CODE } = require('../config/menus');

// Unknown menus or actions a menu doesn't allow fail when the route is defined (at boot).
function assertKnown(menu, action) {
  const entry = MENU_BY_CODE.get(menu);
  if (!entry) throw new Error(`requirePermission: unknown menu "${menu}" (see config/menus.js)`);
  if (!entry.actions.includes(action)) {
    throw new Error(`requirePermission: menu "${menu}" does not allow action "${action}"`);
  }
  return `${menu}:${action}`;
}

/** Usage: router.get('/', requirePermission('customers', 'view'), handler). Must run after `authenticate`. */
function requirePermission(menu, action) {
  const key = assertKnown(menu, action);
  const check = (req, _res, next) => {
    if (!req.user?.permissions?.has(key)) throw AppError.forbidden();
    next();
  };
  check.permission = key; // read by the route-coverage test
  return check;
}

/**
 * Passes when the user holds at least one of the "menu:action" pairs — for shared routes such as the
 * order detail, which the order, Kaji Ulang, intake and assignment pages all open.
 */
function requireAnyPermission(...pairs) {
  const keys = pairs.map((pair) => assertKnown(...pair.split(':')));
  const check = (req, _res, next) => {
    if (!keys.some((key) => req.user?.permissions?.has(key))) throw AppError.forbidden();
    next();
  };
  check.permission = keys.join(' | ');
  return check;
}

module.exports = requirePermission;
module.exports.requireAnyPermission = requireAnyPermission;
