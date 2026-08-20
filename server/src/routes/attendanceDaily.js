import express from 'express';
import { authRequired, canMutate } from '../auth.js';
import { store, logAudit } from '../db.js';
import { notifyForStudent, notifyGroupTopic } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const STATUS_TEXT = {
  active: { emoji: '✅', label: "darsda faol qatnashdi" },
  passive: { emoji: '🟡', label: "darsda qatnashdi (passiv)" },
  inactive: { emoji: '🔴', label: "darsda faol bo'lmadi" },
  absent: { emoji: '⚪', label: "darsga kelmadi" },
};

// Bitta guruh, bitta sana uchun barcha o'quvchilarni bir so'rovda belgilaydi (qayta belgilansa eskisi almashadi).
// Har bir o'quvchi holatiga qarab ota-onasiga shaxsiy xabar, guruhning Telegram topic'iga esa umumiy
// xulosa yuboriladi (face-checkin'dagi kabi topic'ga alohida-alohida N ta xabar bilan to'ldirmaslik uchun).
r.post('/bulk', canMutate, (req, res) => {
  const { group_name, date, records } = req.body || {};
  if (!group_name || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'group_name, date va records kerak.' });
  }
  const counts = {};
  for (const rec of records) {
    if (!rec.student_id || !rec.status) continue;
    const existing = store.where('student_attendance_daily',
      (a) => a.student_id === rec.student_id && a.date === date)[0];
    if (existing) store.remove('student_attendance_daily', existing.id);
    store.insert('student_attendance_daily', {
      student_id: rec.student_id, student_name: rec.student_name || '',
      group_name, date, status: rec.status,
    });
    counts[rec.status] = (counts[rec.status] || 0) + 1;
    const st = STATUS_TEXT[rec.status];
    if (st) {
      notifyForStudent(rec.student_id, `${st.emoji} Farzandingiz ${rec.student_name || ''} — ${date} kuni "${group_name}" darsida ${st.label}.`).catch(() => {});
    }
  }
  logAudit(req.user.name, 'mark student_attendance_daily', `${group_name} · ${date} · ${records.length} ta`);

  const summaryLines = Object.entries(STATUS_TEXT)
    .filter(([key]) => counts[key])
    .map(([key, st]) => `${st.emoji} ${counts[key]} ta`);
  if (summaryLines.length) {
    notifyGroupTopic(group_name, `📋 Davomat belgilandi — "${group_name}" (${date})\n${summaryLines.join('\n')}`).catch(() => {});
  }

  res.json({ ok: true, count: records.length });
});

// ?group_name=&from=&to= — guruh davomat jadvalini (kalendar) chizish uchun.
r.get('/', (req, res) => {
  const { group_name, from, to, student_id } = req.query;
  let rows = store.all('student_attendance_daily');
  if (group_name) rows = rows.filter((a) => a.group_name === group_name);
  if (student_id) rows = rows.filter((a) => String(a.student_id) === String(student_id));
  if (from) rows = rows.filter((a) => a.date >= from);
  if (to) rows = rows.filter((a) => a.date <= to);
  res.json(rows);
});

export default r;
