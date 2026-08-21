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

// Coin yig'ish qiyinroq bo'lishi uchun — kichik, tasodifiy 1-3 coin mukofot (avvalgi qat'iy 5 o'rniga).
function randomSmallReward() { return 1 + Math.floor(Math.random() * 3); }

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

r.post('/weekly-tasks/complete', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const task = store.get('weekly_tasks', req.body?.item_id);
  if (!task) return res.status(404).json({ error: 'Vazifa topilmadi' });
  if (store.where('assignment_completions', (c) => c.item_type === 'weekly_tasks' && String(c.item_id) === String(task.id) && c.student === student.full_name).length) {
    return res.status(409).json({ error: 'Bu vazifa allaqachon bajarilgan deb belgilangan.' });
  }
  const coins = Number(task.reward_coins) || 0;
  const balance = coins > 0 ? creditCoins(student, coins, `Haftalik vazifa: ${task.title}`) : student.coins;
  const row = store.insert('assignment_completions', { item_type: 'weekly_tasks', item_id: task.id, student: student.full_name, status: 'approved', date: today() });
  logAudit(student.full_name, 'weekly task complete', task.title);
  res.status(201).json({ row, balance });
});

r.post('/study-groups/create', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const { name, subject, meeting_time } = req.body || {};
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Guruh nomi kerak' });
  const group = store.insert('study_groups', { name, subject: subject || '', meeting_time: meeting_time || '', members_count: 1 });
  store.insert('study_group_members', { group_id: group.id, student: student.full_name, date: today() });
  logAudit(student.full_name, 'study group create', name);
  res.status(201).json(group);
});

r.post('/study-groups/join', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const group = store.get('study_groups', req.body?.group_id);
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  if (store.where('study_group_members', (m) => String(m.group_id) === String(group.id) && m.student === student.full_name).length) {
    return res.status(409).json({ error: "Siz bu guruhga allaqachon a'zosiz." });
  }
  const row = store.insert('study_group_members', { group_id: group.id, student: student.full_name, date: today() });
  store.update('study_groups', group.id, { members_count: (Number(group.members_count) || 0) + 1 });
  res.status(201).json({ row });
});

r.post('/study-groups/leave', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const group = store.get('study_groups', req.body?.group_id);
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  const mine = store.where('study_group_members', (m) => String(m.group_id) === String(group.id) && m.student === student.full_name)[0];
  if (!mine) return res.status(404).json({ error: "A'zolik topilmadi" });
  store.remove('study_group_members', mine.id);
  store.update('study_groups', group.id, { members_count: Math.max(0, (Number(group.members_count) || 1) - 1) });
  res.json({ ok: true });
});

r.post('/calculator/save', (req, res) => {
  const { expression, result } = req.body || {};
  if (!expression) return res.status(400).json({ error: 'expression kerak' });
  const row = store.insert('calculator_history', { user: req.user.name, expression, result, date: today() });
  res.status(201).json(row);
});

r.post('/fitness/log', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const challenge = store.get('fitness_challenge', req.body?.challenge_id);
  if (!challenge) return res.status(404).json({ error: 'Challenge topilmadi' });
  if (store.where('fitness_logs', (l) => String(l.challenge_id) === String(challenge.id) && l.student === student.full_name && l.date === today()).length) {
    return res.status(409).json({ error: 'Bugun allaqachon belgilangan.' });
  }
  const amount = Math.max(0, Number(req.body?.amount) || 0);
  const row = store.insert('fitness_logs', { challenge_id: challenge.id, student: student.full_name, amount, date: today() });
  const reward = randomSmallReward();
  const balance = creditCoins(student, reward, `Fitness: ${challenge.title}`);
  const isNewParticipant = store.where('fitness_logs', (l) => String(l.challenge_id) === String(challenge.id) && l.student === student.full_name).length === 1;
  if (isNewParticipant) store.update('fitness_challenge', challenge.id, { participants: (Number(challenge.participants) || 0) + 1 });
  logAudit(student.full_name, 'fitness log', `${challenge.title}: ${amount}`);
  res.status(201).json({ row, balance, reward });
});

r.post('/roleplay/practice', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const scenario = store.get('role_play_scenarios', req.body?.scenario_id);
  if (!scenario) return res.status(404).json({ error: 'Ssenariy topilmadi' });
  if (store.where('assignment_completions', (c) => c.item_type === 'roleplay' && String(c.item_id) === String(scenario.id) && c.student === student.full_name).length) {
    return res.json({ ok: true, already: true });
  }
  const row = store.insert('assignment_completions', { item_type: 'roleplay', item_id: scenario.id, student: student.full_name, status: 'approved', date: today() });
  const balance = creditCoins(student, 10, `Rol o'yini: ${scenario.title}`);
  res.status(201).json({ row, balance });
});

r.post('/story/post', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const { caption, image_url } = req.body || {};
  if (!String(caption || '').trim() && !image_url) return res.status(400).json({ error: 'Matn yoki rasm kerak' });
  const row = store.insert('story_posts', { student: student.full_name, caption: caption || '', image_url: image_url || '', date: today() });
  res.status(201).json(row);
});

r.post('/story/like', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const postId = req.body?.post_id;
  const existing = store.where('post_likes', (l) => String(l.post_id) === String(postId) && l.student === student.full_name)[0];
  if (existing) { store.remove('post_likes', existing.id); return res.json({ liked: false }); }
  store.insert('post_likes', { post_id: postId, student: student.full_name, date: today() });
  res.json({ liked: true });
});

r.post('/subscription/subscribe', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const box = store.get('subscription_boxes', req.body?.box_id);
  if (!box) return res.status(404).json({ error: 'Quti topilmadi' });
  if (store.where('subscription_members', (m) => String(m.box_id) === String(box.id) && m.student === student.full_name && m.status === 'active').length) {
    return res.status(409).json({ error: 'Siz allaqachon obuna bo\'lgansiz.' });
  }
  const row = store.insert('subscription_members', { box_id: box.id, student: student.full_name, status: 'active', date: today() });
  store.update('subscription_boxes', box.id, { subscribers: (Number(box.subscribers) || 0) + 1 });
  res.status(201).json(row);
});

r.post('/subscription/unsubscribe', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const box = store.get('subscription_boxes', req.body?.box_id);
  if (!box) return res.status(404).json({ error: 'Quti topilmadi' });
  const mine = store.where('subscription_members', (m) => String(m.box_id) === String(box.id) && m.student === student.full_name && m.status === 'active')[0];
  if (!mine) return res.status(404).json({ error: 'Obuna topilmadi' });
  store.update('subscription_members', mine.id, { status: 'cancelled' });
  store.update('subscription_boxes', box.id, { subscribers: Math.max(0, (Number(box.subscribers) || 1) - 1) });
  res.json({ ok: true });
});

r.post('/karaoke/perform', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const song = String(req.body?.song || '').trim();
  if (!song) return res.status(400).json({ error: "Qo'shiq nomi kerak" });
  const row = store.insert('karaoke', { student: student.full_name, song, score: 0, date: today() });
  logAudit(student.full_name, 'karaoke perform', song);
  res.status(201).json(row);
});

r.post('/podcast/listen', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const ep = store.get('podcast_episodes', req.body?.episode_id);
  if (!ep) return res.status(404).json({ error: 'Epizod topilmadi' });
  if (store.where('assignment_completions', (c) => c.item_type === 'podcast' && String(c.item_id) === String(ep.id) && c.student === student.full_name).length) {
    return res.json({ ok: true, already: true });
  }
  const row = store.insert('assignment_completions', { item_type: 'podcast', item_id: ep.id, student: student.full_name, status: 'approved', date: today() });
  res.status(201).json(row);
});

r.post('/live-stream/rsvp', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const stream = store.get('live_streams', req.body?.stream_id);
  if (!stream) return res.status(404).json({ error: 'Efir topilmadi' });
  if (store.where('assignment_completions', (c) => c.item_type === 'live_stream' && String(c.item_id) === String(stream.id) && c.student === student.full_name).length) {
    return res.json({ ok: true, already: true });
  }
  const row = store.insert('assignment_completions', { item_type: 'live_stream', item_id: stream.id, student: student.full_name, status: 'approved', date: today() });
  res.status(201).json(row);
});

r.post('/virtual-room/join', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const room = store.get('virtual_rooms', req.body?.room_id);
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  if (store.where('virtual_room_members', (m) => String(m.room_id) === String(room.id) && m.student === student.full_name).length) {
    return res.status(409).json({ error: 'Siz bu xonada allaqachonsiz.' });
  }
  const current = store.where('virtual_room_members', (m) => String(m.room_id) === String(room.id)).length;
  if (room.capacity && current >= Number(room.capacity)) return res.status(400).json({ error: 'Xona to\'lgan.' });
  const row = store.insert('virtual_room_members', { room_id: room.id, student: student.full_name, date: today() });
  res.status(201).json(row);
});

r.post('/virtual-room/leave', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const room = store.get('virtual_rooms', req.body?.room_id);
  if (!room) return res.status(404).json({ error: 'Xona topilmadi' });
  const mine = store.where('virtual_room_members', (m) => String(m.room_id) === String(room.id) && m.student === student.full_name)[0];
  if (!mine) return res.status(404).json({ error: "A'zolik topilmadi" });
  store.remove('virtual_room_members', mine.id);
  res.json({ ok: true });
});

r.post('/qr/checkin', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const qr = store.get('qr_codes', req.body?.qr_id);
  if (!qr) return res.status(404).json({ error: 'QR kod topilmadi' });
  const now2 = new Date();
  if (store.where('check_ins', (c) => c.location === qr.linked_to && c.student === student.full_name && c.date === today()).length) {
    return res.status(409).json({ error: 'Siz bugun allaqachon belgilangansiz.' });
  }
  const row = store.insert('check_ins', { student: student.full_name, location: qr.linked_to, date: today(), time: now2.toTimeString().slice(0, 5) });
  logAudit(student.full_name, 'qr check-in', qr.linked_to);
  res.status(201).json(row);
});

r.post('/booking/reserve', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const { resource_name, date, time_start, time_end } = req.body || {};
  if (!resource_name || !date || !time_start) return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
  const overlap = store.where('booking_slots', (b) => b.resource_name === resource_name && b.date === date && b.time_start === time_start);
  if (overlap.length) return res.status(409).json({ error: 'Bu vaqt allaqachon band.' });
  const row = store.insert('booking_slots', { resource_name, date, time_start, time_end: time_end || '', booked_by: student.full_name });
  res.status(201).json(row);
});

r.post('/feature-requests/submit', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Sarlavha kerak' });
  const requester = req.user.name;
  const row = store.insert('feature_requests', { title, requested_by: requester, votes: 0, status: 'new' });
  res.status(201).json(row);
});

r.post('/feature-requests/vote', (req, res) => {
  const requestId = req.body?.request_id;
  const item = store.get('feature_requests', requestId);
  if (!item) return res.status(404).json({ error: 'Taklif topilmadi' });
  const voter = req.user.name;
  if (store.where('feature_request_votes', (v) => String(v.request_id) === String(requestId) && v.student === voter).length) {
    return res.status(409).json({ error: 'Siz allaqachon ovoz bergansiz.' });
  }
  store.insert('feature_request_votes', { request_id: requestId, student: voter, date: today() });
  store.update('feature_requests', item.id, { votes: (Number(item.votes) || 0) + 1 });
  res.status(201).json({ ok: true });
});

// Chat Premium — Telegram Premiumga o'xshash obuna: 👑 belgi, kattaroq fayl yuklash limiti.
// Narx/muddat har bir tarif uchun serverda qat'iy belgilangan — mijoz faqat tarif nomini tanlaydi,
// narxni o'zi yubora olmaydi (aks holda konsolda so'rovni o'zgartirib arzon sotib olishi mumkin edi).
const CHAT_PREMIUM_PLANS = {
  '1m': { months: 1, days: 30, coins: 300 },
  '3m': { months: 3, days: 90, coins: 800 },
  '6m': { months: 6, days: 180, coins: 1500 },
  '12m': { months: 12, days: 365, coins: 2700 },
};

r.get('/chat-premium/plans', (_req, res) => res.json(CHAT_PREMIUM_PLANS));

// Promo kod topib beradi — amal qilishi (holat/muddat/limit) va shu talaba oldin ishlatmaganini
// tekshiradi. Xato bo'lsa matn qaytaradi, to'g'ri bo'lsa promo qatorining o'zini.
function findValidPromo(code, studentName, context) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { error: 'Promo kod kiritilmagan.' };
  const promo = store.all('promo_codes').find((p) => String(p.code || '').toUpperCase() === clean);
  if (!promo) return { error: "Bunday promo kod topilmadi." };
  if (promo.status && promo.status !== 'active') return { error: "Bu promo kod faol emas." };
  if (promo.expires && promo.expires < today()) return { error: "Promo kodning muddati o'tgan." };
  if (promo.max_uses && Number(promo.used || 0) >= Number(promo.max_uses)) return { error: "Promo kod limiti tugagan." };
  const already = store.where('promo_code_redemptions', (r2) => r2.code === clean && r2.student === studentName && r2.context === context)[0];
  if (already) return { error: "Siz bu promo koddan allaqachon foydalangansiz." };
  return { promo, clean };
}

function redeemPromo(promo, clean, studentName, context) {
  store.update('promo_codes', promo.id, { used: (Number(promo.used) || 0) + 1 });
  store.insert('promo_code_redemptions', { code: clean, student: studentName, context, at: now() });
}

r.post('/chat-premium/buy', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const planKey = req.body?.plan;
  const plan = CHAT_PREMIUM_PLANS[planKey];
  if (!plan) return res.status(400).json({ error: "Tarif tanlanmagan" });
  const active = store.where('chat_premium', (p) => p.student === student.full_name && p.expires_at > now());
  if (active.length) return res.status(409).json({ error: 'Sizda allaqachon faol Chat Premium bor.' });

  let cost = plan.coins;
  let promoInfo = null;
  const promoCode = req.body?.promo_code;
  if (promoCode) {
    const { promo, clean, error } = findValidPromo(promoCode, student.full_name, 'chat_premium');
    if (error) return res.status(400).json({ error });
    cost = 0;
    promoInfo = { promo, clean };
  }

  if (cost > 0 && (Number(student.coins) || 0) < cost) return res.status(400).json({ error: 'Coin yetarli emas.' });
  const balance = cost > 0 ? debitCoins(student, cost, `Chat Premium (${plan.months} oy)`) : (Number(student.coins) || 0);
  const expires = new Date(Date.now() + plan.days * oneDayMs).toISOString().slice(0, 19).replace('T', ' ');
  const row = store.insert('chat_premium', {
    student: student.full_name, purchased_at: now(), expires_at: expires, cost_coins: cost, plan: planKey,
    promo_code: promoInfo?.clean || '',
  });
  if (promoInfo) redeemPromo(promoInfo.promo, promoInfo.clean, student.full_name, 'chat_premium');
  logAudit(student.full_name, 'chat premium buy', `${plan.months} oy${promoInfo ? ` (promo: ${promoInfo.clean})` : ''}`);
  res.status(201).json({ row, balance });
});

export default r;
