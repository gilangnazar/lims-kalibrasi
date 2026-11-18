const AppError = require('../lib/AppError');

// Parses body/query/params with zod schemas. Parsed values land in req.valid.{body,query,params}
// (Express 5 makes req.query read-only, so we never overwrite the originals).
function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
        throw AppError.badRequest('Validasi gagal', details);
      }
      req.valid[part] = result.data;
    }
    next();
  };
}

module.exports = validate;
