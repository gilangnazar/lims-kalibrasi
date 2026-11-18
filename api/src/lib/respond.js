// Every response uses the same body: { status, error, message, data?, meta? }
function send(res, status, message, data, meta) {
  const body = { status, error: false, message };
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

module.exports = {
  ok: (res, data, message = 'OK', meta) => send(res, 200, message, data, meta),
  created: (res, data, message = 'Data berhasil dibuat') => send(res, 201, message, data),
  list: (res, { data, meta }) => send(res, 200, 'OK', data, meta)
};
