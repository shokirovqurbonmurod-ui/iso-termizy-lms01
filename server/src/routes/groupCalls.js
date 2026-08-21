// Guruh audio/video chat — mesh WebRTC: har bir qo'shiluvchi ALLAQACHON ichkaridagi har bir
// ishtirokchi bilan alohida peer-to-peer ulanish o'rnatadi. Bu jadval faqat "hozir kim ichkarida"
// ro'yxatini yuritadi; signalizatsiya (offer/answer/ICE) call_signals orqali boradi.
import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

r.get('/', (req, res) => {
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'channel kerak' });
  res.json(store.where('group_call_participants', (p) => p.channel === channel));
});

// Qo'shilishdan OLDINGI ishtirokchilar ro'yxatini qaytaradi — mijoz shu ro'yxatdagilarga offer yuboradi.
r.post('/join', (req, res) => {
  const { channel, kind } = req.body || {};
  if (!channel) return res.status(400).json({ error: 'channel kerak' });
  const existing = store.where('group_call_participants', (p) => p.channel === channel);
  const already = existing.find((p) => p.user === req.user.name);
  if (!already) {
    store.insert('group_call_participants', {
      channel, user: req.user.name, kind: kind || 'audio',
      joined_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  }
  res.json({ participants: existing.filter((p) => p.user !== req.user.name) });
});

r.post('/leave', (req, res) => {
  const { channel } = req.body || {};
  const mine = store.where('group_call_participants', (p) => p.channel === channel && p.user === req.user.name)[0];
  if (mine) store.remove('group_call_participants', mine.id);
  res.json({ ok: true });
});

export default r;
