// API wrapper — lokal va deploy uchun universal
const TOKEN_KEY = 'iso_token';

// Deploy qilinganida VITE_API_URL env o'zgaruvchisi o'rnatiladi
// Lokal: http://localhost:4000/api
// Deploy: https://your-backend.railway.app/api
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:4010/api';

// sessionStorage — brauzer/tab yopilganda avtomatik tugaydi (xavfsizlik uchun); sahifani yangilashda saqlanib qoladi.
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = BASE + path;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('iso_token');
      window.location.href = '/login';
      throw new Error('Sessiya tugadi — qayta kiring');
    }
    const msg = (data && data.error) || `Xatolik (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// AI chat javobini token-token (SSE) o'qiydi va har bir bo'lakda onDelta(fullText) chaqiradi.
async function aiChatStream(body, onDelta) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + '/ai/chat', { method: 'POST', headers, body: JSON.stringify(body) });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    if (res.status === 401) {
      localStorage.removeItem('iso_token');
      window.location.href = '/login';
      throw new Error('Sessiya tugadi — qayta kiring');
    }
    throw new Error((data && data.error) || `Xatolik (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let streamError = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const evt of events) {
      const line = evt.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      let payload;
      try { payload = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (payload.error) { streamError = payload.error; continue; }
      if (payload.delta) { full += payload.delta; onDelta(full); }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!full) throw new Error("AI javob bera olmadi. Qayta urinib ko'ring.");
  return full;
}

async function uploadFile(path, file) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(BASE + path, { method: 'POST', headers, body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Xatolik (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (file) => uploadFile('/uploads', file),
  aiChatStream,
  fileUrl: (u) => (u ? (u.startsWith('http') ? u : BASE.replace(/\/api\/?$/, '') + u) : ''),
};
