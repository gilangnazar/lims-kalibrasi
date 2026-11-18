const AppError = require('../lib/AppError');

// Usage: router.post('/', authorize(ROLES.ADMIN), handler). Must run after `authenticate`.
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

module.exports = authorize;
