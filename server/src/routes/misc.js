import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';
import { ROLE_LABEL } from '../roles.js';

const r = express.Router();
r.use(authRequired);

// GET /api/stats
r.get('/stats', (_req, res) => {
  const payments = store.all('payments');
  const students = store.all('students');
  const expenses = store.all('expenses');
  const revenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const totalExpenses = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  res.json({
    students: students.length,
    activeStudents: students.filter((s) => s.status === 'active').length,
    teachers: store.count('teachers'),
    groups: store.count('groups'),
    courses: store.count('courses'),
    leads: store.count('leads'),
    branches: store.count('branches'),
    revenue,
    expenses: totalExpenses,
    netProfit: revenue - totalExpenses,
    pendingPayments: payments.filter((p) => p.status === 'pending').length,
    staff: store.where('users', (u) => !['student', 'parent'].includes(u.role)).length,
    totalCoins: students.reduce((a, s) => a + (Number(s.coins) || 0), 0),
    totalPoints: students.reduce((a, s) => a + (Number(s.points) || 0), 0),
    avgProgress: Math.round(students.reduce((a, s) => a + (Number(s.progress) || 0), 0) / (students.length || 1)),
  });
});

// GET /api/staff
r.get('/staff', (_req, res) => {
  const rows = store.where('users', (u) => !['student', 'parent'].includes(u.role))
    .slice().sort((a, b) => a.id - b.id)
    .map((u) => ({ id: u.id, full_name: u.full_name, phone: u.phone, role: u.role, group_name: u.group_name, branch: u.branch, active: u.active, role_label: ROLE_LABEL[u.role] || u.role }));
  res.json(rows);
});

// GET /api/general_coins
r.get('/general_coins', (_req, res) => {
  let general = store.all('general_coins')[0];
  if (!general) general = store.insert('general_coins', { name: 'Umumiy hisob', coins: 10000 });
  res.json([general]);
});

// GET /api/leaderboard
r.get('/leaderboard', (_req, res) => {
  res.json(store.all('students').sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 100));
});

// GET /api/audit
r.get('/audit', (_req, res) => res.json(store.all('audit_log').slice(-10000).reverse()));

export default r;
