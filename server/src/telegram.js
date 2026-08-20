import { readFileSync } from 'fs';
import { store } from './db.js';

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTo(recipients, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !recipients.length) return;
  await Promise.all(recipients.map((r) =>
    fetch(`${API()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: r.chat_id, text }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.ok) console.error('Telegram sendMessage xatosi:', data.description);
    }).catch((e) => console.error('Telegram sendMessage xatosi:', e.message))
  ));
}

// Diskdagi rasmni (masalan kamera kadrini) berilgan qabul qiluvchilarga sendPhoto orqali yuboradi.
async function sendPhotoTo(recipients, filePath, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !recipients.length || !filePath) return;
  let buffer;
  try { buffer = readFileSync(filePath); } catch { return; }
  await Promise.all(recipients.map(async (r) => {
    try {
      const form = new FormData();
      form.append('chat_id', String(r.chat_id));
      if (caption) form.append('caption', caption);
      form.append('photo', new Blob([buffer]), 'photo.jpg');
      const res = await fetch(`${API()}/sendPhoto`, { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) console.error('Telegram sendPhoto xatosi:', data.description);
    } catch (e) { console.error('Telegram sendPhoto xatosi:', e.message); }
  }));
}

// Hammaga (xodim/direktor rejimida qo'shilganlarga) — sozlamalardagi "Test xabar" shu orqali ishlaydi.
export async function notifyAll(text) {
  await sendTo(store.all('telegram_recipients'), text);
}

// Faqat shu o'quvchiga bog'langan ota-onalarga + umumiy (o'quvchiga bog'lanmagan, xodim) qabul qiluvchilarga.
// photoPath berilsa — matn o'rniga surat (kirish/chiqish kadri) caption bilan yuboriladi.
export async function notifyForStudent(studentId, text, photoPath) {
  const recipients = store.all('telegram_recipients')
    .filter((r) => !r.student_id || String(r.student_id) === String(studentId));
  if (photoPath) await sendPhotoTo(recipients, photoPath, text);
  else await sendTo(recipients, text);
}

// "Bot" sahifasida xavfsizlik ogohlantirishlarini olish deb belgilangan ulangan hisoblar
// (masalan ko'p marta noto'g'ri parol kiritilganda yoki kamera begona yuzni aniqlaganda).
export async function notifySecurityOwners(text, photoPath) {
  const owners = store.all('telegram_links').filter((l) => l.security_alert);
  if (photoPath) await sendPhotoTo(owners, photoPath, text);
  else await sendTo(owners, text);
}

// "Davomat" uchun ulangan Telegram guruhi/topic — Bot sahifasida sozlanadi.
function getBotSettings() { return store.all('bot_settings')[0] || null; }

export async function notifyAttendanceGroup(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const settings = getBotSettings();
  if (!token || !settings?.attendance_chat_id) return;
  const body = { chat_id: settings.attendance_chat_id, text };
  if (settings.attendance_topic_id) body.message_thread_id = Number(settings.attendance_topic_id);
  const res = await fetch(`${API()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  if (data && !data.ok) console.error('Telegram davomat guruhi xatosi:', data.description);
}

// Guruhning o'ziga bog'langan Telegram chat/topic bo'lsa — o'sha yerga; bo'lmasa umumiy davomat guruhiga yuboradi.
export async function notifyGroupTopic(groupName, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const group = store.all('groups').find((g) => g.name === groupName);
  if (!group?.telegram_chat_id) return notifyAttendanceGroup(text);
  const body = { chat_id: group.telegram_chat_id, text };
  if (group.telegram_topic_id) body.message_thread_id = Number(group.telegram_topic_id);
  const res = await fetch(`${API()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  if (data && !data.ok) console.error('Telegram guruh topic xatosi:', data.description);
}
