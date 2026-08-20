import express from 'express';
import { authRequired } from '../auth.js';
import { store } from '../db.js';
import { isAdmin, ROLE_LABEL } from '../roles.js';

const r = express.Router();
r.use(authRequired);

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
const USD_TO_UZS = 12700; // taxminiy kurs — narx faqat ma'lumot uchun, bepul modellarda har doim 0 chiqadi
const MODELS_CACHE_MS = 60 * 60 * 1000; // 1 soat

const FALLBACK_MODELS = [
  { id: 'openai/gpt-oss-20b:free', name: 'OpenAI: gpt-oss-20b (free)', context_length: 131072 },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA: Nemotron 3 Super (free)', context_length: 262144 },
  { id: 'google/gemma-4-31b-it:free', name: 'Google: Gemma 4 31B (free)', context_length: 262144 },
];

let modelsCache = { at: 0, list: [] };

// OpenRouter'dagi bepul (":free") modellar ro'yxatini oladi va 1 soat keshda saqlaydi.
async function getFreeModels() {
  const now = Date.now();
  if (modelsCache.list.length && now - modelsCache.at < MODELS_CACHE_MS) return modelsCache.list;
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const resp = await fetch('https://openrouter.ai/api/v1/models', { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
    if (!resp.ok) throw new Error('models fetch failed');
    const data = await resp.json();
    const free = (data.data || [])
      .filter((m) => m.id.endsWith(':free'))
      .map((m) => ({ id: m.id, name: m.name, context_length: m.context_length }));
    if (free.length) {
      modelsCache = { at: now, list: free };
      return free;
    }
  } catch { /* tarmoq xatosi — pastdagi zaxira ro'yxat ishlatiladi */ }
  return modelsCache.list.length ? modelsCache.list : FALLBACK_MODELS;
}

function getAiSettingsRow() { return store.all('ai_settings')[0] || null; }
function getSelectedModel() { return getAiSettingsRow()?.model || DEFAULT_MODEL; }

const SYSTEM_INSTRUCTION = `Sen "ISO Termizy AI" — "ISO Termizy Avlodlari" xorijiy tillar o'quv markazining LMS/CRM tizimidagi sun'iy intellekt yordamchisisan.
Markazda ingliz tili, IELTS, koreys tili, nemis tili, rus tili, matematika, tarix, huquq va IT fanlari o'qitiladi.
Foydalanuvchilar: direktor, o'qituvchilar, xodimlar, o'quvchilar va ota-onalar bo'lishi mumkin.
Javoblaringni o'zbek tilida, aniq, foydali va QISQA ber (agar savol boshqa tilda bo'lsa, o'sha tilda javob ber).

QOIDALAR:
- Javobingni har doim TO'LIQ tugat — hech qachon jumla yoki ro'yxat o'rtasida to'xtama. Oddiy savolga 100-200 so'z yetarli, murakkab yoki ko'p qadamli mavzularda (dars rejasi, batafsil tushuntirish) 500 so'zgacha to'liq yoz.
- Sarlavha, ro'yxat yoki bandni takrorlama — har bir fikrni faqat bir marta yoz.
- To'g'ridan-to'g'ri javobdan boshla, kirish gaplarni (masalan "Albatta, tushuntirib beraman") qisqartir yoki tashla.
- Kerak bo'lsa ro'yxat, misollar yoki qadamlar bilan tushuntir.
- Emoji dan o'rinli va me'yorida (savol boshiga/oxiriga 1-2 tadan) foydalan, har bandga emoji qo'ymang.
- Quyida senga tizimdagi joriy ma'lumotlar (o'quvchilar, guruhlar, moliya va h.k.) beriladi — savol shu mavzularga tegishli bo'lsa, ANIQ raqam va ismlar bilan javob ber; aks holda ma'lumotlarga ishora qilma.`;

const MGMT_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager', 'head_teacher'];
const TEACHER_ROLES = ['teacher', 'senior_teacher', 'assistant_teacher', 'mentor'];
const FINANCE_ROLES = ['accountant', 'cashier'];
const MARKETING_ROLES = ['marketing', 'smm', 'call_center'];

function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('en-US').replace(/,/g, ' '); }

// Foydalanuvchi roliga mos real tizim ma'lumotlaridan qisqa matnli xulosa tuzadi —
// shu xulosa AI'ga context sifatida beriladi, shunda u haqiqiy raqamlar bilan javob bera oladi.
function buildDataContext(user) {
  const role = user.role;
  const students = store.all('students');
  const teachers = store.all('teachers');
  const groups = store.all('groups');
  const payments = store.all('payments');
  const lines = [];

  if (MGMT_ROLES.includes(role)) {
    const revenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const unpaid = students.filter((s) => !s.paid);
    const inactive = students.filter((s) => s.status !== 'active');
    const avgProgress = Math.round(students.reduce((a, s) => a + (Number(s.progress) || 0), 0) / (students.length || 1));
    const sorted = [...students].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    const weak = sorted.filter((s) => (s.progress || 0) < 40);
    const attendance = [...store.all('attendance_analytics')].sort((a, b) => (a.rate || 0) - (b.rate || 0));
    const topTeachers = [...teachers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);

    lines.push(`UMUMIY: ${students.length} o'quvchi (faol: ${students.length - inactive.length}, nofaol: ${inactive.length}), ${teachers.length} o'qituvchi, ${groups.length} guruh.`);
    lines.push(`DAROMAD (to'langan): ${fmt(revenue)} so'm. O'rtacha progress: ${avgProgress}%.`);
    lines.push(`QARZDOR O'QUVCHILAR (${unpaid.length} ta): ${unpaid.slice(0, 10).map((s) => s.full_name).join(', ') || "yo'q"}.`);
    lines.push(`ENG YAXSHI 5 O'QUVCHI: ${sorted.slice(0, 5).map((s) => `${s.full_name} (${s.progress}%, ${s.group_name})`).join('; ') || "yo'q"}.`);
    lines.push(`E'TIBOR TALAB QILUVCHILAR: ${weak.slice(0, 8).map((s) => `${s.full_name} (${s.progress}%, ${s.group_name})`).join('; ') || "yo'q"}.`);
    if (attendance.length) lines.push(`GURUHLAR DAVOMATI (eng pasti birinchi): ${attendance.slice(0, 6).map((g) => `${g.group_name} — ${g.rate}% (${g.trend})`).join('; ')}.`);
    if (topTeachers.length) lines.push(`ENG YUQORI BAHOLI O'QITUVCHILAR: ${topTeachers.map((t) => `${t.full_name} (${t.rating}⭐, ${t.groups_count} guruh)`).join('; ')}.`);
  } else if (TEACHER_ROLES.includes(role)) {
    const myGroupNames = groups.filter((g) => g.teacher === user.name).map((g) => g.name);
    const myStudents = students.filter((s) => myGroupNames.includes(s.group_name));
    const avgProgress = Math.round(myStudents.reduce((a, s) => a + (Number(s.progress) || 0), 0) / (myStudents.length || 1));
    const weak = myStudents.filter((s) => (s.progress || 0) < 40 || (s.streak || 0) <= 2);
    const top = [...myStudents].sort((a, b) => (b.progress || 0) - (a.progress || 0)).slice(0, 5);

    lines.push(`SIZNING GURUHLARINGIZ: ${myGroupNames.join(', ') || 'topilmadi'}.`);
    lines.push(`O'QUVCHILARINGIZ: ${myStudents.length} ta, o'rtacha progress ${avgProgress}%.`);
    lines.push(`E'TIBOR TALAB QILUVCHILAR: ${weak.slice(0, 8).map((s) => `${s.full_name} (${s.progress}%, streak ${s.streak} kun)`).join('; ') || "yo'q"}.`);
    lines.push(`ENG FAOL O'QUVCHILAR: ${top.map((s) => `${s.full_name} (${s.progress}%)`).join('; ') || "yo'q"}.`);
  } else if (role === 'student') {
    const me = students.find((s) => s.full_name === user.name);
    if (me) {
      lines.push(`SIZNING MA'LUMOTLARINGIZ: ${me.full_name}, guruh: ${me.group_name}, o'qituvchi: ${me.teacher}, daraja: ${me.level}, progress: ${me.progress}%, ball: ${me.points}, coin: ${me.coins}, streak: ${me.streak} kun, to'lov holati: ${me.paid ? "to'langan" : 'QARZDOR'}.`);
    }
  } else if (FINANCE_ROLES.includes(role)) {
    const revenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const pending = payments.filter((p) => p.status === 'pending');
    const expenses = store.all('expenses');
    const totalExpenses = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const unpaid = students.filter((s) => !s.paid);
    lines.push(`MOLIYA: Daromad (to'langan) ${fmt(revenue)} so'm, kutilayotgan to'lovlar ${pending.length} ta, xarajatlar ${fmt(totalExpenses)} so'm, sof foyda ${fmt(revenue - totalExpenses)} so'm.`);
    lines.push(`QARZDOR O'QUVCHILAR (${unpaid.length} ta): ${unpaid.slice(0, 10).map((s) => s.full_name).join(', ') || "yo'q"}.`);
  } else if (MARKETING_ROLES.includes(role)) {
    const leads = store.all('leads');
    const newLeads = leads.filter((l) => ['new', 'yangi'].includes(l.status));
    lines.push(`MARKETING: Jami lidlar ${leads.length} ta, yangi lidlar ${newLeads.length} ta. Guruhlar ${groups.length} ta, o'quvchilar ${students.length} ta.`);
  } else {
    lines.push(`UMUMIY: ${students.length} o'quvchi, ${teachers.length} o'qituvchi, ${groups.length} guruh.`);
  }

  return lines.join('\n');
}

// O'zining joriy suhbat (session) tarixini yuklash — sahifa qayta ochilganda davom etadi.
r.get('/history', (req, res) => {
  const { session } = req.query;
  if (!session) return res.json([]);
  const rows = store.where('ai_chat_log', (row) => row.user === req.user.name && row.session === session)
    .sort((a, b) => a.id - b.id);
  const messages = [];
  for (const row of rows) {
    messages.push({ role: 'user', text: row.message });
    messages.push({ role: 'ai', text: row.reply });
  }
  res.json(messages);
});

// O'zining eski suhbatlari ro'yxati (sarlavha = birinchi savol) — qayta ochish uchun.
r.get('/sessions', (req, res) => {
  const rows = store.where('ai_chat_log', (row) => row.user === req.user.name);
  const bySession = new Map();
  for (const row of rows) {
    if (!bySession.has(row.session)) {
      bySession.set(row.session, { session: row.session, title: row.message, count: 0, last_at: row.at });
    }
    const s = bySession.get(row.session);
    s.count++;
    s.last_at = row.at; // qatorlar id bo'yicha o'sish tartibida — oxirgi yozuv eng so'nggisi
  }
  const list = [...bySession.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
  res.json(list);
});

// O'zining bitta suhbatini butunlay o'chirish.
r.delete('/sessions/:session', (req, res) => {
  const rows = store.where('ai_chat_log', (row) => row.user === req.user.name && row.session === req.params.session);
  for (const row of rows) store.remove('ai_chat_log', row.id);
  res.json({ ok: true, removed: rows.length });
});

// Admin: kim, qachon AI'dan foydalangani — "ISO Termizy AI Auditi".
r.get('/log', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const rows = store.all('ai_chat_log').slice(0, 5000);
  res.json(rows);
});

// Admin: Sozlamalar sahifasidagi model tanlovi uchun bepul modellar ro'yxati.
r.get('/models', async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json(await getFreeModels());
});

// Admin: joriy tanlangan AI model.
r.get('/settings', (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json({ model: getSelectedModel() });
});

// Admin: AI modelini almashtirish.
r.post('/settings', async (req, res) => {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  const { model } = req.body || {};
  if (!model || typeof model !== 'string') return res.status(400).json({ error: 'Model tanlanmadi.' });
  const freeModels = await getFreeModels();
  if (!freeModels.some((m) => m.id === model)) {
    return res.status(400).json({ error: "Noma'lum yoki bepul bo'lmagan model." });
  }
  const existing = getAiSettingsRow();
  if (existing) store.update('ai_settings', existing.id, { model });
  else store.insert('ai_settings', { model });
  res.json({ model });
});

// Javobni token-token oqim (SSE) sifatida uzatadi — frontendda "yozayotganday" ko'rinish uchun.
r.post('/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI hali ulanmagan — administrator OPENROUTER_API_KEY sozlashi kerak." });
  }
  const { message, history, session } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Savol matni bo'sh bo'lmasin" });
  }

  const context = buildDataContext(req.user);
  const systemText = `${SYSTEM_INSTRUCTION}\n\n--- JORIY TIZIM MA'LUMOTLARI ---\nSiz bilan gaplashayotgan foydalanuvchi: ${req.user.name} (${ROLE_LABEL[req.user.role] || req.user.role}).\n${context}\n--- MA'LUMOTLAR TUGADI ---`;

  const messages = [{ role: 'system', content: systemText }];
  for (const turn of Array.isArray(history) ? history.slice(-10) : []) {
    if (!turn?.text) continue;
    messages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.text });
  }
  messages.push({ role: 'user', content: message });

  const model = getSelectedModel();
  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.6,
    max_tokens: 2048,
  });

  async function callOpenRouter() {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://iso-termizy-avlodlari.local',
        'X-Title': 'ISO Termizy AI',
      },
      body,
    });
  }

  let resp;
  try {
    resp = await callOpenRouter();

    // Rate limit — biroz kutib, bir marta avtomatik qayta urinish.
    if (!resp.ok && resp.status === 429) {
      await new Promise((r2) => setTimeout(r2, 3000));
      resp = await callOpenRouter();
    }
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        return res.status(429).json({ error: "AI hozir band (bepul tarif limiti) — biroz kutib, qayta urinib ko'ring." });
      }
      const msg = errData?.error?.message || `AI xatosi (${resp.status})`;
      return res.status(502).json({ error: msg });
    }
  } catch (e) {
    return res.status(502).json({ error: "AI bilan bog'lanishda xatolik: " + e.message });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let midStreamError = null;
  let usage = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.error) {
            midStreamError = parsed.error.code === 429
              ? "AI hozir band (bepul tarif limiti) — biroz kutib, qayta urinib ko'ring."
              : (parsed.error.message || 'AI xatoligi yuz berdi.');
            continue;
          }
          if (parsed?.usage) usage = parsed.usage;
          const delta = parsed?.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch { /* noto'g'ri formatdagi qism — o'tkazib yuboriladi */ }
      }
    }
  } catch (e) {
    midStreamError = "Ulanish uzildi: " + e.message;
  }

  if (fullText) {
    const costUsd = Number(usage?.cost) || 0;
    store.insert('ai_chat_log', {
      user: req.user.name, role: req.user.role, session: session || 'default',
      message, reply: fullText, model,
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      cost_usd: costUsd,
      cost_uzs: Math.round(costUsd * USD_TO_UZS),
      at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  } else {
    res.write(`data: ${JSON.stringify({ error: midStreamError || "AI javob bera olmadi. Qayta urinib ko'ring." })}\n\n`);
  }
  res.write('data: {"done":true}\n\n');
  res.end();
});

export default r;
