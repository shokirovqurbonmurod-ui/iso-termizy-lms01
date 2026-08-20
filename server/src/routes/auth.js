import express from 'express';
import bcrypt from 'bcryptjs';
import { store, logAudit } from '../db.js';
import { signToken, authRequired, checkRateLimit, resetRateLimit } from '../auth.js';
import { notifySecurityOwners } from '../telegram.js';
import { saveBase64Image } from '../uploadImage.js';

const r = express.Router();

// POST /api/auth/login  { phone, password, photo? }
// photo — faqat xodim tomonidan ataylab "qabulxona kiosk" deb belgilangan qurilmadan yuboriladi
// (client shu holatni o'zi tanlaydi, boshqa hech qanday qurilmada avtomatik yoqilmaydi).
r.post('/login', (req, res) => {
  let { phone, password, photo } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'Telefon va parolni kiriting' });
  phone = String(phone).replace(/\D/g, '');
  if (phone.length === 9) phone = '998' + phone;

  const limit = checkRateLimit(phone, photo);
  if (limit.blocked) {
    if (limit.justBlocked) {
      const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || "noma'lum";
      const saved = limit.photo ? saveBase64Image(limit.photo, 'security') : null;
      notifySecurityOwners(`🚨 Xavfsizlik ogohlantirishi: +${phone} raqamiga ketma-ket ko'p marta noto'g'ri parol kiritildi (IP: ${ip}). Hisob ${limit.remaining} daqiqaga bloklandi. Bu haqiqiy foydalanuvchi yoki hujum bo'lishi mumkin.`, saved?.filePath).catch(() => {});
      if (saved) store.insert('security_snapshots', { image_url: saved.url, date: new Date().toISOString().slice(0, 10), at: new Date().toISOString().slice(0, 19).replace('T', ' '), reported_by: `login kiosk (+${phone})` });
      store.insert('notifications', {
        title: 'Login bloklandi', body: `+${phone} raqamiga ko'p marta noto'g'ri parol kiritildi (IP: ${ip}).`,
        type: 'security', target_role: 'super_admin', read: 0, date: new Date().toISOString().slice(0, 10),
      });
    }
    return res.status(429).json({ error: `Juda ko'p noto'g'ri urinish. ${limit.remaining} daqiqadan keyin qayta urinib ko'ring.` });
  }

  const user = store.where('users', (u) => u.phone === phone)[0];
  if (!user || !user.active) return res.status(401).json({ error: 'Telefon yoki parol noto\'g\'ri' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Telefon yoki parol noto\'g\'ri' });

  resetRateLimit(phone);
  logAudit(user.full_name, 'login', user.role);
  const safe = { id: user.id, phone: user.phone, role: user.role, full_name: user.full_name, group_name: user.group_name, branch: user.branch };
  res.json({ token: signToken(user), user: safe });
});

// GET /api/auth/me
r.get('/me', authRequired, (req, res) => {
  const u = store.get('users', req.user.id);
  if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json({ id: u.id, phone: u.phone, role: u.role, full_name: u.full_name, group_name: u.group_name, branch: u.branch });
});

export default r;
