import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

r.get('/', (req, res) => {
  const mine = store.all('group_memberships').filter(m => m.user_name === req.user.name);
  res.json(mine);
});

r.post('/join', (req, res) => {
  const { group_name, code } = req.body || {};
  if (!group_name || !String(code || '').trim()) return res.status(400).json({ error: "Guruh va kodni kiriting" });
  const group = store.all('groups').find(g => g.name === group_name);
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  if (String(group.invite_code || '').trim().toLowerCase() !== String(code).trim().toLowerCase()) {
    return res.status(400).json({ error: "Kod noto'g'ri" });
  }
  const existing = store.all('group_memberships').find(m => m.group_name === group_name && m.user_name === req.user.name);
  if (existing) return res.json({ ok: true, already: true });
  const created = store.insert('group_memberships', {
    group_name, user_name: req.user.name, user_role: req.user.role, joined_at: new Date().toISOString(),
  });
  logAudit(req.user.name, 'join group', group_name);
  res.status(201).json({ ok: true, membership: created });
});

export default r;
