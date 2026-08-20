import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const COLUMNS = ['student', 'prize', 'coins', 'date'];

r.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  res.json(store.list('lucky_wheel_log', { q: req.query.q, limit }));
});

r.get('/:id', (req, res) => {
  const row = store.get('lucky_wheel_log', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  res.json(row);
});

// Oddiy CRUD create'dan farqi: g'ildirak aylantirilganda ota-onaga Telegram orqali xabar boradi.
r.post('/', canMutate, (req, res) => {
  const row = {};
  for (const c of COLUMNS) row[c] = (c in req.body) ? req.body[c] : '';
  const created = store.insert('lucky_wheel_log', row);
  logAudit(req.user.name, 'create lucky_wheel_log', `#${created.id}`);

  const student = store.all('students').find((s) => s.full_name === created.student);
  if (student) {
    notifyForStudent(student.id, `🎉 Tabriklaymiz! Farzandingiz ${created.student} "Omad g'ildiragi"ni aylantirib ${created.prize} yutdi!`).catch(() => {});
  }

  res.status(201).json(created);
});

r.put('/:id', canMutate, (req, res) => {
  const patch = {};
  for (const c of COLUMNS) if (c in req.body) patch[c] = req.body[c];
  const updated = store.update('lucky_wheel_log', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Topilmadi' });
  logAudit(req.user.name, 'update lucky_wheel_log', `#${req.params.id}`);
  res.json(updated);
});

r.delete('/:id', canMutate, (req, res) => {
  store.remove('lucky_wheel_log', req.params.id);
  logAudit(req.user.name, 'delete lucky_wheel_log', `#${req.params.id}`);
  res.json({ ok: true });
});

export default r;
