import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export const GIFT_MAX = 1000;

function myStudent(req) {
  if (req.user.role === 'student') return store.all('students').find((s) => s.full_name === req.user.name);
  return null;
}

r.get('/log', (_req, res) => res.json(store.all('coin_gifts').slice(0, 100)));

r.delete('/:id', (req, res) => {
  store.remove('coin_gifts', req.params.id);
  res.json({ ok: true });
});

// POST /api/coin-gifts/send  { from_student_id?, to_student_id, amount, message }
// O'quvchi (student rol) o'zidan yuboradi; xodim ikki o'quvchi orasida (masalan sinf tadbirida) yuborishi mumkin.
r.post('/send', (req, res) => {
  const { to_student_id, amount, message } = req.body || {};
  const amt = Number(amount) || 0;
  const mine = myStudent(req);
  const fromId = mine ? mine.id : req.body?.from_student_id;
  if (!fromId) return res.status(400).json({ error: "Yuboruvchi o'quvchini tanlang" });
  if (!to_student_id) return res.status(400).json({ error: "Qabul qiluvchi o'quvchini tanlang" });
  if (String(fromId) === String(to_student_id)) return res.status(400).json({ error: "O'zingizga hadya yubora olmaysiz" });
  if (amt <= 0) return res.status(400).json({ error: "Miqdor 0 dan katta bo'lsin" });
  if (amt > GIFT_MAX) return res.status(400).json({ error: `Bir martada ko'pi bilan ${GIFT_MAX} coin hadya qilish mumkin` });

  const from = store.get('students', fromId);
  const to = store.get('students', to_student_id);
  if (!from || !to) return res.status(404).json({ error: "O'quvchi topilmadi" });
  const fromCoins = Number(from.coins) || 0;
  if (amt > fromCoins) return res.status(400).json({ error: 'Coin yetarli emas' });

  store.update('students', from.id, { coins: fromCoins - amt });
  store.update('students', to.id, { coins: (Number(to.coins) || 0) + amt });
  const row = store.insert('coin_gifts', {
    from_student_id: from.id, from_name: from.full_name,
    to_student_id: to.id, to_name: to.full_name,
    amount: amt, message: (message || '').slice(0, 200), at: now(),
  });
  logAudit(req.user.name, `coin gift ${amt}`, `${from.full_name} → ${to.full_name}`);
  res.json({ ok: true, gift: row });
});

export default r;
