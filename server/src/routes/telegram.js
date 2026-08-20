import express from 'express';
import { authRequired } from '../auth.js';
import { store } from '../db.js';
import { isAdmin } from '../roles.js';
import { notifyAll } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

function adminOnly(req, res, next) {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  next();
}

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

let botInfoCache = null;

// Botning o'zi haqida (username) — foydalanuvchi botga /start yozishi uchun link kerak.
r.get('/me', async (_req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan.' });
  if (botInfoCache) return res.json(botInfoCache);
  try {
    const resp = await fetch(`${API()}/getMe`);
    const data = await resp.json();
    if (!data.ok) return res.status(502).json({ error: data.description || 'Telegram xatosi' });
    botInfoCache = { username: data.result.username, name: data.result.first_name };
    res.json(botInfoCache);
  } catch (e) { res.status(502).json({ error: "Telegram bilan bog'lanishda xatolik: " + e.message }); }
});

r.get('/recipients', adminOnly, (_req, res) => {
  res.json(store.all('telegram_recipients'));
});

r.post('/recipients', adminOnly, (req, res) => {
  const { chat_id, name, student_id, student_name } = req.body || {};
  if (!chat_id || !name) return res.status(400).json({ error: "chat_id va ism kerak." });
  if (store.where('telegram_recipients', (r2) => String(r2.chat_id) === String(chat_id)).length) {
    return res.status(400).json({ error: "Bu foydalanuvchi allaqachon qo'shilgan." });
  }
  const row = store.insert('telegram_recipients', {
    chat_id, name,
    student_id: student_id || null, student_name: student_id ? (student_name || '') : '',
    added_by: req.user.name, at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
  res.json(row);
});

r.delete('/recipients/:id', adminOnly, (req, res) => {
  store.remove('telegram_recipients', req.params.id);
  res.json({ ok: true });
});

r.post('/test', adminOnly, async (_req, res) => {
  const recipients = store.all('telegram_recipients');
  if (!recipients.length) return res.status(400).json({ error: "Qabul qiluvchi qo'shilmagan." });
  await notifyAll('🔔 ISO Termizy Avlodlari — test xabari. Bildirishnomalar to\'g\'ri sozlangan!');
  res.json({ ok: true, sent: recipients.length });
});

export default r;
