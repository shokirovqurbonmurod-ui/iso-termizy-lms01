import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';
import { notifyAll } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const thisMonth = () => new Date().toISOString().slice(0, 7);

// Berilgan oy (YYYY-MM) uchun xodimlar reytingi — coin, dars bahosi va ish soatlari asosida.
r.get('/ranking', (req, res) => {
  const month = req.query.month || thisMonth();
  const teachers = store.all('teachers');

  const coinsByTeacher = {};
  for (const c of store.all('teacher_coin_log')) {
    if (!c.at?.startsWith(month)) continue;
    coinsByTeacher[c.teacher] = (coinsByTeacher[c.teacher] || 0) + (Number(c.amount) || 0);
  }
  const ratingsByTeacher = {};
  for (const rt of store.all('lesson_ratings')) {
    if (!rt.date?.startsWith(month)) continue;
    if (!ratingsByTeacher[rt.teacher]) ratingsByTeacher[rt.teacher] = [];
    ratingsByTeacher[rt.teacher].push(Number(rt.score) || 0);
  }
  const hoursByStaff = {};
  for (const w of store.all('work_hours')) {
    if (!w.date?.startsWith(month)) continue;
    hoursByStaff[w.staff] = (hoursByStaff[w.staff] || 0) + (Number(w.hours) || 0);
  }

  const ranking = teachers.map((t) => {
    const coins = coinsByTeacher[t.full_name] || 0;
    const ratings = ratingsByTeacher[t.full_name] || [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const hours = hoursByStaff[t.full_name] || 0;
    // Ballar: coin (max~30% og'irlik), reyting (5 balldan 100 gacha), soatlar — sodda birlashtirilgan ko'rsatkich.
    const score = Math.round(coins * 0.5 + avgRating * 20 + hours * 0.5);
    return { teacher: t.full_name, coins, avgRating: Math.round(avgRating * 10) / 10, ratingCount: ratings.length, hours: Math.round(hours * 10) / 10, score };
  }).sort((a, b) => b.score - a.score);

  res.json({ month, ranking });
});

r.get('/history', (_req, res) => {
  res.json(store.all('employee_of_month'));
});

r.post('/announce', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { month, staff, note, score } = req.body || {};
  if (!month || !staff) return res.status(400).json({ error: "Oy va xodimni tanlang" });
  const existing = store.where('employee_of_month', (e) => e.month === month)[0];
  const payload = { month, staff, note: note || '', score: score ?? null, announced_by: req.user.name, at: now() };
  const row = existing ? store.update('employee_of_month', existing.id, payload) : store.insert('employee_of_month', payload);
  logAudit(req.user.name, 'employee of month', `${month}: ${staff}`);
  notifyAll(`🏆 ${month} oyining eng yaxshi xodimi — ${staff}! ${note ? note : "Tabriklaymiz!"}`).catch(() => {});
  res.json(row);
});

r.delete('/:id', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('employee_of_month', req.params.id);
  res.json({ ok: true });
});

export default r;
