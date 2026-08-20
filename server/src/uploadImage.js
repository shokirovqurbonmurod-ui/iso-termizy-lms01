import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Kamera "data:image/jpeg;base64,..." kadrini diskka yozadi — kirish/chiqish va xavfsizlik suratlari uchun.
export function saveBase64Image(dataUrl, subdir) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const dir = path.join(UPLOAD_DIR, subdir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, Buffer.from(m[2], 'base64'));
  return { filePath, url: `/uploads/${subdir}/${filename}` };
}
