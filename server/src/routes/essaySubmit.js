import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

// O'quvchi o'z essesini yozib topshiradi — faqat O'ZI nomidan (req.user.name'dan olinadi,
// klient tomondan berilmaydi), canMutate'dan chetlab o'tadi. Tekshirish/baholash alohida —
// faqat o'qituvchi/admin generic /essays PUT orqali qila oladi.
r.post('/submit', (req, res) => {
  const { title, subject, content } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ error: 'Mavzu kerak' });
  const student = req.user.name;
  const text = String(content || '');
  const word_count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const created = store.insert('essays', {
    student, title, subject: subject || '', content: text, word_count,
    score: 0, feedback: '', reviewer: '', coin_reward: 0,
    date: new Date().toISOString().slice(0, 10), status: 'pending',
  });
  logAudit(student, 'submit essay', title);
  res.status(201).json(created);
});

export default r;
