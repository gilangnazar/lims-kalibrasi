const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const db = require('../db');
const AppError = require('./AppError');

const MB = 1024 * 1024;

// Allow-lists per kind of upload: extension and MIME type must both match.
const TYPES = {
  image: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' },
  document: { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
};

/**
 * multer middleware for one form field. upload({ field: 'file', types: 'document', maxCount: 1 })
 * Files go to UPLOAD_DIR/<yyyy>/<mm>/<random>.<ext>; the original name is kept in the DB only.
 */
function upload({ field = 'file', types = 'document', maxCount = 1, maxSizeMb = 10 }) {
  const allowed = TYPES[types];
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const now = new Date();
      const dir = path.join(env.uploadDir, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  });
  const handler = multer({
    storage,
    limits: { fileSize: maxSizeMb * MB, files: maxCount },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed[ext] && allowed[ext] === file.mimetype) return cb(null, true);
      cb(AppError.badRequest(`Jenis file tidak diizinkan (${Object.keys(allowed).join(', ')})`));
    }
  }).array(field, maxCount);

  // Turn multer's own errors (too large, too many) into friendly 400s.
  return (req, res, next) =>
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      const messages = { LIMIT_FILE_SIZE: `Ukuran file maksimal ${maxSizeMb} MB`, LIMIT_FILE_COUNT: `Maksimal ${maxCount} file` };
      next(AppError.badRequest(messages[err.code] ?? 'Upload gagal'));
    });
}

/** Saves uploaded files as attachments rows; returns their ids. */
async function saveAttachments(files, { entity, entityId, kind, userId }, conn = db) {
  const ids = [];
  for (const file of files ?? []) {
    const [id] = await conn('attachments').insert({
      entity,
      entity_id: entityId,
      kind,
      path: path.relative(env.uploadDir, file.path).split(path.sep).join('/'),
      original_name: file.originalname.slice(0, 255),
      mime: file.mimetype,
      size: file.size,
      uploaded_by: userId
    });
    ids.push(id);
  }
  return ids;
}

/** Removes files from disk (e.g. after a failed request). Errors are ignored. */
function discardFiles(files) {
  for (const file of files ?? []) fs.rm(file.path, { force: true }, () => {});
}

const absolutePath = (attachment) => path.join(env.uploadDir, attachment.path);

module.exports = { upload, saveAttachments, discardFiles, absolutePath };
