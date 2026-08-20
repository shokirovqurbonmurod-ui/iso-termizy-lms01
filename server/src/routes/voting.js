// Saylov / Tez so'rovnoma — bitta xuddi shu tizim ikkala menyu bandiga xizmat qiladi.
// "polls" jadvali so'rov ta'rifini (savol + variantlar), "student_voting" esa har bir ovozni
// (kim, qaysi variantga) saqlaydi — shu orqali "bir kishi bir marta" qoidasi serverda ta'minlanadi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);

function myVoterName(req) {
  return req.user.name;
}

function withResults(poll, req) {
  const votes = store.where('student_voting', (v) => String(v.poll_id) === String(poll.id));
  const options = JSON.parse(poll.options || '[]');
  const counts = options.map((_, i) => votes.filter((v) => Number(v.option_index) === i).length);
  const total = votes.length;
  const myVote = votes.find((v) => v.voter === myVoterName(req));
  return {
    id: poll.id, question: poll.question, status: poll.status, created_by: poll.created_by, date: poll.date,
    options, counts, total,
    percentages: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)),
    myVoteIndex: myVote ? Number(myVote.option_index) : null,
  };
}

r.get('/polls', (req, res) => {
  const polls = store.all('polls').map((p) => withResults(p, req));
  res.json(polls);
});

r.post('/polls', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { question, options } = req.body || {};
  const opts = Array.isArray(options) ? options.map((o) => String(o).trim()).filter(Boolean) : [];
  if (!question?.trim() || opts.length < 2) return res.status(400).json({ error: "Savol va kamida 2 ta variant kerak." });
  const row = store.insert('polls', {
    question: question.trim(), options: JSON.stringify(opts), votes_count: 0, status: 'active',
    created_by: req.user.name, date: now().slice(0, 10),
  });
  logAudit(req.user.name, 'create poll', row.question);
  res.status(201).json(withResults(row, req));
});

r.post('/polls/:id/vote', (req, res) => {
  const poll = store.get('polls', req.params.id);
  if (!poll) return res.status(404).json({ error: 'Topilmadi' });
  if (poll.status !== 'active') return res.status(400).json({ error: "Bu so'rovnoma yopilgan." });
  const { option_index } = req.body || {};
  const options = JSON.parse(poll.options || '[]');
  const idx = Number(option_index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return res.status(400).json({ error: "Noto'g'ri variant." });

  const voter = myVoterName(req);
  const existing = store.where('student_voting', (v) => String(v.poll_id) === String(poll.id) && v.voter === voter)[0];
  if (existing) return res.status(409).json({ error: 'Siz bu so\'rovnomaga allaqachon ovoz bergansiz.' });

  store.insert('student_voting', { poll_id: poll.id, voter, option_index: idx, at: now() });
  store.update('polls', poll.id, { votes_count: (Number(poll.votes_count) || 0) + 1 });
  res.json(withResults(store.get('polls', poll.id), req));
});

r.post('/polls/:id/close', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const poll = store.get('polls', req.params.id);
  if (!poll) return res.status(404).json({ error: 'Topilmadi' });
  store.update('polls', poll.id, { status: 'closed' });
  logAudit(req.user.name, 'close poll', poll.question);
  res.json(withResults(store.get('polls', poll.id), req));
});

r.delete('/polls/:id', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  for (const v of store.where('student_voting', (x) => String(x.poll_id) === req.params.id)) store.remove('student_voting', v.id);
  store.remove('polls', req.params.id);
  logAudit(req.user.name, 'delete poll', `#${req.params.id}`);
  res.json({ ok: true });
});

export default r;
