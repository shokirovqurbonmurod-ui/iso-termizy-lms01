import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const DAY_MS = 24 * 60 * 60 * 1000;

// Muddat uzunroq bo'lsa — foiz ham yuqoriroq (sabr-toqat uchun gamifikatsiya mukofoti).
function interestRate(days) {
  if (days >= 30) return 0.30;
  if (days >= 7) return 0.15;
  if (days >= 3) return 0.05;
  return 0;
}

function myStudent(req) {
  if (req.user.role === 'student') return store.all('students').find((s) => s.full_name === req.user.name);
  return null;
}

function resolveStudent(req, studentId) {
  const mine = myStudent(req);
  if (mine) return mine;
  return studentId ? store.get('students', studentId) : null;
}

r.get('/', (req, res) => {
  const mine = myStudent(req);
  const studentId = mine ? mine.id : req.query.student_id;
  let rows = store.all('coin_bank');
  if (studentId) rows = rows.filter((d) => String(d.student_id) === String(studentId));
  res.json(rows);
});

r.post('/deposit', (req, res) => {
  const { student_id, amount } = req.body || {};
  const amt = Number(amount) || 0;
  const student = resolveStudent(req, student_id);
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });
  if (amt <= 0) return res.status(400).json({ error: "Miqdor 0 dan katta bo'lsin" });
  const coins = Number(student.coins) || 0;
  if (amt > coins) return res.status(400).json({ error: 'Coin yetarli emas' });

  store.update('students', student.id, { coins: coins - amt });
  const row = store.insert('coin_bank', {
    student_id: student.id, student_name: student.full_name, amount: amt,
    deposited_at: now(), status: 'active', withdrawn_at: null, interest_paid: null,
  });
  logAudit(req.user.name, `coin bank deposit ${amt}`, student.full_name);
  res.json({ ok: true, deposit: row, student: store.get('students', student.id) });
});

r.post('/withdraw/:id', (req, res) => {
  const row = store.get('coin_bank', req.params.id);
  if (!row || row.status !== 'active') return res.status(404).json({ error: 'Faol depozit topilmadi' });
  const mine = myStudent(req);
  if (mine && row.student_id !== mine.id) return res.status(403).json({ error: "Bu depozit sizniki emas" });

  const days = Math.floor((Date.now() - new Date(row.deposited_at.replace(' ', 'T')).getTime()) / DAY_MS);
  const rate = interestRate(days);
  const interest = Math.round(row.amount * rate);
  const total = row.amount + interest;

  const student = store.get('students', row.student_id);
  store.update('students', row.student_id, { coins: (Number(student?.coins) || 0) + total });
  store.update('coin_bank', row.id, { status: 'withdrawn', withdrawn_at: now(), interest_paid: interest });
  logAudit(req.user.name, `coin bank withdraw ${total}`, row.student_name);
  res.json({ ok: true, days, rate, interest, total, student: store.get('students', row.student_id) });
});

r.delete('/:id', (req, res) => {
  const row = store.get('coin_bank', req.params.id);
  if (row && row.status === 'active') return res.status(400).json({ error: "Faol depozitni o'chirib bo'lmaydi — avval yechib oling." });
  store.remove('coin_bank', req.params.id);
  res.json({ ok: true });
});

export default r;
