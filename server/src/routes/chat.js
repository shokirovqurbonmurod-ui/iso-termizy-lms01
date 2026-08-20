import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

// Channels visible only to staff — students/parents cannot read or post here.
const STAFF_ONLY_CHANNELS = ["O'qituvchilar"];

r.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  let rows = store.list('chat_messages', { q: req.query.q, limit });
  if (['student', 'parent'].includes(req.user.role)) {
    rows = rows.filter(m => !STAFF_ONLY_CHANNELS.includes(m.channel));
  }
  res.json(rows);
});

r.post('/', (req, res) => {
  const { channel, sender, sender_role, text, timestamp } = req.body || {};
  if (STAFF_ONLY_CHANNELS.includes(channel) && ['student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ error: "Bu kanal faqat o'qituvchilar uchun" });
  }
  const created = store.insert('chat_messages', { channel, sender, sender_role, text, timestamp });
  logAudit(req.user.name, 'create chat_messages', `#${created.id}`);
  res.status(201).json(created);
});

r.delete('/:id', (req, res) => {
  store.remove('chat_messages', req.params.id);
  logAudit(req.user.name, 'delete chat_messages', `#${req.params.id}`);
  res.json({ ok: true });
});

export default r;
