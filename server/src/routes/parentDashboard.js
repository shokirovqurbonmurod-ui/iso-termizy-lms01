import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 9 ? '998' + digits : digits;
}

// Ota-ona faqat o'z farzand(lar)ining ma'lumotlarini ko'radi — telefon raqami bo'yicha bog'lanadi.
r.get('/me', (req, res) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: "Bu bo'lim faqat ota-onalar uchun." });
  const myPhone = normalizePhone(req.user.phone);
  const children = store.all('students').filter((s) => normalizePhone(s.parent_phone) === myPhone);

  const result = children.map((s) => {
    const ledger = store.where('student_balance_ledger', (l) => String(l.student_id) === String(s.id))
      .sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 5);
    const results = store.all('exam_results').filter((e) => e.student === s.full_name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    const attendance = store.where('student_attendance_daily', (a) => String(a.student_id) === String(s.id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 14);
    return {
      id: s.id, full_name: s.full_name, group_name: s.group_name, teacher: s.teacher, level: s.level,
      balance: s.balance ?? 0, tariff_price: s.tariff_price ?? 0, status: s.status, progress: s.progress ?? 0,
      ledger, results, attendance,
    };
  });

  res.json(result);
});

export default r;
