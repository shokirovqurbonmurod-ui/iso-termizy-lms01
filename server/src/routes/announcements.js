// E'lon markazi — umumiy CRUD jadval o'rniga: nishonlash (barcha/guruh/kurs), muhimlik va
// har bir foydalanuvchi uchun o'qilgan/o'qilmagan holatini kuzatadi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const ANNOUNCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager', 'marketing', 'smm'];

function myStudent(req) {
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

// O'quvchining guruhi bog'langan kurs nomi — "kursga e'lon" shu nom bo'yicha moslashtiriladi.
function courseNameFor(student) {
  const group = store.all('groups').find((g) => g.name === student.group_name);
  if (!group) return null;
  const course = store.all('courses').find((c) => String(c.id) === String(group.course_id));
  return course?.name || null;
}

// Xodimlar hammasini ko'radi (boshqarish uchun); o'quvchi/ota-ona faqat o'ziga tegishlilarini —
// "barcha", o'z guruhi yoki o'z kursi bo'yicha.
function visibleTo(a, req) {
  if (ANNOUNCE_ROLES.includes(req.user.role) || !['student', 'parent'].includes(req.user.role)) return true;
  if (!a.target_type || a.target_type === 'all') return true;
  const student = myStudent(req);
  if (!student) return a.target_type === 'all';
  if (a.target_type === 'group') return student.group_name === a.target_value;
  if (a.target_type === 'course') return courseNameFor(student) === a.target_value;
  return true;
}

r.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  const rows = store.list('announcements', { q: req.query.q, limit }).filter((a) => visibleTo(a, req));
  const myReads = new Set(store.where('announcement_reads', (rr) => rr.user_name === req.user.name).map((rr) => String(rr.announcement_id)));
  res.json(rows.map((a) => ({ ...a, read: myReads.has(String(a.id)) })));
});

r.get('/:id', (req, res) => {
  const row = store.get('announcements', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  res.json(row);
});

r.post('/', (req, res) => {
  if (!ANNOUNCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { title, body, type, date, target_type, target_value, priority } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Sarlavha kerak.' });
  const created = store.insert('announcements', {
    title: title.trim(), body: body || '', author: req.user.name, type: type || "E'lon",
    date: date || new Date().toISOString().slice(0, 10),
    target_type: target_type || 'all', target_value: target_value || '', priority: priority || 'normal',
  });
  logAudit(req.user.name, 'create announcements', `#${created.id}`);
  res.status(201).json(created);
});

r.put('/:id', (req, res) => {
  if (!ANNOUNCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { title, body, type, date, target_type, target_value, priority } = req.body || {};
  const patch = {};
  if (title !== undefined) patch.title = title;
  if (body !== undefined) patch.body = body;
  if (type !== undefined) patch.type = type;
  if (date !== undefined) patch.date = date;
  if (target_type !== undefined) patch.target_type = target_type;
  if (target_value !== undefined) patch.target_value = target_value;
  if (priority !== undefined) patch.priority = priority;
  const updated = store.update('announcements', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Topilmadi' });
  logAudit(req.user.name, 'update announcements', `#${req.params.id}`);
  res.json(updated);
});

r.delete('/:id', (req, res) => {
  if (!ANNOUNCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  store.remove('announcements', req.params.id);
  logAudit(req.user.name, 'delete announcements', `#${req.params.id}`);
  res.json({ ok: true });
});

// O'qilgan deb belgilash — bir foydalanuvchi bitta e'lonni faqat bir marta "o'qigan" hisoblanadi.
r.post('/:id/read', (req, res) => {
  const exists = store.where('announcement_reads', (rr) => String(rr.announcement_id) === req.params.id && rr.user_name === req.user.name)[0];
  if (!exists) {
    store.insert('announcement_reads', {
      announcement_id: req.params.id, user_name: req.user.name,
      read_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  }
  res.json({ ok: true });
});

// Xodimlar uchun — shu e'lonni kimlar o'qigani (sana/vaqt bilan).
r.get('/:id/reads', (req, res) => {
  if (!ANNOUNCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json(store.where('announcement_reads', (rr) => String(rr.announcement_id) === req.params.id));
});

export default r;
