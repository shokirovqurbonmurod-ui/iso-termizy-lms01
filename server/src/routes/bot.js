import express from 'express';
import { authRequired } from '../auth.js';
import { store, logAudit } from '../db.js';
import { isAdmin } from '../roles.js';
import { createLinkCode, sendMessage, refreshBotCommands, syncMenuButton } from '../botPoller.js';
import { notifyGroupTopic } from '../telegram.js';

// Faqat eng yuqori ishonch darajasidagi rollar bot buyruqlarini boshqara oladi.
function canEditCommands(role) {
  return ['founder', 'director', 'super_admin'].includes(role);
}

const r = express.Router();
r.use(authRequired);

r.post('/link-code', (req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan.' });
  const code = createLinkCode({ id: req.user.id, name: req.user.name, role: req.user.role });
  res.json({ code });
});

// Joriy foydalanuvchining o'zi ulanganmi — bog'lash holatini ko'rsatish uchun.
r.get('/my-link', (req, res) => {
  const link = store.where('telegram_links', (l) => l.user_id === req.user.id)[0] || null;
  res.json(link);
});

r.get('/links', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json(store.all('telegram_links'));
});

r.delete('/links/:id', (req, res) => {
  const link = store.get('telegram_links', req.params.id);
  if (!link) return res.status(404).json({ error: 'Topilmadi' });
  if (link.user_id !== req.user.id && !isAdmin(req.user.role)) {
    return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  }
  store.remove('telegram_links', req.params.id);
  res.json({ ok: true });
});

// Xavfsizlik ogohlantirishlarini (ko'p marta noto'g'ri parol va h.k.) shu hisobga yuborish/yubormaslik.
r.put('/links/:id/security', (req, res) => {
  if (!canEditCommands(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const link = store.get('telegram_links', req.params.id);
  if (!link) return res.status(404).json({ error: 'Topilmadi' });
  const updated = store.update('telegram_links', link.id, { security_alert: !!req.body?.security_alert });
  logAudit(req.user.name, 'toggle security_alert', `${link.user_name} = ${updated.security_alert}`);
  res.json(updated);
});

// Admin: bitta ulangan foydalanuvchiga shaxsiy xabar yuborish.
r.post('/send', async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { chat_id, text } = req.body || {};
  if (!chat_id || !text?.trim()) return res.status(400).json({ error: "chat_id va xabar matni kerak." });
  await sendMessage(chat_id, text.trim());
  logAudit(req.user.name, 'bot send', `chat ${chat_id}`);
  res.json({ ok: true });
});

// Davomat xabarlari yuboriladigan Telegram guruh/topic sozlamalari.
r.get('/settings', (req, res) => {
  if (!canEditCommands(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json(store.all('bot_settings')[0] || {});
});

r.put('/settings', async (req, res) => {
  if (!canEditCommands(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { attendance_chat_id, attendance_topic_id, qa_enabled, mini_app_url, qa_chat_id, qa_topic_id } = req.body || {};
  const cleanUrl = (mini_app_url || '').trim();
  // Telegram web_app tugmasi faqat haqiqiy https:// veb-sahifani qabul qiladi — t.me taklif havolasi
  // yoki boshqa Telegram havolalari BUTTON_URL_INVALID xatosi bilan RAD ETILADI va shu sabab
  // butun /start yoki /help xabari (matni bilan birga) yuborilmay qolishi mumkin edi.
  if (cleanUrl && (!/^https:\/\//i.test(cleanUrl) || /(^|\/\/)t\.me\//i.test(cleanUrl) || /telegram\.(me|org)/i.test(cleanUrl))) {
    return res.status(400).json({ error: "Mini App URL noto'g'ri: bu Telegram havolasi (t.me) emas, ilovaning haqiqiy https:// veb-sahifasi manzili bo'lishi kerak." });
  }
  const existing = store.all('bot_settings')[0];
  // Maydon so'rov tanasida umuman yuborilmagan bo'lsa (undefined) — joriy qiymat saqlanadi (masalan
  // /setqa buyrug'i orqali guruhda o'rnatilgan qa_chat_id, keyin BotPage'dagi eski state bilan
  // boshqa kartani saqlaganda tasodifan o'chib ketmasin). Bo'sh satr ('') esa ataylab tozalash hisoblanadi.
  const keep = (val, key) => (val === undefined ? (existing?.[key] || '') : String(val).trim());
  const payload = {
    attendance_chat_id: keep(attendance_chat_id, 'attendance_chat_id'),
    attendance_topic_id: keep(attendance_topic_id, 'attendance_topic_id'),
    qa_enabled: qa_enabled === undefined ? !!existing?.qa_enabled : !!qa_enabled,
    mini_app_url: mini_app_url === undefined ? (existing?.mini_app_url || '') : cleanUrl,
    qa_chat_id: keep(qa_chat_id, 'qa_chat_id'),
    qa_topic_id: keep(qa_topic_id, 'qa_topic_id'),
  };
  const row = existing ? store.update('bot_settings', existing.id, payload) : store.insert('bot_settings', payload);
  await syncMenuButton();
  logAudit(req.user.name, 'bot_settings', JSON.stringify(payload));
  res.json(row);
});

// Admin: barcha ulangan hisoblarga birdaniga xabar (ommaviy xabar).
r.post('/broadcast', async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'Xabar matni kerak.' });
  const links = store.all('telegram_links');
  await Promise.all(links.map((l) => sendMessage(l.chat_id, text.trim()).catch(() => {})));
  logAudit(req.user.name, 'bot broadcast', `${links.length} ta hisobga`);
  res.json({ ok: true, count: links.length });
});

// Admin: guruhga bog'langan Telegram topicga (yoki umumiy davomat guruhiga) xabar yuborish — savol-javob uchun.
r.post('/group-message', async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { group_name, text } = req.body || {};
  if (!group_name || !text?.trim()) return res.status(400).json({ error: "Guruh va xabar matni kerak." });
  await notifyGroupTopic(group_name, text.trim());
  logAudit(req.user.name, 'bot group message', `${group_name}: ${text.slice(0, 60)}`);
  res.json({ ok: true });
});

// Super admin qo'shadigan maxsus buyruqlar — {name} joyiga foydalanuvchi ismi qo'yiladi.
r.get('/commands', (_req, res) => {
  res.json(store.all('bot_commands'));
});

r.post('/commands', async (req, res) => {
  if (!canEditCommands(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { command, description, response } = req.body || {};
  const clean = String(command || '').trim().toLowerCase().replace(/^\//, '').replace(/[^a-z0-9_]/g, '');
  if (!clean || !response?.trim()) return res.status(400).json({ error: "Buyruq nomi va javob matni kerak." });
  const BUILTIN = ['start', 'balance', 'schedule', 'payments', 'group', 'help'];
  if (BUILTIN.includes(clean)) return res.status(400).json({ error: `/${clean} allaqachon tizim buyrug'i.` });
  const existing = store.where('bot_commands', (c) => c.command === clean)[0];
  if (existing) store.update('bot_commands', existing.id, { description: description || '', response: response.trim() });
  else store.insert('bot_commands', { command: clean, description: description || '', response: response.trim(), created_by: req.user.name });
  await refreshBotCommands();
  logAudit(req.user.name, 'set bot_command', `/${clean}`);
  res.json({ ok: true });
});

r.delete('/commands/:id', async (req, res) => {
  if (!canEditCommands(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('bot_commands', req.params.id);
  await refreshBotCommands();
  res.json({ ok: true });
});

export default r;
