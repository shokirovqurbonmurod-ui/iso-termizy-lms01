import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const ITEM_TYPES = ['assignments', 'homework'];

// O'quvchi topshiriq/uy vazifasini "topshirdim" deb belgilaydi — canMutate'dan chetlab o'tadi,
// chunki o'quvchi faqat O'ZINING topshirilganlik yozuvini yarata oladi (req.user.name'dan olinadi,
// klient tomondan berilmaydi), tasdiqlash (coin berish) esa alohida — faqat o'qituvchi/admin qila oladi.
r.post('/submit', (req, res) => {
  const { item_id, item_type = 'assignments' } = req.body || {};
  if (!item_id) return res.status(400).json({ error: 'item_id kerak' });
  if (!ITEM_TYPES.includes(item_type)) return res.status(400).json({ error: "Noto'g'ri item_type" });
  const student = req.user.name;
  const existing = store.where('assignment_completions',
    (c) => c.item_type === item_type && String(c.item_id) === String(item_id) && c.student === student)[0];
  if (existing) return res.json(existing);
  const created = store.insert('assignment_completions', {
    item_type, item_id, student, status: 'submitted',
    date: new Date().toISOString().slice(0, 10),
  });
  logAudit(student, `submit ${item_type}`, `#${item_id}`);
  res.status(201).json(created);
});

export default r;
