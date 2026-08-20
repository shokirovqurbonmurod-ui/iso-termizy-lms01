import express from 'express';
import bcrypt from 'bcryptjs';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';

const r = express.Router();
r.use(authRequired);

function adminOnly(req, res, next) {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Faqat administrator uchun' });
  next();
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 8);
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 9 ? '998' + digits : digits;
}

// O'quvchi va ota-ona portal hisoblari bor-yo'qligini ko'rsatadi — parol hech qachon qaytarilmaydi.
r.get('/:studentId', adminOnly, (req, res) => {
  const student = store.get('students', req.params.studentId);
  if (!student) return res.status(404).json({ error: 'O\'quvchi topilmadi' });
  const studentAcc = store.where('users', (u) => u.role === 'student' && u.phone === normalizePhone(student.phone))[0];
  const parentAcc = store.where('users', (u) => u.role === 'parent' && u.phone === normalizePhone(student.parent_phone))[0];
  res.json({
    student: { exists: !!studentAcc, phone: studentAcc?.phone || null },
    parent: { exists: !!parentAcc, phone: parentAcc?.phone || null },
  });
});

// Portal hisobi yaratish (o'quvchi yoki ota-ona) — tasodifiy parol bir marta qaytariladi.
r.post('/:studentId/create', adminOnly, (req, res) => {
  const student = store.get('students', req.params.studentId);
  if (!student) return res.status(404).json({ error: 'O\'quvchi topilmadi' });
  const role = req.body?.role === 'parent' ? 'parent' : 'student';
  const sourcePhone = role === 'parent' ? student.parent_phone : student.phone;
  const normalized = normalizePhone(sourcePhone);
  if (!normalized) {
    return res.status(400).json({ error: role === 'parent' ? "Avval ota-ona telefon raqamini kiriting." : "Avval o'quvchining telefon raqamini kiriting." });
  }
  if (store.where('users', (u) => u.phone === normalized).length) {
    return res.status(400).json({ error: 'Bu telefon raqamga hisob allaqachon mavjud.' });
  }
  const password = randomPassword();
  store.insert('users', {
    phone: normalized, password_hash: bcrypt.hashSync(password, 8),
    role, full_name: role === 'parent' ? (student.parent_name || `${student.full_name} ota-onasi`) : student.full_name,
    group_name: student.group_name || '', branch: 'Sherobod — Bosh filial', active: 1,
  });
  logAudit(req.user.name, `create ${role} portal account`, student.full_name);
  res.json({ phone: normalized, password, role });
});

// Parolni tiklash — yangi tasodifiy parol bir marta qaytariladi.
r.post('/:studentId/reset', adminOnly, (req, res) => {
  const student = store.get('students', req.params.studentId);
  if (!student) return res.status(404).json({ error: 'O\'quvchi topilmadi' });
  const role = req.body?.role === 'parent' ? 'parent' : 'student';
  const sourcePhone = role === 'parent' ? student.parent_phone : student.phone;
  const account = store.where('users', (u) => u.role === role && u.phone === normalizePhone(sourcePhone))[0];
  if (!account) return res.status(404).json({ error: 'Portal hisobi topilmadi' });
  const password = randomPassword();
  store.update('users', account.id, { password_hash: bcrypt.hashSync(password, 8) });
  logAudit(req.user.name, `reset ${role} portal password`, student.full_name);
  res.json({ phone: account.phone, password, role });
});

export default r;
