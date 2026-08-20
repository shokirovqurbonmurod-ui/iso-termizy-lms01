import express from 'express';
import { authRequired } from '../auth.js';
import { store, logAudit } from '../db.js';
import { notifyForStudent, notifyGroupTopic, notifySecurityOwners } from '../telegram.js';
import { saveBase64Image } from '../uploadImage.js';

const r = express.Router();
r.use(authRequired);

// O'quvchi/ota-ona kamerani boshqarmaydi — faqat xodimlar (reception, o'qituvchi, admin va h.k.).
function staffOnly(req, res, next) {
  if (['student', 'parent', 'guest'].includes(req.user.role)) {
    return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  }
  next();
}
r.use(staffOnly);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);

// Yuz ro'yxatga olingan o'quvchilar (deskriptorlar bilan) — mijozda taqqoslash uchun kerak.
r.get('/enrollments', (_req, res) => {
  res.json(store.all('face_enrollments'));
});

// Bitta o'quvchi uchun yuz deskriptorini saqlash — qayta yozilsa eskisi almashtiriladi.
r.post('/enrollments', (req, res) => {
  const { student_id, student_name, descriptor } = req.body || {};
  if (!student_id || !student_name || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot — o'quvchi va yuz deskriptori kerak." });
  }
  const existing = store.where('face_enrollments', (e) => e.student_id === student_id);
  for (const e of existing) store.remove('face_enrollments', e.id);
  const row = store.insert('face_enrollments', {
    student_id, student_name, descriptor,
    enrolled_by: req.user.name, at: now(),
  });
  res.json(row);
});

r.delete('/enrollments/:id', (req, res) => {
  store.remove('face_enrollments', req.params.id);
  res.json({ ok: true });
});

// Kamera orqali tanilgan o'quvchini kirish jurnaliga yozadi — kuniga bitta yozuv (spam bo'lmasin uchun).
r.post('/checkin', (req, res) => {
  const { student_id, student_name, distance, photo } = req.body || {};
  if (!student_id || !student_name) return res.status(400).json({ error: "O'quvchi aniqlanmadi." });

  const already = store.where('face_checkins', (c) => c.student_id === student_id && c.date === today())[0];
  if (already) return res.json({ ...already, duplicate: true });

  const saved = photo ? saveBase64Image(photo, 'checkins') : null;
  const student = store.get('students', student_id);
  const row = store.insert('face_checkins', {
    student_id, student_name,
    group_name: student?.group_name || '',
    distance: typeof distance === 'number' ? Math.round(distance * 1000) / 1000 : null,
    date: today(), at: now(), left_at: null,
    photo_in: saved?.url || null,
  });
  const text = `✅ ${student_name} — ${row.group_name || 'markazga'} bugun soat ${row.at.slice(11, 16)} da keldi.`;
  notifyForStudent(student_id, text, saved?.filePath).catch(() => {});
  notifyGroupTopic(row.group_name, text).catch(() => {});
  res.json(row);
});

// Kamera "Chiqish" rejimida tanilgan o'quvchini shu kunlik yozuvida "ketgan vaqti"ni belgilaydi.
r.post('/checkout', (req, res) => {
  const { student_id, student_name, photo } = req.body || {};
  if (!student_id) return res.status(400).json({ error: "O'quvchi aniqlanmadi." });

  const row = store.where('face_checkins', (c) => c.student_id === student_id && c.date === today())[0];
  if (!row) return res.status(404).json({ error: `${student_name || "O'quvchi"} uchun bugun kirish qayd etilmagan.` });
  if (row.left_at) return res.json({ ...row, duplicate: true });

  const saved = photo ? saveBase64Image(photo, 'checkins') : null;
  const updated = store.update('face_checkins', row.id, { left_at: now(), photo_out: saved?.url || null });
  const text = `👋 ${updated.student_name} — bugun soat ${updated.left_at.slice(11, 16)} da ketdi.`;
  notifyForStudent(student_id, text, saved?.filePath).catch(() => {});
  notifyGroupTopic(updated.group_name, text).catch(() => {});
  res.json(updated);
});

// Kamera "kirish" rejimida ro'yxatga olinmagan (begona) yuzni aniqlasa — kadr saqlanadi
// va xavfsizlik ogohlantirishlariga obuna bo'lgan hisoblarga (Bot sahifasi) yuboriladi.
r.post('/unknown', (req, res) => {
  const { photo } = req.body || {};
  const saved = photo ? saveBase64Image(photo, 'security') : null;
  if (!saved) return res.status(400).json({ error: 'Rasm kerak.' });
  const row = store.insert('security_snapshots', {
    image_url: saved.url, date: today(), at: now(), reported_by: req.user.name,
  });
  notifySecurityOwners(`🚨 Kamera tanilmagan (begona) yuzni aniqladi — ${row.at}. Kimligini tekshiring.`, saved.filePath).catch(() => {});
  store.insert('notifications', {
    title: 'Begona yuz aniqlandi', body: `Kamera ${row.at} da tanilmagan yuzni qayd etdi.`,
    type: 'security', target_role: 'super_admin', read: 0, date: today(),
  });
  logAudit(req.user.name, 'security_snapshot', row.at);
  res.json(row);
});

// Xavfsizlik kadrlari jurnali — Telegram yetib bormagan taqdirda ham platforma ichida ko'rish uchun.
r.get('/unknown', (req, res) => {
  res.json(store.all('security_snapshots').slice(0, 200));
});

r.delete('/unknown/:id', (req, res) => {
  store.remove('security_snapshots', req.params.id);
  res.json({ ok: true });
});

// Bugungi kirish/chiqish jurnali — kamera sahifasida jonli ro'yxat sifatida ko'rsatiladi.
r.get('/checkins', (req, res) => {
  const date = req.query.date || today();
  const rows = store.where('face_checkins', (c) => c.date === date).sort((a, b) => b.id - a.id);
  res.json(rows);
});

// Xato/sinov yozuvini o'chirish uchun.
r.delete('/checkins/:id', (req, res) => {
  store.remove('face_checkins', req.params.id);
  res.json({ ok: true });
});

export default r;
