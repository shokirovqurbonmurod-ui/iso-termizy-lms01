import express from 'express';
import { authRequired, canMutate } from '../auth.js';
import { store, logAudit } from '../db.js';
import { notifyForStudent, notifyGroupTopic } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const STATUS_TEXT = {
  active: { emoji: '✅', label: "darsda faol qatnashdi", short: 'Faol qatnashdi' },
  passive: { emoji: '🟡', label: "darsda qatnashdi (passiv)", short: 'Passiv qatnashdi' },
  inactive: { emoji: '🔴', label: "darsda faol bo'lmadi", short: "Faol bo'lmadi" },
  absent: { emoji: '⚪', label: "darsga kelmadi", short: 'Kelmadi' },
};
const STATUS_ORDER = ['active', 'passive', 'inactive', 'absent'];
const MAX_NAMES_SHOWN = 8;

// Bitta guruh, bitta sana uchun barcha o'quvchilarni bir so'rovda belgilaydi (qayta belgilansa eskisi almashadi).
// Har bir o'quvchi holatiga qarab ota-onasiga shaxsiy xabar, guruhning Telegram topic'iga esa umumiy
// xulosa yuboriladi (face-checkin'dagi kabi topic'ga alohida-alohida N ta xabar bilan to'ldirmaslik uchun).
r.post('/bulk', canMutate, (req, res) => {
  const { group_name, date, records } = req.body || {};
  if (!group_name || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'group_name, date va records kerak.' });
  }
  const byStatus = {};
  for (const rec of records) {
    if (!rec.student_id || !rec.status) continue;
    const existing = store.where('student_attendance_daily',
      (a) => a.student_id === rec.student_id && a.date === date)[0];
    if (existing) store.remove('student_attendance_daily', existing.id);
    store.insert('student_attendance_daily', {
      student_id: rec.student_id, student_name: rec.student_name || '',
      group_name, date, status: rec.status,
    });
    (byStatus[rec.status] ||= []).push(rec.student_name || "Noma'lum");
    const st = STATUS_TEXT[rec.status];
    if (st) {
      notifyForStudent(rec.student_id, `${st.emoji} Farzandingiz ${rec.student_name || ''} — ${date} kuni "${group_name}" darsida ${st.label}.`).catch(() => {});
    }
  }
  logAudit(req.user.name, 'mark student_attendance_daily', `${group_name} · ${date} · ${records.length} ta`);

  const total = STATUS_ORDER.reduce((sum, key) => sum + (byStatus[key]?.length || 0), 0);
  if (total) {
    const present = (byStatus.active?.length || 0) + (byStatus.passive?.length || 0);
    const percent = Math.round((present / total) * 100);
    const sections = STATUS_ORDER.filter((key) => byStatus[key]?.length).map((key) => {
      const st = STATUS_TEXT[key];
      const names = byStatus[key];
      const shown = names.slice(0, MAX_NAMES_SHOWN).join(', ');
      const more = names.length > MAX_NAMES_SHOWN ? ` va yana ${names.length - MAX_NAMES_SHOWN} ta` : '';
      return `${st.emoji} ${st.short} (${names.length}):\n${shown}${more}`;
    });
    const text = `📋 DAVOMAT — "${group_name}"\n📅 ${date}\n━━━━━━━━━━━━━━━\n\n${sections.join('\n\n')}\n\n📊 Qatnashish: ${percent}% (${present}/${total})`;
    notifyGroupTopic(group_name, text).catch(() => {});
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
