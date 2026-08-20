import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export const TEACHER_COIN_MAX = 5000;

// POST /api/teacher-coins/give  { teacher_id, amount, reason }
r.post('/give', canMutate, (req, res) => {
  const { teacher_id, amount, reason } = req.body || {};
  const amt = Number(amount) || 0;
  if (!teacher_id) return res.status(400).json({ error: "O'qituvchini tanlang" });
  if (amt <= 0) return res.status(400).json({ error: "Coin miqdori 0 dan katta bo'lsin" });
  if (amt > TEACHER_COIN_MAX) return res.status(400).json({ error: `Bir martada ko'pi bilan ${TEACHER_COIN_MAX} coin berish mumkin` });

  const teacher = store.get('teachers', teacher_id);
  if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });

  const newBalance = (Number(teacher.coins) || 0) + amt;
  store.update('teachers', teacher_id, { coins: newBalance });
  store.insert('teacher_coin_log', { teacher: teacher.full_name, amount: amt, reason: reason || '', given_by: req.user.name, at: now() });
  logAudit(req.user.name, `give ${amt} teacher coins`, teacher.full_name);

  res.json({ ok: true, teacher: store.get('teachers', teacher_id), max: TEACHER_COIN_MAX });
});

r.get('/log', (_req, res) => res.json(store.all('teacher_coin_log').slice(0, 100)));

r.delete('/log/:id', canMutate, (req, res) => {
  store.remove('teacher_coin_log', req.params.id);
  res.json({ ok: true });
});

// O'qituvchilar reytingi — eng ko'p coin to'plaganlar tepada (gamifikatsiya lidersbord).
r.get('/leaderboard', (_req, res) => {
  const rows = store.all('teachers')
    .map((t) => ({ id: t.id, full_name: t.full_name, coins: Number(t.coins) || 0, level: t.level, rating: t.rating }))
    .sort((a, b) => b.coins - a.coins);
  res.json(rows);
});

export default r;
