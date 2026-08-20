import jwt from 'jsonwebtoken';

// Login rate limiting — bir telefon raqamiga ketma-ket noto'g'ri urinishlar ko'p bo'lsa,
// hisobni vaqtincha bloklaydi (kuchli parol taxmin qilish hujumlariga qarshi).
const loginAttempts = {};
const MAX_ATTEMPTS = 7;
const LOCK_TIME = 10 * 60 * 1000; // 10 daqiqa

// lastPhoto — faqat qabulxona kiosk qurilmasidan (foydalanuvchi roziligi bilan yoqilgan) kelgan
// oxirgi noto'g'ri urinish kadri; hisob bloklanganda xavfsizlik xabariga shu kadr biriktiriladi.
export function checkRateLimit(phone, photo) {
  const key = String(phone);
  const now = Date.now();
  if (!loginAttempts[key]) loginAttempts[key] = { count: 0, blockedAt: null, lastPhoto: null };
  const rec = loginAttempts[key];
  if (photo) rec.lastPhoto = photo;

  // Blok muddati tugagan bo'lsa — hisoblagichni tozalash.
  if (rec.blockedAt && now - rec.blockedAt > LOCK_TIME) {
    rec.count = 0;
    rec.blockedAt = null;
    rec.lastPhoto = null;
  }
  if (rec.blockedAt) {
    const remaining = Math.ceil((LOCK_TIME - (now - rec.blockedAt)) / 60000);
    return { blocked: true, remaining, justBlocked: false };
  }

  rec.count++;
  if (rec.count > MAX_ATTEMPTS) {
    rec.blockedAt = now;
    return { blocked: true, remaining: Math.ceil(LOCK_TIME / 60000), justBlocked: true, photo: rec.lastPhoto };
  }
  return { blocked: false };
}

export function resetRateLimit(phone) {
  delete loginAttempts[String(phone)];
}
import { isAdmin } from './roles.js';

const SECRET = process.env.JWT_SECRET || 'iso-termizy-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone, name: user.full_name },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token topilmadi. Iltimos, qaytadan kiring.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessiya muddati tugagan. Qaytadan kiring.' });
  }
}

// Block write operations for read-only roles (students, parents).
export function canMutate(req, res, next) {
  const role = req.user?.role;
  // Chat va survey_votes ga hammaga ruxsat
  const openTables = ['/api/chat_messages', '/api/survey_votes'];
  if (openTables.some(t => req.baseUrl === t || req.originalUrl?.startsWith(t))) return next();
  const readOnly = ['student', 'parent', 'guest'];
  if (readOnly.includes(role) && !isAdmin(role)) {
    return res.status(403).json({ error: 'Bu amal uchun ruxsatingiz yo\'q.' });
  }
  next();
}
