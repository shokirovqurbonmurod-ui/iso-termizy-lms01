import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';

const r = express.Router();
r.use(authRequired);

export const COIN_MAX = 99999;     // cheksiz

// POST /api/coins/give  { student_id, amount, reason }
r.post('/give', canMutate, (req, res) => {
  const { student_id, amount, reason } = req.body || {};
  const amt = Number(amount) || 0;
  if (!student_id) return res.status(400).json({ error: "O'quvchini tanlang" });
  if (amt <= 0) return res.status(400).json({ error: 'Coin miqdori 0 dan katta bo\'lsin' });
  if (amt > COIN_MAX) return res.status(400).json({ error: `Bir martada ko'pi bilan ${COIN_MAX} coin berish mumkin` });

  const student = store.get('students', student_id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });

  const newBalance = (Number(student.coins) || 0) + amt;
  store.update('students', student_id, {
    coins: newBalance,
    points: (Number(student.points) || 0) + amt,
  });
  store.insert('coin_log', { student: student.full_name, amount: amt, reason: reason || '', given_by: req.user.name, at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  logAudit(req.user.name, `give ${amt} coins`, student.full_name);

  res.json({ ok: true, student: store.get('students', student_id), max: COIN_MAX });
});

r.get('/log', (_req, res) => res.json(store.all('coin_log').slice(0, 100)));
r.get('/config', (_req, res) => res.json({ max: COIN_MAX }));

// POST /api/coins/spend  { student_id, item, cost }  — Coin Shop xaridi
r.post('/spend', authRequired, (req, res) => {
  const { student_id, item, cost } = req.body || {};
  const price = Number(cost) || 0;
  const student = store.get('students', student_id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });
  if ((Number(student.coins) || 0) < price) return res.status(400).json({ error: 'Coin yetarli emas' });
  store.update('students', student_id, { coins: (Number(student.coins) || 0) - price });
  store.insert('coin_log', { student: student.full_name, amount: -price, reason: `Coin Shop: ${item}`, given_by: req.user.name, at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  logAudit(req.user.name, `shop -${price} coins`, `${student.full_name} · ${item}`);
  res.json({ ok: true, student: store.get('students', student_id) });
});

// POST /api/coins/exchange  { student_id, direction, amount }
// directions: coins_to_points | points_to_coins | to_general | from_general (1 coin = 1 point)
r.post('/exchange', canMutate, (req, res) => {
  const { student_id, direction, amount } = req.body || {};
  const amt = Number(amount) || 0;
  if (!student_id) return res.status(400).json({ error: "O'quvchini tanlang" });
  if (amt <= 0) return res.status(400).json({ error: "Miqdor 0 dan katta bo'lsin" });

  const student = store.get('students', student_id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });

  let general = store.all('general_coins')[0];
  if (!general) general = store.insert('general_coins', { name: 'Umumiy hisob', coins: 10000 });

  const coins = Number(student.coins) || 0;
  const points = Number(student.points) || 0;
  const genCoins = Number(general.coins) || 0;

  if (direction === 'coins_to_points') {
    if (amt > coins) return res.status(400).json({ error: 'Coin yetarli emas' });
    store.update('students', student_id, { coins: coins - amt, points: points + amt });
  } else if (direction === 'points_to_coins') {
    if (amt > points) return res.status(400).json({ error: 'Pont yetarli emas' });
    store.update('students', student_id, { points: points - amt, coins: coins + amt });
  } else if (direction === 'to_general') {
    if (amt > coins) return res.status(400).json({ error: 'Coin yetarli emas' });
    store.update('students', student_id, { coins: coins - amt });
    store.update('general_coins', general.id, { coins: genCoins + amt });
  } else if (direction === 'from_general') {
    if (amt > genCoins) return res.status(400).json({ error: "Umumiy hisobda mablag' yetarli emas" });
    store.update('general_coins', general.id, { coins: genCoins - amt });
    store.update('students', student_id, { coins: coins + amt });
  } else {
    return res.status(400).json({ error: "Noto'g'ri yo'nalish" });
  }

  logAudit(req.user.name, `coin exchange (${direction})`, `${student.full_name}: ${amt}`);
  res.json({ ok: true, student: store.get('students', student_id), general: store.all('general_coins')[0] });
});

export default r;
