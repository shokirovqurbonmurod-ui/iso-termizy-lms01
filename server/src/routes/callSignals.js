// WebRTC signalizatsiya relesi — 1:1 audio/video qo'ng'iroq uchun offer/answer/ICE xabarlarini
// ikki tomon o'rtasida uzatadi. Media (ovoz/video) to'g'ridan-to'g'ri P2P oqadi, faqat ulanishni
// o'rnatish uchun kerakli qisqa xabarlar shu orqali (REST polling bilan) almashinadi.
import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

// ?channel=&after= — shu DM kanalidagi, berilgan id'dan keyingi signallar.
r.get('/', (req, res) => {
  const { channel, after } = req.query;
  let rows = store.all('call_signals');
  if (channel) rows = rows.filter((s) => s.channel === channel);
  if (after) rows = rows.filter((s) => Number(s.id) > Number(after));
  res.json(rows);
});

r.post('/', (req, res) => {
  const { channel, to, type, payload } = req.body || {};
  if (!channel || !to || !type) return res.status(400).json({ error: 'channel, to, type kerak' });
  const created = store.insert('call_signals', {
    channel, from: req.user.name, to, type, payload: payload ?? null,
    at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
  res.status(201).json(created);
});

export default r;
