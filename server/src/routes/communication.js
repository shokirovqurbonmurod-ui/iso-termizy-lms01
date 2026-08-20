// Aloqa markazi statistikasi — faqat haqiqiy, hisoblanadigan ko'rsatkichlar (soxta "online"
// yoki soxta SLA raqamlari yo'q). "Faol" haqiqiy presence tizimi bo'lmagani uchun so'nggi 15
// daqiqada xabar yozganlar soni bilan taxminiy o'lchanadi.
import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
function minutesAgo(n) { return new Date(Date.now() - n * 60000).toISOString().slice(0, 16).replace('T', ' '); }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString().slice(0, 16).replace('T', ' '); }

r.get('/stats', (req, res) => {
  const messages = store.all('chat_messages');
  const tickets = store.all('tickets');
  const replies = store.all('ticket_replies');
  const announcements = store.all('announcements');
  const reads = store.all('announcement_reads');

  const totalChannels = new Set(messages.map((m) => m.channel)).size;
  const messagesToday = messages.filter((m) => (m.timestamp || '').startsWith(today())).length;
  const messagesLastHour = messages.filter((m) => (m.timestamp || '') >= hoursAgo(1)).length;
  const activeNow = new Set(messages.filter((m) => (m.timestamp || '') >= minutesAgo(15)).map((m) => m.sender)).size;

  const ticketStats = {
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
    urgent: tickets.filter((t) => t.priority === 'yuqori' && !['resolved', 'closed'].includes(t.status)).length,
  };

  // Har bir tiketning birinchi javobigacha o'tgan vaqt (soatlarda) — haqiqiy javob tezligi.
  const firstResponseHours = [];
  for (const t of tickets) {
    if (!t.date) continue;
    const firstReply = replies.filter((rp) => String(rp.ticket_id) === String(t.id)).sort((a, b) => (a.at || '').localeCompare(b.at || ''))[0];
    if (!firstReply) continue;
    const created = new Date(t.date).getTime();
    const responded = new Date((firstReply.at || '').replace(' ', 'T')).getTime();
    if (Number.isFinite(created) && Number.isFinite(responded) && responded >= created) {
      firstResponseHours.push((responded - created) / 3600000);
    }
  }
  const avgResponseHours = firstResponseHours.length
    ? Math.round((firstResponseHours.reduce((a, b) => a + b, 0) / firstResponseHours.length) * 10) / 10
    : null;

  const myReadIds = new Set(reads.filter((rr) => rr.user_name === req.user.name).map((rr) => String(rr.announcement_id)));
  const unreadForMe = announcements.filter((a) => !myReadIds.has(String(a.id))).length;

  const countByChannel = {};
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 16).replace('T', ' ');
  for (const m of messages) {
    if ((m.timestamp || '') < weekAgo) continue;
    countByChannel[m.channel] = (countByChannel[m.channel] || 0) + 1;
  }
  const topChannels = Object.entries(countByChannel).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([channel, count]) => ({ channel, count }));

  res.json({
    totalChannels, messagesToday, messagesLastHour, activeNow,
    tickets: ticketStats, avgResponseHours,
    announcements: { total: announcements.length, unreadForMe },
    topChannels,
  });
});

export default r;
