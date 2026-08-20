import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);
const canDecide = (role) => isAdmin(role) || role === 'hr';

// table: 'advance_requests' | 'expense_reports'
function tableFor(kind) {
  return kind === 'expense' ? 'expense_reports' : 'advance_requests';
}

r.get('/:kind', (req, res) => {
  const table = tableFor(req.params.kind);
  let rows = store.all(table);
  if (!canDecide(req.user.role)) rows = rows.filter((x) => x.staff === req.user.name);
  res.json(rows);
});

r.post('/:kind', (req, res) => {
  const table = tableFor(req.params.kind);
  const { amount, reason, receipt_url } = req.body || {};
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: "Summani to'g'ri kiriting" });
  const row = store.insert(table, {
    staff: req.user.name, role: req.user.role, amount: amt, reason: reason || '',
    receipt_url: receipt_url || null, status: 'pending', requested_at: now(), date: today(), decided_by: null,
  });
  logAudit(req.user.name, `${req.params.kind} request`, `${amt}`);
  res.json(row);
});

r.put('/:kind/:id/decide', (req, res) => {
  if (!canDecide(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const table = tableFor(req.params.kind);
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: "status noto'g'ri" });
  const row = store.get(table, req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  const updated = store.update(table, row.id, { status, decided_by: req.user.name });
  logAudit(req.user.name, `${req.params.kind} ${status}`, `${row.staff} · ${row.amount}`);
  res.json(updated);
});

r.delete('/:kind/:id', (req, res) => {
  const table = tableFor(req.params.kind);
  const row = store.get(table, req.params.id);
  if (row && row.staff !== req.user.name && !canDecide(req.user.role)) {
    return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  }
  store.remove(table, req.params.id);
  res.json({ ok: true });
});

export default r;
