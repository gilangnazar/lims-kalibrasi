const AppError = require('../lib/AppError');
const env = require('../config/env');

function notFound(req) {
  throw AppError.notFound(`Endpoint ${req.method} ${req.path} tidak ditemukan`);
}

// MySQL error codes that are the client's fault, mapped to friendly responses.
const MYSQL_ERRORS = {
  ER_DUP_ENTRY: [409, 'Data sudah ada'],
  ER_ROW_IS_REFERENCED_2: [409, 'Data masih digunakan oleh data lain'],
  ER_NO_REFERENCED_ROW_2: [400, 'Data terkait tidak ditemukan']
};

// Express recognises error handlers by their 4 parameters, so _next must stay.
function errorHandler(err, _req, res, _next) {
  let status = 500;
  let message = 'Server error';
  let details;

  if (err instanceof AppError) {
    ({ status, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    [status, message] = [400, 'Body JSON tidak valid'];
  } else if (MYSQL_ERRORS[err.code]) {
    [status, message] = MYSQL_ERRORS[err.code];
  }

  if (status >= 500 && !env.isTest) console.error(err);

  const body = { status, error: true, message };
  if (details) body.details = details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
