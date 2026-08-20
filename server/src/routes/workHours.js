import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);

// Kunlik ish vaqti jurnali — xodim faqat o'zinikini, admin hammasini ko'radi.
r.get('/', (req, res) => {
  let rows = store.all('work_hours');
  if (!isAdmin(req.user.role)) rows = rows.filter((w) => w.staff === req.user.name);
  else if (req.query.staff) rows = rows.filter((w) => w.staff === req.query.staff);
  if (req.query.from) rows = rows.filter((w) => w.date >= req.query.from);
  if (req.query.to) rows = rows.filter((w) => w.date <= req.query.to);
  res.json(rows);
});

r.get('/today', (req, res) => {
  const row = store.where('work_hours', (w) => w.staff === req.user.name && w.date === today())[0] || null;
  res.json(row);
});

r.post('/clock-in', (req, res) => {
  const existing = store.where('work_hours', (w) => w.staff === req.user.name && w.date === today())[0];
  if (existing) return res.json(existing);
  const row = store.insert('work_hours', {
    staff: req.user.name, role: req.user.role, date: today(), clock_in: now(), clock_out: null, hours: null,
  });
  logAudit(req.user.name, 'clock in', row.date);
  res.json(row);
});

r.post('/clock-out', (req, res) => {
  const row = store.where('work_hours', (w) => w.staff === req.user.name && w.date === today())[0];
  if (!row) return res.status(400).json({ error: "Avval ishga kelganingizni belgilang." });
  if (row.clock_out) return res.json(row);
  const outTime = now();
  const hours = Math.round(((new Date(outTime.replace(' ', 'T')) - new Date(row.clock_in.replace(' ', 'T'))) / 3600000) * 100) / 100;
  const updated = store.update('work_hours', row.id, { clock_out: outTime, hours });
  logAudit(req.user.name, 'clock out', `${row.date} (${hours} soat)`);
  res.json(updated);
});

r.delete('/:id', (req, res) => {
  const row = store.get('work_hours', req.params.id);
  if (row && row.staff !== req.user.name && !isAdmin(req.user.role)) {
    return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  }
  store.remove('work_hours', req.params.id);
  res.json({ ok: true });
});

export default r;
