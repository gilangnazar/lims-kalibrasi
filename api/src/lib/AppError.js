class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Permintaan tidak valid', details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Tidak terautentikasi') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Anda tidak memiliki akses') {
    return new AppError(403, message);
  }

  static notFound(message = 'Data tidak ditemukan') {
    return new AppError(404, message);
  }

  static conflict(message = 'Data sudah ada') {
    return new AppError(409, message);
  }
}

module.exports = AppError;
