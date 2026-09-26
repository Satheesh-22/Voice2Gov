// src/middleware/upload.js
// Multer configuration for complaint attachments (images, audio, video)

const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_TYPES = {
  'image/jpeg': 'image',
  'image/png':  'image',
  'image/webp': 'image',
  'image/gif':  'image',
  'audio/mpeg': 'audio',
  'audio/wav':  'audio',
  'audio/webm': 'audio',
  'audio/ogg':  'audio',
  'video/mp4':  'video',
  'video/webm': 'video',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024,
    files: 5,
  },
});

// Helper: annotate uploaded files with their type (image/audio/video)
const annotateFileType = (files = []) =>
  files.map((f) => ({
    filename:     f.filename,
    originalName: f.originalname,
    mimetype:     f.mimetype,
    size:         f.size,
    path:         f.path,
    type:         ALLOWED_TYPES[f.mimetype] || 'document',
  }));

module.exports = { upload, annotateFileType };
