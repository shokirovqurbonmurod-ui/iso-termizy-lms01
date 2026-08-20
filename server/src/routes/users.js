import express from 'express';
import bcrypt from 'bcryptjs';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { ROLE_LABEL, isAdmin } from '../roles.js';

const r = express.Router();
r.use(authRequired);

function adminOnly(req, res, next) {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Faqat administrator uchun' });
  next();
}

// GET /api/users — barcha foydalanuvchilar (parolsiz)
r.get('/', adminOnly, (_req, res) => {
  const rows = store.all('users').sort((a, b) => a.id - b.id).map((u) => ({
    id: u.id, full_name: u.full_name, phone: u.phone, role: u.role,
    role_label: ROLE_LABEL[u.role] || u.role, group_name: u.group_name,
    branch: u.branch, active: u.active,
  }));
  res.json(rows);
});

// POST /api/users — yangi foydalanuvchi (parol bilan)
r.post('/', adminOnly, (req, res) => {
  const { full_name, phone, role, group_name, password } = req.body || {};
  if (!full_name || !phone || !password) return res.status(400).json({ error: 'Ism, telefon va parol majburiy' });
  const clean = String(phone).replace(/\D/g, '');
  const normalized = clean.length === 9 ? '998' + clean : clean;
  if (store.where('users', (u) => u.phone === normalized).length) {
    return res.status(400).json({ error: 'Bu telefon raqam allaqachon mavjud' });
  }
  const created = store.insert('users', {
    phone: normalized, password_hash: bcrypt.hashSync(String(password), 8),
    role: role || 'teacher', full_name, group_name: group_name || '',
    branch: 'Sherobod — Bosh filial', active: 1,
  });
  logAudit(req.user.name, 'create user', full_name);
  res.status(201).json({ id: created.id, full_name, phone: normalized, role: created.role });
});

// PUT /api/users/:id — ism/telefon/rol/guruhni tahrirlash
r.put('/:id', adminOnly, (req, res) => {
  const u = store.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const { full_name, phone, role, group_name } = req.body || {};
  const patch = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (role !== undefined) patch.role = role;
  if (group_name !== undefined) patch.group_name = group_name;
  if (phone !== undefined) {
    const clean = String(phone).replace(/\D/g, '');
    const normalized = clean.length === 9 ? '998' + clean : clean;
    if (normalized !== u.phone && store.where('users', (x) => x.phone === normalized).length) {
      return res.status(400).json({ error: 'Bu telefon raqam allaqachon mavjud' });
    }
    patch.phone = normalized;
  }
  const updated = store.update('users', req.params.id, patch);
  logAudit(req.user.name, 'update user', updated.full_name);
  res.json({
    id: updated.id, full_name: updated.full_name, phone: updated.phone, role: updated.role,
    role_label: ROLE_LABEL[updated.role] || updated.role, group_name: updated.group_name,
    branch: updated.branch, active: updated.active,
  });
});

// DELETE /api/users/:id — foydalanuvchini o'chirish
r.delete('/:id', adminOnly, (req, res) => {
  const u = store.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  if (u.id === req.user.id) return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
  store.remove('users', req.params.id);
  logAudit(req.user.name, 'delete user', u.full_name);
  res.json({ ok: true });
});

// PUT /api/users/:id/password — parolni almashtirish
r.put('/:id/password', adminOnly, (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 4) return res.status(400).json({ error: 'Parol kamida 4 belgi' });
  const u = store.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  store.update('users', req.params.id, { password_hash: bcrypt.hashSync(String(password), 8) });
  logAudit(req.user.name, 'reset password', u.full_name);
  res.json({ ok: true, full_name: u.full_name });
});

// PUT /api/users/:id/toggle — faol/nofaol
r.put('/:id/toggle', adminOnly, (req, res) => {
  const u = store.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Topilmadi' });
  const updated = store.update('users', req.params.id, { active: u.active ? 0 : 1 });
  logAudit(req.user.name, updated.active ? 'activate user' : 'deactivate user', u.full_name);
  res.json({ ok: true, active: updated.active });
});

export default r;
