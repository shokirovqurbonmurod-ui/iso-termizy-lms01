import express from 'express';
import { authRequired, canMutate } from '../auth.js';
import { store, logAudit } from '../db.js';
import { isAdmin } from '../roles.js';

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const r = express.Router();
r.use(authRequired);

// ?student_id= — bitta o'quvchining to'liq hisob-kitob tarixi (kredit/debit).
r.get('/', (req, res) => {
  const { student_id } = req.query;
  let rows = store.all('student_balance_ledger');
  if (student_id) rows = rows.filter((l) => String(l.student_id) === String(student_id));
  res.json(rows);
});

// Qo'lda balans tuzatish — masalan chegirma, bonus yoki xato tuzatish uchun.
r.post('/adjust', canMutate, (req, res) => {
  const { student_id, type, amount, reason } = req.body || {};
  if (!student_id || !['credit', 'debit'].includes(type) || !(Number(amount) > 0)) {
    return res.status(400).json({ error: "student_id, type (credit/debit) va musbat amount kerak." });
  }
  const student = store.get('students', student_id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi." });

  const delta = type === 'credit' ? Number(amount) : -Number(amount);
  const newBalance = (Number(student.balance) || 0) + delta;
  store.update('students', student.id, { balance: newBalance });
  const row = store.insert('student_balance_ledger', {
    student_id: student.id, student_name: student.full_name,
    type, amount: Number(amount), reason: reason || (type === 'credit' ? "Qo'lda kredit" : "Qo'lda debit"),
    date: new Date().toISOString().slice(0, 10), staff: req.user.name, at: now(),
  });
  logAudit(req.user.name, 'balance adjust', `${student.full_name} ${type} ${amount}`);
  res.json({ ...row, newBalance });
});

// Xato yozuvni o'chirish uchun — faqat admin (moliyaviy tarixni tuzatish).
r.delete('/:id', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('student_balance_ledger', req.params.id);
  logAudit(req.user.name, 'delete balance ledger entry', req.params.id);
  res.json({ ok: true });
});

export default r;
