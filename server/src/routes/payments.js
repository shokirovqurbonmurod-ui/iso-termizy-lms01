import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';

const COLUMNS = ['student', 'group_name', 'amount', 'date', 'status', 'method', 'card_number'];
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const r = express.Router();
r.use(authRequired);

r.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  res.json(store.list('payments', { q: req.query.q, limit }));
});

r.get('/:id', (req, res) => {
  const row = store.get('payments', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  res.json(row);
});

// Oddiy CRUD kabi ishlaydi, faqat "to'landi" holatidagi to'lov avtomatik ravishda
// o'quvchining balansiga qo'shiladi va shaxsiy hisob-kitob jurnaliga yoziladi.
r.post('/', canMutate, (req, res) => {
  const row = {};
  for (const c of COLUMNS) row[c] = (c in req.body) ? req.body[c] : '';
  const created = store.insert('payments', row);
  logAudit(req.user.name, 'create payments', `#${created.id}`);

  if (created.status === 'paid' && Number(created.amount) > 0) {
    const student = store.all('students').find((s) => s.full_name === created.student);
    if (student) {
      const newBalance = (Number(student.balance) || 0) + Number(created.amount);
      store.update('students', student.id, { balance: newBalance });
      store.insert('student_balance_ledger', {
        student_id: student.id, student_name: student.full_name,
        type: 'credit', amount: Number(created.amount), reason: `To'lov${created.method ? ` (${created.method})` : ''}`,
        date: created.date || now().slice(0, 10), staff: req.user.name, at: now(),
      });
    }
  }
  res.status(201).json(created);
});

r.put('/:id', canMutate, (req, res) => {
  const patch = {};
  for (const c of COLUMNS) if (c in req.body) patch[c] = req.body[c];
  const updated = store.update('payments', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Topilmadi' });
  logAudit(req.user.name, 'update payments', `#${req.params.id}`);
  res.json(updated);
});

r.delete('/:id', canMutate, (req, res) => {
  store.remove('payments', req.params.id);
  logAudit(req.user.name, 'delete payments', `#${req.params.id}`);
  res.json({ ok: true });
});

export default r;
