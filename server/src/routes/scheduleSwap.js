import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';
import { notifyGroupTopic } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const canDecide = (role) => isAdmin(role) || ['academic_manager', 'head_teacher'].includes(role);

// O'qituvchi o'zinikini, admin/o'quv bo'lim hammasini ko'radi.
r.get('/', (req, res) => {
  let rows = store.all('teacher_schedule_swap');
  if (!canDecide(req.user.role)) rows = rows.filter((s) => s.teacher === req.user.name);
  res.json(rows);
});

// O'qituvchi dars almashtirish/o'rin bosuvchi so'rovi yuboradi.
r.post('/request', (req, res) => {
  const { group_name, date, reason, substitute_teacher } = req.body || {};
  if (!group_name || !date) return res.status(400).json({ error: "Guruh va sanani kiriting" });
  const group = store.all('groups').find((g) => g.name === group_name);
  const row = store.insert('teacher_schedule_swap', {
    teacher: req.user.name, group_name, date, reason: reason || '',
    substitute_teacher: substitute_teacher || '', status: 'pending',
    requested_at: now(), decided_by: null,
  });
  logAudit(req.user.name, 'schedule swap request', `${group_name} · ${date}`);
  // Guruhning Telegram topicida ham bilinsin — davomat topici bilan bir xil kanaldan foydalanadi.
  if (group) notifyGroupTopic(group_name, `🔄 ${req.user.name} ${date} sanadagi darsini almashtirish so'radi. Tasdiqlanishi kutilmoqda.`).catch(() => {});
  res.json(row);
});

r.put('/:id/decide', (req, res) => {
  if (!canDecide(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { status, substitute_teacher } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: "status 'approved' yoki 'rejected' bo'lishi kerak" });
  const row = store.get('teacher_schedule_swap', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  const updated = store.update('teacher_schedule_swap', row.id, {
    status, decided_by: req.user.name,
    substitute_teacher: substitute_teacher || row.substitute_teacher || '',
  });
  logAudit(req.user.name, `schedule swap ${status}`, `${row.teacher} · ${row.group_name} · ${row.date}`);
  if (status === 'approved') {
    const subText = updated.substitute_teacher ? ` O'rniga: ${updated.substitute_teacher}.` : '';
    notifyGroupTopic(row.group_name, `✅ ${row.date} sanadagi dars almashtirish tasdiqlandi.${subText}`).catch(() => {});
  }
  res.json(updated);
});

r.delete('/:id', (req, res) => {
  const row = store.get('teacher_schedule_swap', req.params.id);
  if (row && row.teacher !== req.user.name && !canDecide(req.user.role)) {
    return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  }
  store.remove('teacher_schedule_swap', req.params.id);
  res.json({ ok: true });
});

export default r;
