import { store } from './db.js';
import { notifySecurityOwners, notifyForStudent, notifyGroupTopic } from './telegram.js';

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

let offset = 0;
let running = false;
let botId = null;
let botUsername = null;

function getBotSettings() { return store.all('bot_settings')[0] || null; }
function saveBotSettings(patch) {
  const existing = getBotSettings();
  return existing ? store.update('bot_settings', existing.id, patch) : store.insert('bot_settings', patch);
}

// Foydalanuvchi "Bot" sahifasida "Kod olish" bosganda shu yerda saqlanadi (bazada, xotirada emas) —
// aks holda server har qayta ishga tushganda (masalan kod yozish paytida) barcha kutilayotgan
// kodlar yo'qolib, foydalanuvchi /start yozganda "kod noto'g'ri" xatosiga uchrardi.
export function createLinkCode(user) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  for (const e of store.where('bot_pending_codes', (c) => c.user_id === user.id)) store.remove('bot_pending_codes', e.id);
  store.insert('bot_pending_codes', { code, user_id: user.id, user_name: user.name, role: user.role, expires: Date.now() + 10 * 60 * 1000 });
  return code;
}

function cleanExpiredCodes() {
  const t = Date.now();
  for (const c of store.all('bot_pending_codes')) if (c.expires < t) store.remove('bot_pending_codes', c.id);
}

function takePendingCode(code) {
  cleanExpiredCodes();
  const pending = store.all('bot_pending_codes').find((c) => c.code === code);
  if (pending) store.remove('bot_pending_codes', pending.id);
  return pending;
}

// Menyudagi "📢 Xabar yuborish" / "📣 Guruhga e'lon" tugmasi bosilganda — keyingi oddiy (buyruqsiz)
// xabarni o'sha amalning matni sifatida qabul qilish uchun 5 daqiqalik "kutish" holati saqlanadi.
function setPendingAction(chatId, action) {
  for (const p of store.where('bot_pending_actions', (p2) => p2.chat_id === chatId)) store.remove('bot_pending_actions', p.id);
  store.insert('bot_pending_actions', { chat_id: chatId, action, expires: Date.now() + 5 * 60 * 1000 });
}
function takePendingAction(chatId) {
  const t = Date.now();
  for (const p of store.all('bot_pending_actions')) if (p.expires < t) store.remove('bot_pending_actions', p.id);
  const pending = store.where('bot_pending_actions', (p) => p.chat_id === chatId)[0];
  if (pending) store.remove('bot_pending_actions', pending.id);
  return pending;
}

export async function sendMessage(chatId, text, messageThreadId, replyMarkup) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const body = { chat_id: chatId, text };
  if (messageThreadId) body.message_thread_id = Number(messageThreadId);
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    const resp = await fetch(`${API()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Tugma (masalan noto'g'ri sozlangan Mini App URL) rad etilsa ham — matnli xabarning o'zi
    // baribir yetib borishi kerak, aks holda bitta xato sozlama butun bot javobini o'chirib qo'yardi.
    if (!resp.ok && replyMarkup) {
      const err = await resp.json().catch(() => ({}));
      console.error('Bot sendMessage tugma bilan rad etildi, matn tugmasiz qayta yuborilmoqda:', err.description);
      await fetch(`${API()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, ...(messageThreadId ? { message_thread_id: Number(messageThreadId) } : {}) }),
      });
    }
  } catch (e) { console.error('Bot sendMessage xatosi:', e.message); }
}

// /start kod bilan yozilmasa — kimligini so'rab, shu rolga mos "kodni qayerdan olish" yo'riqnomasini
// ko'rsatish uchun. DIQQAT: bu shunchaki matn tanlash, hisobni ULAYDIGAN yagona yo'l hamon
// tizimdan olingan tasdiqlangan kod (/start 123456) — foydalanuvchi bu yerda rol "tanlab" hech
// qanday huquq ololmaydi, faqat unga mos yo'riqnoma matnini ko'radi.
const ONBOARD_ROLES = [
  { key: 'student', label: "🎓 O'quvchi", desc: "coin balans, dars jadvali, uy vazifa, davomat, imtihon natijalari" },
  { key: 'teacher', label: "👨‍🏫 O'qituvchi", desc: "guruh yangiliklari, e'lonlar, ota-onalar bilan aloqa" },
  { key: 'admin', label: '🧑‍💼 Xodim / Admin', desc: "e'lon yuborish, hisobotlar, tizim bildirishnomalari" },
  { key: 'director', label: '🏛 Direktor / Rahbariyat', desc: "moliya hisobot, statistika, umumiy xabar yuborish (/broadcast)" },
];

function onboardKeyboard() {
  return { inline_keyboard: ONBOARD_ROLES.map((r) => [{ text: r.label, callback_data: `onboard:${r.key}` }]) };
}

function onboardInstructions(roleKey) {
  const r = ONBOARD_ROLES.find((x) => x.key === roleKey);
  if (!r) return null;
  return `${r.label} sifatida ulanish:\n\n1️⃣ Tizimga o'z login/parolingiz bilan kiring\n2️⃣ "Bot" sahifasini oching\n3️⃣ "Kod olish" tugmasini bosing (10 daqiqa amal qiladi)\n4️⃣ Shu yerga yuboring:\n👉 /start 123456\n\nUlangach sizga: ${r.desc}.`;
}

// Zamonaviy asosiy menyu — bitta tekis ekranda bosiladigan tugmalar (bo'lim/submenu yo'q, foydalanuvchi
// so'rovi bo'yicha). "mini_app_url" sozlangan bo'lsa Mini App tugmasi ham qo'shiladi (web_app tugmasi
// faqat shaxsiy chatda ishlaydi, shuning uchun bu funksiya guruhda chaqirilmaydi).
// callback_data shunchaki buyruq nomi (masalan "balance"), handleCallbackQuery shuni commandReply'ga uzatadi.
// Rolga qarab — chunki /balance, /schedule kabi buyruqlar faqat o'quvchi hisobida ishlaydi
// (commandReply ichida student() orqali tekshiriladi), boshqa rolga shu tugmalarni ko'rsatish
// faqat "bu buyruq faqat o'quvchilar uchun" xatosiga olib kelardi.
function mainMenuKeyboard(role) {
  let rows;
  if (role === 'student') {
    rows = [
      [{ text: '🪙 Balans', callback_data: 'balance' }, { text: '📅 Jadval', callback_data: 'schedule' }],
      [{ text: "💳 To'lovlar", callback_data: 'payments' }, { text: '👥 Guruh', callback_data: 'group' }],
      [{ text: '📋 Davomat', callback_data: 'attendance' }, { text: '📚 Uy vazifa', callback_data: 'homework' }],
      [{ text: '📝 Imtihonlar', callback_data: 'exams' }, { text: '🏆 Sertifikatlar', callback_data: 'certificates' }],
      [{ text: "📢 E'lonlar", callback_data: 'announcements' }, { text: 'ℹ️ Yordam', callback_data: 'help' }],
    ];
  } else if (FINANCE_ROLES.includes(role)) {
    rows = [[{ text: "📢 E'lonlar", callback_data: 'announcements' }, { text: '📊 Moliya', callback_data: 'finance' }]];
    // Rahbariyat/akademik boshqaruv uchun qo'shimcha amal tugmalari — bosilganda bot keyingi
    // yozilgan matnni o'sha amalning mazmuni sifatida kutadi (setPendingAction/takePendingAction).
    const adminRow = [];
    if (BROADCAST_ROLES.includes(role)) adminRow.push({ text: '📢 Xabar yuborish', callback_data: 'menu:broadcast' });
    if (ANNOUNCE_ROLES.includes(role)) adminRow.push({ text: "📣 Guruhga e'lon", callback_data: 'menu:announce' });
    if (adminRow.length) rows.push(adminRow);
    rows.push([{ text: 'ℹ️ Yordam', callback_data: 'help' }]);
  } else {
    rows = [[{ text: "📢 E'lonlar", callback_data: 'announcements' }, { text: 'ℹ️ Yordam', callback_data: 'help' }]];
  }
  const url = getBotSettings()?.mini_app_url;
  if (url) rows.push([{ text: '📱 Ilovani ochish', web_app: { url } }]);
  return { inline_keyboard: rows };
}

// Buyruq muvaffaqiyatli bajarilganda foydalanuvchi xabariga qo'yiladigan reaksiya — Telegram faqat
// belgilangan (standart) emoji to'plamini reaksiya sifatida qabul qiladi, shuning uchun ixtiyoriy
// emoji (masalan 🪙, 📅) ishlatib bo'lmaydi, faqat shu ro'yxatdagilar.
const REACTIONS = { ok: '👍', linked: '🎉', wrongCode: '😢', unknown: '🤔', answered: '🔥' };

async function sendChatAction(chatId, action, messageThreadId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const body = { chat_id: chatId, action };
  if (messageThreadId) body.message_thread_id = Number(messageThreadId);
  fetch(`${API()}/sendChatAction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

async function reactTo(chatId, messageId, emoji) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !messageId || !emoji) return;
  fetch(`${API()}/setMessageReaction`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reaction: [{ type: 'emoji', emoji }] }),
  }).catch(() => {});
}

// Bot menyusidagi doimiy (message-input yonidagi) tugmani mini-app'ga sozlaydi — sozlama saqlanganda chaqiriladi.
export async function syncMenuButton() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const url = getBotSettings()?.mini_app_url;
  try {
    await fetch(`${API()}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: url ? { type: 'web_app', text: 'Ilova', web_app: { url } } : { type: 'default' },
      }),
    });
  } catch { /* jim o'tkaziladi */ }
}

const QA_SYSTEM = `Sen "Yordamchi Ustoz" — "ISO Termizy Avlodlari" xorijiy tillar o'quv markazining Telegram guruhidagi sun'iy intellekt yordamchisisan.
Guruhda o'quvchilar, ota-onalar va o'qituvchilar dars, uy vazifasi, dasturlash (IT), til o'rganish, imtihon va umumiy ta'lim savollarini berishadi.
Javobingni savol qaysi tilda yozilgan bo'lsa o'sha tilda (aks holda o'zbek tilida), aniq, tushunarli va QISQA ber (odatda 80-150 so'z, murakkab texnik savolda 300 so'zgacha, kerak bo'lsa kod bilan).
Guruhni hamma a'zosi ko'radi — shaxsiy, moliyaviy yoki maxfiy ma'lumot bermang, faqat umumiy ta'lim/texnik yordam ber.
To'g'ridan-to'g'ri javobdan boshla, "albatta tushuntiraman" kabi ortiqcha kirish gap yozma.`;

// Guruhdagi savolga OpenRouter orqali AI javob generatsiya qiladi (stream'siz — guruh xabari uchun oddiy so'rov yetarli).
async function askAI(question) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = store.all('ai_settings')[0]?.model || process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://iso-termizy-avlodlari.local',
        'X-Title': 'ISO Termizy AI',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: QA_SYSTEM }, { role: 'user', content: question }],
        temperature: 0.6,
        max_tokens: 700,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

const BUILTIN_COMMANDS = [
  { command: 'start', description: 'Hisobni ulash' },
  { command: 'balance', description: 'Coin va ball balansi' },
  { command: 'schedule', description: 'Dars jadvali' },
  { command: 'payments', description: "To'lovlar tarixi" },
  { command: 'group', description: 'Guruhdoshlar ro\'yxati' },
  { command: 'attendance', description: "Davomat tarixi" },
  { command: 'homework', description: "Uy vazifalari va baholar" },
  { command: 'exams', description: 'Imtihon natijalari' },
  { command: 'certificates', description: 'Sertifikatlar' },
  { command: 'announcements', description: "So'nggi e'lonlar" },
  { command: 'finance', description: "Qarzdorlar va oylik tushum (faqat moliya/rahbariyat)" },
  { command: 'announce', description: "Guruhga e'lon yuborish (faqat rahbariyat)" },
  { command: 'broadcast', description: "Hammaga xabar (faqat rahbariyat)" },
  { command: 'help', description: 'Yordam' },
];

function helpText() {
  const custom = store.all('bot_commands');
  const lines = [
    "📋 Mavjud buyruqlar:",
    "🪙 /balance — coin va ball balansi",
    "📅 /schedule — dars jadvali",
    "💳 /payments — to'lovlar tarixi",
    "👥 /group — guruhdoshlar ro'yxati",
    "📋 /attendance — davomat tarixi",
    "📚 /homework — uy vazifalari va baholar",
    "📝 /exams — imtihon natijalari",
    "🏆 /certificates — sertifikatlar",
    "📢 /announcements — so'nggi e'lonlar",
    "📊 /finance — qarzdorlar va oylik tushum (faqat moliya/rahbariyat xodimlari)",
    "📣 /announce Guruh nomi | Xabar — guruhga e'lon (faqat rahbariyat)",
    "📢 /broadcast Xabar — hamma ulangan hisobga xabar (faqat rahbariyat)",
    "ℹ️ /help — shu yordam matni",
  ];
  for (const c of custom) lines.push(`/${c.command} — ${c.description || ''}`.trimEnd());
  return lines.join('\n');
}

const ATTENDANCE_STATUS = {
  active: { emoji: '✅', label: 'faol qatnashdi' },
  passive: { emoji: '🟡', label: 'qatnashdi (passiv)' },
  inactive: { emoji: '🔴', label: "faol bo'lmadi" },
  absent: { emoji: '⚪', label: 'kelmadi' },
};

// Telegram mijozidagi "/" tugmasi bosilganda chiqadigan buyruqlar ro'yxatini yangilaydi —
// super admin yangi buyruq qo'shsa ham shu yerga qo'shiladi.
export async function refreshBotCommands() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const custom = store.all('bot_commands').map((c) => ({ command: c.command, description: (c.description || 'Maxsus buyruq').slice(0, 256) }));
  try {
    await fetch(`${API()}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [...BUILTIN_COMMANDS, ...custom] }),
    });
  } catch { /* jim o'tkaziladi */ }
}

// Bitta buyruqqa (masalan "balance", "schedule") javob matnini tayyorlaydi — private chatda ham,
// guruhda (linklangan a'zo uchun) ham xuddi shu funksiya ishlatiladi, mantiq ikki joyda takrorlanmasin.
function commandReply(cmdName, link) {
  const student = () => store.all('students').find((s) => s.full_name === link.user_name);
  if (cmdName === 'balance') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    return `🪙 Coin: ${s.coins ?? 0}\n⭐ Ball: ${s.points ?? 0}\n🔥 Streak: ${s.streak ?? 0} kun`;
  }
  if (cmdName === 'schedule') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    const group = store.all('groups').find((g) => g.name === s.group_name);
    if (!group) return "Guruh jadvali topilmadi.";
    return `📅 Guruh: ${group.name}\n🕐 Kunlar: ${group.days || '—'}\n🏫 Xona: ${group.room || '—'}\n👨‍🏫 O'qituvchi: ${group.teacher || '—'}`;
  }
  if (cmdName === 'payments') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    const payments = store.all('payments').filter((p) => p.student === link.user_name).slice(0, 5);
    if (!payments.length) return "To'lovlar tarixi topilmadi.";
    const lines = payments.map((p) => `${p.date} — ${Number(p.amount).toLocaleString('en-US').replace(/,/g, ' ')} so'm (${p.status === 'paid' ? "to'landi" : 'kutilmoqda'})`);
    return `💳 So'nggi to'lovlar:\n${lines.join('\n')}`;
  }
  if (cmdName === 'group') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    const mates = store.all('students').filter((x) => x.group_name === s.group_name && x.full_name !== link.user_name);
    if (!mates.length) return "Guruhdoshlar topilmadi.";
    return `👥 ${s.group_name} guruhdoshlaringiz:\n${mates.map((m) => `• ${m.full_name}`).join('\n')}`;
  }
  if (cmdName === 'attendance') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    const records = store.where('student_attendance_daily', (a) => String(a.student_id) === String(s.id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
    if (!records.length) return "Davomat tarixi topilmadi.";
    const lines = records.map((r) => {
      const st = ATTENDANCE_STATUS[r.status] || { emoji: '•', label: r.status };
      return `${st.emoji} ${r.date} — ${st.label}`;
    });
    return `📋 So'nggi davomat (${s.group_name || '—'}):\n${lines.join('\n')}`;
  }
  if (cmdName === 'homework') {
    const s = student();
    if (!s) return "Bu buyruq faqat o'quvchilar uchun ishlaydi.";
    const reviews = store.all('homework_reviews').filter((h) => h.student === link.user_name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (!reviews.length) return "Baholangan uy vazifalari hali topilmadi.";
    const lines = reviews.map((h) => `📝 ${h.homework || '—'} — ${h.date || ''}\n⭐ Baho: ${h.score ?? '—'}${h.feedback ? `\n💬 ${h.feedback}` : ''}`);
    return `📚 So'nggi uy vazifalari:\n\n${lines.join('\n\n')}`;
  }
  if (cmdName === 'exams') {
    const results = store.all('exam_results').filter((e) => e.student === link.user_name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (!results.length) return "Imtihon natijalari topilmadi.";
    const lines = results.map((e) => `📝 ${e.exam || '—'} — ${e.date || ''}\n⭐ Ball: ${e.score ?? '—'}${e.grade ? ` (${e.grade})` : ''}`);
    return `🎓 So'nggi imtihon natijalari:\n\n${lines.join('\n\n')}`;
  }
  if (cmdName === 'certificates') {
    const certs = store.all('certificates').filter((c) => c.student === link.user_name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!certs.length) return "Hali sertifikat yo'q.";
    const lines = certs.map((c) => `🏆 ${c.course || '—'} (${c.level || '—'}) — ${c.date || ''}\n№ ${c.serial || '—'}`);
    return `🏆 Sertifikatlaringiz:\n\n${lines.join('\n\n')}`;
  }
  if (cmdName === 'announcements') {
    const items = store.all('announcements').sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (!items.length) return "Hozircha e'lonlar yo'q.";
    const lines = items.map((a) => `📢 ${a.title || '—'} — ${a.date || ''}\n${a.body || ''}`);
    return `📢 So'nggi e'lonlar:\n\n${lines.join('\n\n')}`;
  }
  if (cmdName === 'help') return helpText();
  if (cmdName === 'finance') return financeReport(link);
  const custom = store.all('bot_commands').find((c) => c.command === cmdName);
  if (custom) return custom.response.replace(/\{name\}/g, link.user_name);
  return null;
}

const FINANCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager', 'accountant', 'cashier'];
// Faqat shaxsiy chatda ishlaydigan, argumentli xodim buyruqlari (/broadcast, /announce) uchun ruxsat ro'yxatlari.
const BROADCAST_ROLES = ['founder', 'director', 'super_admin'];
const ANNOUNCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager'];
// Guruhda ochiq javob berilsa boshqalarning qarzi/moliyasi oshkor bo'ladigan buyruqlar — shu ro'yxatga
// qo'shilsa GURUHGA emas, so'rovchining shaxsiy chatiga yuboriladi. Hozircha bo'sh: /finance ataylab
// istalgan guruhda ochiq javob berishi kerak deb tanlandi (foydalanuvchi so'rovi bo'yicha).
const SENSITIVE_COMMANDS = [];

function fmtMoney(n) { return Math.round(Number(n) || 0).toLocaleString('en-US').replace(/,/g, ' '); }

function financeReport(link) {
  if (!FINANCE_ROLES.includes(link.role)) return "Bu buyruq faqat moliya/rahbariyat xodimlari uchun ishlaydi.";
  const students = store.all('students');
  const payments = store.all('payments');
  const unpaid = students.filter((s) => !s.paid);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = payments.filter((p) => p.status === 'paid' && String(p.date || '').startsWith(thisMonth));
  const revenueThisMonth = paidThisMonth.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const paidNames = new Set(paidThisMonth.map((p) => p.student));

  const lines = unpaid.slice(0, 20).map((s) => `• ${s.full_name} (${s.group_name || '—'})${paidNames.has(s.full_name) ? ' — qisman to\'lagan' : ''}`);
  const more = unpaid.length > 20 ? `\n… va yana ${unpaid.length - 20} ta` : '';

  return `💰 MOLIYA HISOBOTI\n\n📅 Shu oy (${thisMonth}) tushum: ${fmtMoney(revenueThisMonth)} so'm (${paidNames.size} ta o'quvchidan)\n\n⚠️ Qarzdorlar (${unpaid.length} ta):${unpaid.length ? '\n' + lines.join('\n') + more : ' yo\'q ✅'}`;
}

// Har kuni bir marta — hali to'lamagan o'quvchilarning ota-onasiga (bog'langan bo'lsa) eslatma yuboradi.
// Bir kunda bitta o'quvchiga ikki marta yubormaslik uchun 'payment_reminders_log' orqali belgilanadi.
const today = () => new Date().toISOString().slice(0, 10);

async function checkPaymentReminders() {
  const d = today();
  const unpaid = store.all('students').filter((s) => !s.paid);
  for (const s of unpaid) {
    const already = store.where('payment_reminders_log', (l) => String(l.student_id) === String(s.id) && l.date === d)[0];
    if (already) continue;
    const text = `💳 Eslatma: ${s.full_name} uchun ${fmtMoney(s.tariff_price ?? 0)} so'm to'lov kutilmoqda.\nIltimos, imkon qadar tez to'lovni amalga oshiring.`;
    await notifyForStudent(s.id, text).catch(() => {});
    store.insert('payment_reminders_log', { student_id: s.id, date: d });
  }
}

// Guruh/kanal xabarlari — "Davomat guruhi" sozlamasini qo'lda chat_id qidirmasdan avtomatik ulash uchun.
async function handleGroupMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Bot shu guruhga a'zo qilib qo'shildi — chat_id avtomatik saqlanadi (agar hali sozlanmagan bo'lsa).
  if (Array.isArray(msg.new_chat_members) && botId && msg.new_chat_members.some((m) => m.id === botId)) {
    const settings = getBotSettings();
    if (!settings?.attendance_chat_id) {
      saveBotSettings({ attendance_chat_id: String(chatId), attendance_topic_id: settings?.attendance_topic_id || '' });
      await sendMessage(chatId, "✅ Bot ushbu guruhga ulandi va bu yerga davomat xabarlari yuboriladi.\n\nAgar bu forum-guruh bo'lsa va xabarlar aynan bitta mavzuga (topic) tushishini xohlasangiz, o'sha mavzu ichida /settopic deb yozing.");
      notifySecurityOwners(`ℹ️ Bot yangi guruhga ulandi (chat_id: ${chatId}) va davomat xabarlari shu yerga yuborila boshlandi.`).catch(() => {});
    } else {
      await sendMessage(chatId, "ℹ️ Bot guruhga qo'shildi, lekin davomat guruhi sifatida boshqa chat allaqachon sozlangan. Buni o'zgartirish uchun tizimdagi Bot sahifasidan sozlamalarni tahrirlang.");
    }
    return;
  }

  if (text.startsWith('/settopic')) {
    if (!msg.message_thread_id) return sendMessage(chatId, "Bu buyruqni forum-guruhning biror mavzusi (topic) ichida yuboring.");
    const groupArg = text.replace('/settopic', '').trim();
    if (groupArg) {
      const match = store.all('groups').find((g) => g.name.toLowerCase().includes(groupArg.toLowerCase()));
      if (!match) return sendMessage(chatId, `❌ "${groupArg}" nomli guruh tizimda topilmadi. Guruh nomini aniqroq yozing.`, msg.message_thread_id);
      store.update('groups', match.id, { telegram_chat_id: String(chatId), telegram_topic_id: String(msg.message_thread_id) });
      return sendMessage(chatId, `✅ "${match.name}" guruhining davomat va xabarlari endi shu mavzuga yuboriladi.`, msg.message_thread_id);
    }
    saveBotSettings({ attendance_chat_id: String(chatId), attendance_topic_id: String(msg.message_thread_id) });
    return sendMessage(chatId, `✅ Umumiy davomat xabarlari endi shu mavzuga yuboriladi (topic_id: ${msg.message_thread_id}).\n\nAgar bu mavzuni aynan bitta guruhga (masalan "Junior 11") bog'lamoqchi bo'lsangiz: /settopic Junior 11`, msg.message_thread_id);
  }

  const QA_ADMIN_ROLES = ['founder', 'director', 'super_admin'];

  // /setqa — bu guruh (yoki forum-mavzu)ni "Savol-javob" rejimiga o'tkazadi: bundan buyon mention
  // shart bo'lmasdan HAR bir xabarga AI javob beradi. Bu buyruq ham (boshqalar kabi) Privacy Mode
  // yoqiq bo'lsa ham botga yetib boradi, shuning uchun chat_id'ni qo'lda qidirish shart emas.
  if (text.startsWith('/setqa')) {
    const link = msg.from?.id ? store.where('telegram_links', (l) => Number(l.chat_id) === msg.from.id)[0] : null;
    if (!link || !QA_ADMIN_ROLES.includes(link.role)) {
      return sendMessage(chatId, "Bu buyruqni faqat rahbariyat (direktor/super admin) hisobiga ulangan foydalanuvchi ishlata oladi.", msg.message_thread_id);
    }
    saveBotSettings({ qa_chat_id: String(chatId), qa_topic_id: msg.message_thread_id ? String(msg.message_thread_id) : '', qa_enabled: true });
    return sendMessage(chatId, `✅ Bu ${msg.message_thread_id ? "mavzu" : "guruh"} endi "Savol-javob" rejimida — bundan buyon @mention qilmasdan yozilgan har bir xabarga AI avtomatik javob beradi.\n\n⚠️ Eslatma: agar bot hali ham javob bermasa, bu guruhda botning "Group Privacy" cheklovi sabab bo'lishi mumkin — botni guruh ADMINI qiling (Guruh sozlamalari → Administratorlar → botni qo'shing) yoki @BotFather orqali Group Privacy'ni o'chiring.`, msg.message_thread_id);
  }

  if (text.startsWith('/unsetqa')) {
    const link = msg.from?.id ? store.where('telegram_links', (l) => Number(l.chat_id) === msg.from.id)[0] : null;
    if (!link || !QA_ADMIN_ROLES.includes(link.role)) {
      return sendMessage(chatId, "Bu buyruqni faqat rahbariyat hisobiga ulangan foydalanuvchi ishlata oladi.", msg.message_thread_id);
    }
    saveBotSettings({ qa_chat_id: '', qa_topic_id: '' });
    return sendMessage(chatId, "✅ Savol-javob rejimi bu yerda o'chirildi. Endi faqat @mention yoki reply orqali javob beradi.", msg.message_thread_id);
  }

  const settings = getBotSettings();

  // Guruhda /balance, /schedule kabi buyruqlar — Telegram xususiy chatdagi chat_id bilan foydalanuvchi
  // ID'si bir xil bo'lgani uchun, guruh a'zosining shaxsiy /start orqali ulangan hisobini shu yerdan topamiz.
  if (text.startsWith('/')) {
    const cmdName = text.replace(/^\//, '').split(/[\s@]/)[0].toLowerCase();
    if (cmdName && cmdName !== 'settopic') {
      const link = msg.from?.id ? store.where('telegram_links', (l) => Number(l.chat_id) === msg.from.id)[0] : null;
      if (!link) {
        if (botUsername && text.toLowerCase().includes('@' + botUsername.toLowerCase())) {
          return sendMessage(chatId, `Bu buyruq uchun hisobingiz ulanmagan. @${botUsername} botiga shaxsiy yozib, tizimdagi "Bot" sahifasidan kod olib ulang.`, msg.message_thread_id);
        }
        return; // boshqa botga yo'naltirilgan yoki tasodifiy "/" bilan boshlangan xabar — jim o'tkaziladi
      }
      const reply = commandReply(cmdName, link);
      if (reply) {
        reactTo(chatId, msg.message_id, REACTIONS.ok);
        // Nozik (masalan moliyaviy) ma'lumot guruhga emas — so'rovchining shaxsiy chatiga yuboriladi,
        // guruhdagi boshqa a'zolar (masalan ota-onalar) boshqalarning qarzini ko'rmasin.
        if (SENSITIVE_COMMANDS.includes(cmdName)) {
          await sendMessage(link.chat_id, reply);
          return sendMessage(chatId, "📩 Javob shaxsiy xabar orqali yuborildi.", msg.message_thread_id);
        }
        return sendMessage(chatId, reply, msg.message_thread_id);
      }
    }
    return;
  }

  if (!text) return;

  // Maxsus "Savol-javob" guruhi/mavzusi sifatida sozlangan bo'lsa — bu yerdagi HAR BIR xabarga
  // (mention shart emas) AI javob beradi, xuddi Junior IT Academy'dagi "Yordamchi Ustoz" kabi.
  const isQaChat = settings?.qa_chat_id && String(chatId) === String(settings.qa_chat_id)
    && (!settings.qa_topic_id || String(msg.message_thread_id || '') === String(settings.qa_topic_id));

  // qa_chat_id sozlangan bo'lsa — bot FAQAT o'sha guruh/mavzuda javob beradi, boshqa hech qanday
  // guruhda (hatto @mention qilinsa ham) aralashmaydi. Faqat qa_chat_id umuman sozlanmagan bo'lsagina
  // (hech qaysi guruh "Savol-javob" sifatida belgilanmagan) — istalgan guruhda mention/reply orqali javob beradi.
  const mentioned = botUsername && text.toLowerCase().includes('@' + botUsername.toLowerCase());
  const repliedToBot = msg.reply_to_message?.from?.id && botId && msg.reply_to_message.from.id === botId;
  const allowAnywhereFallback = !settings?.qa_chat_id && (mentioned || repliedToBot);

  if (settings?.qa_enabled && (isQaChat || allowAnywhereFallback)) {
    const question = mentioned ? text.replace(new RegExp('@' + botUsername, 'ig'), '').trim() : text;
    if (question) {
      sendChatAction(chatId, 'typing', msg.message_thread_id);
      const answer = await askAI(question);
      if (answer) {
        await sendMessage(chatId, answer, msg.message_thread_id);
        reactTo(chatId, msg.message_id, REACTIONS.answered);
        store.insert('ai_chat_log', {
          user: msg.from?.first_name || "Guruh a'zosi", role: 'telegram_group', session: `group_${chatId}`,
          message: question, reply: answer, model: store.all('ai_settings')[0]?.model || 'auto',
          prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0, cost_uzs: 0, at: now(),
        });
      }
    }
  }
  // Boshqa guruh xabarlariga javob bermaymiz — spam bo'lmasin.
}

async function runBroadcast(body) {
  const links = store.all('telegram_links');
  await Promise.all(links.map((l) => sendMessage(l.chat_id, `📢 ${body}`).catch(() => {})));
  return `✅ Xabar ${links.length} ta ulangan hisobga yuborildi.`;
}

async function runAnnounce(groupName, body) {
  await notifyGroupTopic(groupName, `📢 ${body}`);
  return `✅ "${groupName}" guruhiga e'lon yuborildi.`;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (msg.chat.type !== 'private') return handleGroupMessage(msg);

  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      return sendMessage(chatId, "🏛 ISO TERMIZY AVLODLARI\n━━━━━━━━━━━━━━━━━━\n\nAssalomu alaykum va botimizga xush kelibsiz! 🎉\n\nAvval, siz kim ekaningizni tanlang — shunga mos yo'riqnoma ko'rsataman:", null, onboardKeyboard());
    }
    const pending = takePendingCode(code);
    if (!pending) {
      reactTo(chatId, msg.message_id, REACTIONS.wrongCode);
      return sendMessage(chatId, "❌ Kod noto'g'ri yoki muddati o'tgan (10 daqiqa). Tizimdan yangi kod oling.");
    }

    // Ham eski (shu tizim hisobiga tegishli) ham eski (shu Telegram chatiga tegishli) linklar
    // o'chiriladi — aks holda bitta Telegram chat ikkita tizim hisobiga ulangan holda qolib,
    // keyingi buyruqlar qaysi hisobga tegishli ekani noaniq bo'lib qolardi.
    const stale = store.where('telegram_links', (l) => l.user_id === pending.user_id || l.chat_id === chatId);
    for (const s of stale) store.remove('telegram_links', s.id);
    store.insert('telegram_links', {
      chat_id: chatId, user_id: pending.user_id, user_name: pending.user_name, role: pending.role, linked_at: now(),
    });
    reactTo(chatId, msg.message_id, REACTIONS.linked);
    return sendMessage(chatId, `✅ Hisobingiz muvaffaqiyatli ulandi, ${pending.user_name}! 🎉\n\nEndi quyidagi tugmalardan foydalanib kerakli ma'lumotni bir bosishda oling 👇`, null, mainMenuKeyboard(pending.role));
  }

  const link = store.where('telegram_links', (l) => l.chat_id === chatId)[0];
  if (!link) {
    return sendMessage(chatId, "Hisobingiz hali ulanmagan. Tizimdagi \"Bot\" sahifasidan kod olib, /start 123456 shaklida yuboring.");
  }

  // Menyudan "📢 Xabar yuborish" / "📣 Guruhga e'lon" bosilgan bo'lsa — shu oddiy (buyruqsiz)
  // xabarning o'zi o'sha amalning matni hisoblanadi (slash buyruq yozish shart emas).
  if (!text.startsWith('/')) {
    const pendingAction = takePendingAction(chatId);
    if (pendingAction?.action === 'broadcast') {
      if (!BROADCAST_ROLES.includes(link.role)) return sendMessage(chatId, "Bu amal faqat rahbariyat uchun.");
      reactTo(chatId, msg.message_id, REACTIONS.ok);
      return sendMessage(chatId, await runBroadcast(text), null, mainMenuKeyboard(link.role));
    }
    if (pendingAction?.action === 'announce') {
      if (!ANNOUNCE_ROLES.includes(link.role)) return sendMessage(chatId, "Bu amal faqat rahbariyat/akademik boshqaruv uchun.");
      const sep = text.indexOf('|');
      const groupName = (sep === -1 ? '' : text.slice(0, sep)).trim();
      const body = (sep === -1 ? text : text.slice(sep + 1)).trim();
      if (!groupName || sep === -1) {
        return sendMessage(chatId, "Format: Guruh nomi | Xabar matni\n\nMisol:\nJunior 11 | Ertaga dars 15:00 ga ko'chirildi.\n\nQaytadan urinib ko'ring — yana \"📣 Guruhga e'lon\" tugmasini bosing.");
      }
      reactTo(chatId, msg.message_id, REACTIONS.ok);
      return sendMessage(chatId, await runAnnounce(groupName, body), null, mainMenuKeyboard(link.role));
    }
  }

  // /broadcast <matn> — faqat rahbariyat: barcha ulangan hisoblarga birdaniga xabar (tizimdagi
  // "Bot" sahifasidagi ommaviy xabar bilan bir xil, lekin botdan chiqmasdan tez yuboriladi).
  if (text.startsWith('/broadcast')) {
    if (!BROADCAST_ROLES.includes(link.role)) {
      return sendMessage(chatId, "Bu buyruq faqat rahbariyat (direktor/founder/super admin) uchun ishlaydi.");
    }
    const body = text.replace(/^\/broadcast(@\S+)?/i, '').trim();
    if (!body) {
      setPendingAction(chatId, 'broadcast');
      return sendMessage(chatId, "Xabar matnini yozing (keyingi xabaringiz hammaga yuboriladi):\n\nYoki to'g'ridan-to'g'ri:\n/broadcast Xabar matni");
    }
    reactTo(chatId, msg.message_id, REACTIONS.ok);
    return sendMessage(chatId, await runBroadcast(body));
  }

  // /announce Guruh nomi | Xabar matni — guruhning Telegram topic'iga (yoki umumiy davomat
  // guruhiga) e'lon yuboradi, tizimdagi "Bot" sahifasini ochmasdan.
  if (text.startsWith('/announce')) {
    if (!ANNOUNCE_ROLES.includes(link.role)) {
      return sendMessage(chatId, "Bu buyruq faqat rahbariyat/akademik boshqaruv xodimlari uchun ishlaydi.");
    }
    const raw = text.replace(/^\/announce(@\S+)?/i, '').trim();
    const sep = raw.indexOf('|');
    const groupName = (sep === -1 ? '' : raw.slice(0, sep)).trim();
    const body = (sep === -1 ? '' : raw.slice(sep + 1)).trim();
    if (!groupName || !body) {
      setPendingAction(chatId, 'announce');
      return sendMessage(chatId, "Format: Guruh nomi | Xabar matni\n\nMisol:\nJunior 11 | Ertaga dars 15:00 ga ko'chirildi.\n\nYoki to'g'ridan-to'g'ri:\n/announce Guruh nomi | Xabar matni");
    }
    reactTo(chatId, msg.message_id, REACTIONS.ok);
    return sendMessage(chatId, await runAnnounce(groupName, body));
  }

  sendChatAction(chatId, 'typing');
  const cmdName = text.replace(/^\//, '').split(/[\s@]/)[0].toLowerCase();
  const reply = commandReply(cmdName, link);
  if (reply) {
    reactTo(chatId, msg.message_id, REACTIONS.ok);
    return sendMessage(chatId, reply, null, cmdName === 'help' ? mainMenuKeyboard(link.role) : undefined);
  }

  reactTo(chatId, msg.message_id, REACTIONS.unknown);
  return sendMessage(chatId, "Noma'lum buyruq. Quyidagi menyudan tanlang yoki /help yozing.", null, mainMenuKeyboard(link.role));
}

// Doimiy menyu tugmalari (masalan "🪙 Balans") bosilganda keladigan callback_query'ni oddiy
// buyruq kabi qayta ishlaydi — mantiq commandReply'da bitta joyda, matn va tugma bir xil javob beradi.
async function handleCallbackQuery(cq) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    fetch(`${API()}/answerCallbackQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cq.id }),
    }).catch(() => {});
  }
  const chatId = cq.message?.chat?.id;
  if (!chatId) return;
  const messageThreadId = cq.message?.message_thread_id;

  // Rol tanlash — hisob hali ulanmagan bo'lsa ham ishlaydi, chunki bu shunchaki yo'riqnoma matni.
  if (cq.data?.startsWith('onboard:')) {
    const instructions = onboardInstructions(cq.data.slice(8));
    return sendMessage(chatId, instructions || "Noma'lum tanlov.", messageThreadId);
  }

  const link = cq.from?.id ? store.where('telegram_links', (l) => Number(l.chat_id) === cq.from.id)[0] : null;
  if (!link) return sendMessage(chatId, "Hisobingiz ulanmagan. Shaxsiy chatda /start yozib ulang.", messageThreadId);

  if (cq.data === 'menu:broadcast') {
    if (!BROADCAST_ROLES.includes(link.role)) return sendMessage(chatId, "Bu amal faqat rahbariyat uchun.", messageThreadId);
    setPendingAction(chatId, 'broadcast');
    return sendMessage(chatId, "Xabar matnini yozing — keyingi xabaringiz barcha ulangan hisoblarga yuboriladi:");
  }
  if (cq.data === 'menu:announce') {
    if (!ANNOUNCE_ROLES.includes(link.role)) return sendMessage(chatId, "Bu amal faqat rahbariyat/akademik boshqaruv uchun.", messageThreadId);
    setPendingAction(chatId, 'announce');
    return sendMessage(chatId, "Format: Guruh nomi | Xabar matni\n\nMisol:\nJunior 11 | Ertaga dars 15:00 ga ko'chirildi.");
  }

  const reply = commandReply(cq.data, link);
  if (reply) return sendMessage(chatId, reply, messageThreadId, cq.data === 'help' ? mainMenuKeyboard(link.role) : undefined);
}

async function poll() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const resp = await fetch(`${API()}/getUpdates?offset=${offset}&timeout=25`);
    const data = await resp.json();
    if (data.ok) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) await handleMessage(update.message);
        else if (update.callback_query) await handleCallbackQuery(update.callback_query);
      }
    }
  } catch (e) { console.error('Bot poll xatosi:', e.message); }
}

// Uzun-polling — webhook uchun ochiq HTTPS manzil kerak emas, lokal serverda ham ishlaydi.
export function startBotPolling() {
  if (running || !process.env.TELEGRAM_BOT_TOKEN) return;
  running = true;
  console.log('🤖 Telegram bot polling boshlandi');
  refreshBotCommands();
  syncMenuButton();
  fetch(`${API()}/getMe`).then((r) => r.json()).then((d) => { if (d.ok) { botId = d.result.id; botUsername = d.result.username; } }).catch(() => {});
  checkPaymentReminders();
  setInterval(checkPaymentReminders, 6 * 60 * 60 * 1000);
  (async function loop() {
    while (running) await poll();
  })();
}
