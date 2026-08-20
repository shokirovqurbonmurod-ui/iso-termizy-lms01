// O'quvchi o'zi ishlatadigan "sovrin talab qilish" turidagi funksiyalar (Omad g'ildiragi, Mystery Box).
// canMutate umumiy 'student' rolini yozish amallaridan butunlay bloklaydi, shuning uchun bu ikkalasi
// alohida, xavfsiz endpoint sifatida qurildi: sovrin SERVERDA tanlanadi (mijoz tomonidan
// o'zgartirib bo'lmaydi), student_id JWT'dan olinadi (boshqa o'quvchiga emas, faqat o'ziga),
// va "kuniga bitta" cheklovi ham serverda tekshiriladi (faqat frontend emas).
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function pickWeighted(prizes) {
  const total = prizes.reduce((a, p) => a + p.weight, 0);
  let x = Math.random() * total;
  for (const p of prizes) { if (x < p.weight) return p; x -= p.weight; }
  return prizes[0];
}

function myStudent(req) {
  if (req.user.role !== 'student') return null;
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

function creditCoins(student, amount, reason) {
  const newBalance = (Number(student.coins) || 0) + amount;
  store.update('students', student.id, { coins: newBalance, points: (Number(student.points) || 0) + amount });
  store.insert('coin_log', { student: student.full_name, amount, reason, given_by: 'system', at: now() });
  return newBalance;
}

function debitCoins(student, amount, reason) {
  const newBalance = (Number(student.coins) || 0) - amount;
  store.update('students', student.id, { coins: newBalance });
  store.insert('coin_log', { student: student.full_name, amount: -amount, reason, given_by: 'system', at: now() });
  return newBalance;
}

const WHEEL_PRIZES = [
  { label: '10 🪙', coins: 10, weight: 18 }, { label: '25 🪙', coins: 25, weight: 15 },
  { label: '50 🪙', coins: 50, weight: 14 }, { label: '100 🪙', coins: 100, weight: 12 },
  { label: '5 🪙', coins: 5, weight: 18 }, { label: '200 🪙', coins: 200, weight: 8 },
  { label: '15 🪙', coins: 15, weight: 15 }, { label: '500 🪙', coins: 500, weight: 3 },
  { label: '30 🪙', coins: 30, weight: 14 }, { label: '1000 🪙 — JEKPOT!', coins: 1000, weight: 1 },
  { label: '20 🪙', coins: 20, weight: 16 }, { label: '75 🪙', coins: 75, weight: 10 },
];

r.post('/lucky-wheel/spin', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  if (store.where('lucky_wheel_log', (l) => l.student === student.full_name && l.date === today()).length) {
    return res.status(409).json({ error: "Bugun allaqachon aylantirdingiz. Ertaga qayta urinib ko'ring." });
  }
  const prize = pickWeighted(WHEEL_PRIZES);
  creditCoins(student, prize.coins, "Omad g'ildiragi: " + prize.label);
  const row = store.insert('lucky_wheel_log', { student: student.full_name, prize: prize.label, coins: prize.coins, date: today() });
  logAudit(student.full_name, 'lucky wheel spin', prize.label);
  notifyForStudent(student.id, `🎉 Tabriklaymiz! Farzandingiz ${student.full_name} "Omad g'ildiragi"ni aylantirib ${prize.label} yutdi!`).catch(() => {});
  res.json({ prize, row, balance: student.coins });
});

const BOX_PRIZES = [
  { label: '10 🪙', coins: 10, weight: 20 }, { label: '20 🪙', coins: 20, weight: 18 },
  { label: '30 🪙', coins: 30, weight: 15 }, { label: '50 🪙', coins: 50, weight: 15 },
  { label: '75 🪙', coins: 75, weight: 10 }, { label: '100 🪙', coins: 100, weight: 10 },
  { label: '150 🪙', coins: 150, weight: 6 }, { label: '300 🪙', coins: 300, weight: 4 },
  { label: '500 🪙 — JEKPOT!', coins: 500, weight: 2 },
];

r.post('/mystery-box/open', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  if (store.where('mystery_box', (l) => l.student === student.full_name && l.date === today()).length) {
    return res.status(409).json({ error: "Bugun allaqachon quti ochdingiz. Ertaga qayta urinib ko'ring." });
  }
  const prize = pickWeighted(BOX_PRIZES);
  creditCoins(student, prize.coins, 'Mystery Box: ' + prize.label);
  const row = store.insert('mystery_box', { student: student.full_name, reward: prize.label, coins: prize.coins, date: today() });
  logAudit(student.full_name, 'mystery box open', prize.label);
  notifyForStudent(student.id, `🎁 Farzandingiz ${student.full_name} Mystery Box'dan "${prize.label}" yutdi!`).catch(() => {});
  res.json({ prize, row, balance: student.coins });
});

const DAILY_REWARDS = [5, 10, 15, 20, 25, 35, 50]; // 1-kundan 7-kungacha, keyin qayta boshlanadi
const oneDayMs = 86400000;

r.post('/daily-bonus/claim', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const mine = store.where('daily_bonus', (b) => b.student === student.full_name).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const last = mine[0];
  const todayDate = today();
  if (last?.date === todayDate) return res.status(409).json({ error: 'Bugungi bonus allaqachon olingan.' });
  const yesterday = new Date(Date.now() - oneDayMs).toISOString().slice(0, 10);
  const streakDay = last?.date === yesterday ? (Number(last.streak_day) || 0) + 1 : 1;
  const coins = DAILY_REWARDS[(streakDay - 1) % DAILY_REWARDS.length];
  const balance = creditCoins(student, coins, `Kunlik bonus (${streakDay}-kun)`);
  const row = store.insert('daily_bonus', { student: student.full_name, streak_day: streakDay, coins_awarded: coins, date: todayDate });
  logAudit(student.full_name, 'daily bonus claim', `${streakDay}-kun`);
  notifyForStudent(student.id, `🎁 Farzandingiz ${student.full_name} kunlik bonusni oldi — ${streakDay}-kunlik streak, ${coins} coin!`).catch(() => {});
  res.status(201).json({ row, balance });
});

r.post('/avatar-shop/buy', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const item = store.get('avatar_shop', req.body?.item_id);
  if (!item) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  if (store.where('avatar_purchases', (p) => p.student === student.full_name && String(p.item_id) === String(item.id)).length) {
    return res.status(409).json({ error: 'Bu mahsulot allaqachon sotib olingan.' });
  }
  const cost = Number(item.cost_coins) || 0;
  if ((Number(student.coins) || 0) < cost) return res.status(400).json({ error: 'Coin yetarli emas.' });
  const balance = debitCoins(student, cost, `Avatar shop: ${item.item_name}`);
  const row = store.insert('avatar_purchases', { student: student.full_name, item_id: item.id, item_name: item.item_name, cost_coins: cost, equipped: '', date: today() });
  logAudit(student.full_name, 'avatar shop buy', item.item_name);
  res.status(201).json({ row, balance });
});

r.post('/avatar-shop/equip', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const purchase = store.get('avatar_purchases', req.body?.purchase_id);
  if (!purchase || purchase.student !== student.full_name) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  const item = store.get('avatar_shop', purchase.item_id);
  const sameCategory = store.where('avatar_purchases', (p) => p.student === student.full_name
    && store.get('avatar_shop', p.item_id)?.category === item?.category);
  for (const p of sameCategory) if (p.equipped) store.update('avatar_purchases', p.id, { equipped: '' });
  store.update('avatar_purchases', purchase.id, { equipped: 'yes' });
  res.json({ ok: true });
});

export default r;
