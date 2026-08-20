import express from 'express';
import { authRequired, canMutate } from '../auth.js';
import { store, logAudit } from '../db.js';

const r = express.Router();
r.use(authRequired);

// Faqat eng yuqori ishonch darajasidagi rollar ruxsatlarni o'zgartira oladi — aks holda
// oddiy admin o'ziga o'zi qo'shimcha ruxsat berib, huquqini oshirib olishi mumkin edi.
function canEditRoles(role) {
  return ['founder', 'director', 'super_admin'].includes(role);
}

// Har bir foydalanuvchi o'z menyusini hisoblash uchun buni o'qiy oladi.
r.get('/', (_req, res) => {
  res.json(store.all('role_overrides'));
});

// {role, menu_key, allowed} — mavjud bo'lsa yangilanadi, bo'lmasa yaratiladi.
r.post('/', canMutate, (req, res) => {
  if (!canEditRoles(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { role, menu_key, allowed } = req.body || {};
  if (!role || !menu_key || typeof allowed !== 'boolean') {
    return res.status(400).json({ error: "role, menu_key va allowed (true/false) kerak." });
  }
  const existing = store.where('role_overrides', (o) => o.role === role && o.menu_key === menu_key)[0];
  if (existing) store.update('role_overrides', existing.id, { allowed });
  else store.insert('role_overrides', { role, menu_key, allowed });
  logAudit(req.user.name, 'update role_overrides', `${role} → ${menu_key} = ${allowed}`);
  res.json({ ok: true });
});

// Standart holatga qaytarish (override'ni butunlay o'chirish).
r.delete('/:role/:menuKey', canMutate, (req, res) => {
  if (!canEditRoles(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { role, menuKey } = req.params;
  const existing = store.where('role_overrides', (o) => o.role === role && o.menu_key === menuKey)[0];
  if (existing) store.remove('role_overrides', existing.id);
  logAudit(req.user.name, 'reset role_overrides', `${role} → ${menuKey}`);
  res.json({ ok: true });
});

export default r;
