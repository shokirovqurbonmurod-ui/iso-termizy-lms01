import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRequired, canMutate } from '../auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Kitob fayllari (PDF, EPUB, Word, matn), hujjat suratlari (pasport/guvohnoma skani uchun rasm)
// va video darslar uchun video fayllar.
const ALLOWED_EXT = ['.pdf', '.epub', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov', '.avi'];
const ALLOWED_MIME = [
  'application/pdf', 'application/epub+zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9а-яА-Яʻʼ'’_\- ]/g, '').slice(0, 60);
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Ruxsat etilgan formatlar: PDF, EPUB, DOC, DOCX, TXT, JPG, PNG, WEBP, MP4, WEBM, MOV, AVI"));
  }
  cb(null, true);
}

// Video fayllar boshqa hujjatlarga qaraganda ancha katta bo'ladi — limit shunga moslashtirilgan.
const upload = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });

const r = express.Router();
r.use(authRequired);

r.post('/', canMutate, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fayl tanlanmagan' });
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
    });
  });
});

r.delete('/:filename', canMutate, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR)) return res.status(400).json({ error: "Noto'g'ri fayl nomi" });
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

export default r;
