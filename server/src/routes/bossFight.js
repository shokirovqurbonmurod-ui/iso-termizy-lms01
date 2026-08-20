// Boss Fight — butun markaz/guruh birgalikda "boss"ga hujum qiladi (kuniga bitta zarba, 5-25 tasodifiy
// zarar). HP nolga tushsa boss mag'lub bo'ladi va HAMMA hissa qo'shgan o'quvchi coin mukofoti oladi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);
const REWARD_ON_DEFEAT = 30;

function myStudent(req) {
  if (req.user.role !== 'student') return null;
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

function currentBoss() {
  return store.all('boss_fights').find((b) => b.status === 'active') || null;
}

function bossView(boss, req) {
  if (!boss) return null;
  const attacks = store.where('boss_fight_attacks', (a) => String(a.boss_id) === String(boss.id));
  const dealt = attacks.reduce((sum, a) => sum + (Number(a.damage) || 0), 0);
  const remaining = Math.max(0, Number(boss.total_hp) - dealt);
  const byStudent = {};
  for (const a of attacks) byStudent[a.student] = (byStudent[a.student] || 0) + Number(a.damage);
  const leaderboard = Object.entries(byStudent).map(([student, damage]) => ({ student, damage })).sort((a, b) => b.damage - a.damage).slice(0, 10);
  const student = myStudent(req);
  const attackedToday = student ? attacks.some((a) => a.student === student.full_name && a.at.slice(0, 10) === today()) : false;
  return {
    id: boss.id, title: boss.title, total_hp: Number(boss.total_hp), remaining_hp: remaining,
    percent: Math.round((remaining / Number(boss.total_hp)) * 100), status: boss.status,
    leaderboard, contributors: Object.keys(byStudent).length, attackedToday,
  };
}

r.get('/current', (req, res) => {
  res.json(bossView(currentBoss(), req));
});

r.post('/create', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  if (currentBoss()) return res.status(409).json({ error: "Faol boss allaqachon mavjud. Avval uni tugating." });
  const { title, total_hp } = req.body || {};
  const hp = Number(total_hp) || 1000;
  if (!title?.trim() || hp <= 0) return res.status(400).json({ error: 'Nom va HP miqdorini kiriting.' });
  const row = store.insert('boss_fights', { title: title.trim(), level: '', participants: 0, winner: '', status: 'active', total_hp: hp, created_by: req.user.name, date: today() });
  logAudit(req.user.name, 'create boss fight', row.title);
  res.status(201).json(bossView(row, req));
});

r.post('/attack', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const boss = currentBoss();
  if (!boss) return res.status(404).json({ error: "Hozir faol boss yo'q." });
  if (store.where('boss_fight_attacks', (a) => String(a.boss_id) === String(boss.id) && a.student === student.full_name && a.at.slice(0, 10) === today()).length) {
    return res.status(409).json({ error: 'Bugun allaqachon hujum qildingiz. Ertaga qayta urinib ko\'ring.' });
  }
  const damage = 5 + Math.floor(Math.random() * 21);
  store.insert('boss_fight_attacks', { boss_id: boss.id, student: student.full_name, damage, at: now() });

  const attacks = store.where('boss_fight_attacks', (a) => String(a.boss_id) === String(boss.id));
  const dealt = attacks.reduce((sum, a) => sum + (Number(a.damage) || 0), 0);
  let defeated = false;
  if (dealt >= Number(boss.total_hp)) {
    defeated = true;
    store.update('boss_fights', boss.id, { status: 'defeated', winner: 'Jamoa' });
    const byStudent = new Set(attacks.map((a) => a.student));
    for (const name of byStudent) {
      const s = store.all('students').find((x) => x.full_name === name);
      if (!s) continue;
      store.update('students', s.id, { coins: (Number(s.coins) || 0) + REWARD_ON_DEFEAT, points: (Number(s.points) || 0) + REWARD_ON_DEFEAT });
      store.insert('coin_log', { student: s.full_name, amount: REWARD_ON_DEFEAT, reason: `Boss Fight: "${boss.title}" mag'lub etildi`, given_by: 'system', at: now() });
      notifyForStudent(s.id, `⚔️ Farzandingiz ${s.full_name} jamoa bilan "${boss.title}" bossini mag'lub etdi va ${REWARD_ON_DEFEAT} coin yutdi!`).catch(() => {});
    }
    logAudit('system', 'boss defeated', boss.title);
  }
  res.json({ damage, defeated, boss: bossView(store.get('boss_fights', boss.id), req) });
});

export default r;
