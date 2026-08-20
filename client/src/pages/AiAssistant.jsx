import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, MessageSquarePlus, Copy, Check, Trash2, RotateCcw, Mic, MicOff, Download } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';

function newSessionId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

const GENERAL_SUGGESTIONS = [
  { icon: '📝', text: 'IELTS Writing Task 2 uchun maslahat ber' },
  { icon: '🧮', text: 'Kvadrat tenglama yechishni tushuntir' },
  { icon: '🇬🇧', text: 'Present Perfect va Past Simple farqi' },
  { icon: '🧠', text: 'Xotira yaxshilash texnikalari' },
];

const ROLE_SUGGESTIONS = {
  management: [
    { icon: '📊', text: 'Bugungi umumiy hisobotni tayyorla' },
    { icon: '⚠️', text: 'Qaysi guruhlarda davomat past?' },
    { icon: '💸', text: "Qarzdor o'quvchilar ro'yxatini ber" },
    { icon: '🏆', text: "Eng yaxshi o'qituvchilarni ko'rsat" },
  ],
  teacher: [
    { icon: '👥', text: 'Mening guruhlarim holatini tahlil qil' },
    { icon: '🆘', text: "Kimga ko'proq e'tibor kerak?" },
    { icon: '📅', text: 'Haftalik dars rejasini tuz' },
    { icon: '🎯', text: "O'quvchilarni rag'batlantirish g'oyalari" },
  ],
  finance: [
    { icon: '💰', text: 'Joriy moliyaviy holatni tahlil qil' },
    { icon: '📄', text: "Qarzdor o'quvchilar ro'yxatini tuzib ber" },
  ],
  marketing: [
    { icon: '📣', text: 'Yangi lidlar bo\'yicha holatni ayt' },
    { icon: '💡', text: "Reklama kampaniyasi uchun g'oya ber" },
  ],
  student: [
    { icon: '📈', text: 'Mening progressim qanday?' },
    { icon: '📝', text: 'IELTS Writing Task 2 uchun maslahat ber' },
    { icon: '🧮', text: 'Kvadrat tenglama yechishni tushuntir' },
  ],
};

const MGMT_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager', 'head_teacher'];
const TEACHER_ROLES = ['teacher', 'senior_teacher', 'assistant_teacher', 'mentor'];
const FINANCE_ROLES = ['accountant', 'cashier'];
const MARKETING_ROLES = ['marketing', 'smm', 'call_center'];

function roleGroup(role) {
  if (MGMT_ROLES.includes(role)) return 'management';
  if (TEACHER_ROLES.includes(role)) return 'teacher';
  if (FINANCE_ROLES.includes(role)) return 'finance';
  if (MARKETING_ROLES.includes(role)) return 'marketing';
  if (role === 'student') return 'student';
  return null;
}

function suggestionsFor(role) {
  const specific = ROLE_SUGGESTIONS[roleGroup(role)] || [];
  return [...specific, ...GENERAL_SUGGESTIONS].slice(0, 8);
}

function renderBold(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-${idx}`}>{part.slice(2, -2)}</strong>
      : part
  );
}

// AI javobini qatorma-qator o'qib, ro'yxat belgilarini (-, •, 1.) haqiqiy list sifatida chizadi.
function renderMarkdown(text) {
  const lines = text.split('\n');
  const blocks = [];
  let listItems = null;

  function flushList() {
    if (listItems) { blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc pl-5 my-1 space-y-0.5">{listItems}</ul>); listItems = null; }
  }

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^\s*[-•]\s+(.*)$/);
    const numberMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bulletMatch || numberMatch) {
      if (!listItems) listItems = [];
      listItems.push(<li key={i}>{renderBold((bulletMatch || numberMatch)[1], i)}</li>);
    } else {
      flushList();
      if (line.trim() === '') blocks.push(<br key={i} />);
      else blocks.push(<span key={i}>{renderBold(line, i)}{i < lines.length - 1 && <br />}</span>);
    }
  });
  flushList();
  return blocks;
}

export default function AiAssistant() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('ai_session_id') || newSessionId());
  const [messages, setMessages] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function loadSessions() {
    api.get('/ai/sessions').then((list) => setSessions(list || [])).catch(() => {});
  }
  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    localStorage.setItem('ai_session_id', sessionId);
    setHistoryLoaded(false);
    api.get(`/ai/history?session=${encodeURIComponent(sessionId)}`)
      .then((rows) => setMessages(rows || []))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, [sessionId]);

  function startNewChat() {
    setMessages([]);
    setSessionId(newSessionId());
  }

  function openSession(sid) {
    if (sid === sessionId) return;
    setSessionId(sid);
  }

  async function deleteSession(sid, e) {
    e.stopPropagation();
    if (!confirm("Bu suhbatni butunlay o'chirasizmi?")) return;
    await api.del(`/ai/sessions/${encodeURIComponent(sid)}`).catch(() => {});
    if (sid === sessionId) startNewChat();
    loadSessions();
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi."); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'uz-UZ';
    rec.interimResults = false;
    rec.onresult = (ev) => setInput((prev) => (prev ? prev + ' ' : '') + ev.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function exportChat() {
    const lines = messages.map((m) => `${m.role === 'user' ? user.full_name : 'ISO Termizy AI'}: ${m.text}`);
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `suhbat-${sessionId.slice(0, 8)}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || loading) return;
    setMessages((prev) => prev.slice(0, -2));
    sendMessage(lastUser.text);
  }

  async function sendMessage(text) {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput('');
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    setMessages(prev => [...prev, { role: 'user', text: q }, { role: 'ai', text: '' }]);
    setLoading(true);

    try {
      await api.aiChatStream({ message: q, history, session: sessionId }, (full) => {
        setMessages(prev => {
          const next = prev.slice();
          next[next.length - 1] = { role: 'ai', text: full };
          return next;
        });
      });
    } catch (e) {
      setMessages(prev => {
        const next = prev.slice();
        next[next.length - 1] = { role: 'ai', text: '❌ ' + e.message };
        return next;
      });
    }
    setLoading(false);
    inputRef.current?.focus();
    loadSessions();
  }

  function copyText(text, idx) {
    navigator.clipboard.writeText(text.replace(/\*\*/g, '').replace(/[•📚📝🧮📊💡🎯📌🤖📅🪙🏆🔥🎡👥📸🎮🎁❌]/g, ''));
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const suggestions = suggestionsFor(user.role);

  return (
    <div>
      <PageHeader icon={Bot} title="ISO Termizy AI 🤖✨" subtitle="Sun'iy intellekt yordamchisi — savolingizga javob beradi" />

      <div className="grid lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Chat */}
        <div className="lg:col-span-3 card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="grid place-items-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white mx-auto mb-4 shadow-lg text-4xl animate-pulse-gold">
                  🤖
                </div>
                <h2 className="font-display text-2xl text-navy-800 mb-2">Salom, {user.full_name.split(' ')[0]}! 👋</h2>
                <p className="text-navy-400 mb-8">✨ Savolingizni yozing yoki quyidagilardan tanlang</p>
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s.text)}
                      className="rounded-xl border border-navy-100 px-4 py-3 text-left text-sm text-navy-600 hover:border-gold hover:bg-gold/5 transition">
                      <span className="text-lg mr-2">{s.icon}</span>{s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const isPendingAi = m.role === 'ai' && loading && isLast;
                return (
                  <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-fade`}>
                    <div className={`grid place-items-center w-8 h-8 rounded-xl shrink-0 ${
                      m.role === 'user' ? 'bg-gradient-to-br from-navy-600 to-navy-800 text-white' : 'bg-gradient-to-br from-gold-400 to-gold-600 text-white'
                    }`}>
                      {m.role === 'user' ? user.full_name[0] : <Sparkles size={14} />}
                    </div>
                    <div className={`max-w-[80%] ${m.role === 'user' ? 'text-right' : ''}`}>
                      {isPendingAi && !m.text ? (
                        <div className="inline-block bg-white border border-navy-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                          <div className="flex gap-1"><span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" /><span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{animationDelay:'.15s'}} /><span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{animationDelay:'.3s'}} /></div>
                        </div>
                      ) : (
                        <div className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                          m.role === 'user' ? 'bg-gradient-to-r from-navy-600 to-navy-800 text-white rounded-br-sm' :
                          'bg-white border border-navy-100 text-navy-800 rounded-bl-sm shadow-sm'
                        }`}>
                          {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
                          {isPendingAi && m.text && <span className="inline-block w-1.5 h-4 bg-gold-400 ml-0.5 align-middle animate-pulse" />}
                        </div>
                      )}
                      {m.role === 'ai' && m.text && !isPendingAi && (
                        <div className="flex items-center gap-3 mt-1">
                          <button onClick={() => copyText(m.text, i)} className="flex items-center gap-1 text-[10px] text-navy-400 hover:text-navy-600">
                            {copied === i ? <><Check size={10} /> Nusxalandi</> : <><Copy size={10} /> Nusxalash</>}
                          </button>
                          {isLast && (
                            <button onClick={regenerate} disabled={loading} className="flex items-center gap-1 text-[10px] text-navy-400 hover:text-navy-600">
                              <RotateCcw size={10} /> Qayta yaratish
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length > 0 && (
            <div className="px-4 pt-2.5 pb-1 flex gap-2 overflow-x-auto border-t border-navy-100 bg-white/50">
              {suggestions.slice(0, 5).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)} disabled={loading}
                  className="shrink-0 rounded-full border border-navy-100 px-3 py-1.5 text-xs text-navy-600 hover:border-gold hover:bg-gold/5 transition whitespace-nowrap disabled:opacity-40">
                  <span className="mr-1">{s.icon}</span>{s.text}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t border-navy-100 bg-white/50">
            <div className="flex gap-2">
              {messages.length > 0 && (
                <>
                  <button onClick={startNewChat} className="grid place-items-center w-10 h-10 rounded-xl hover:bg-navy-50 text-navy-400" title="Yangi suhbat">
                    <MessageSquarePlus size={16} />
                  </button>
                  <button onClick={exportChat} className="grid place-items-center w-10 h-10 rounded-xl hover:bg-navy-50 text-navy-400" title="Suhbatni yuklab olish">
                    <Download size={16} />
                  </button>
                </>
              )}
              <button onClick={toggleVoice} className={`grid place-items-center w-10 h-10 rounded-xl transition shrink-0 ${listening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-navy-50 text-navy-400'}`} title="Ovozli kiritish">
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <input ref={inputRef} className="input !py-2.5 flex-1 !rounded-2xl disabled:opacity-50" placeholder={loading ? "AI javob yozmoqda..." : listening ? "Tinglanmoqda..." : "Savolingizni yozing..."}
                value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md hover:shadow-lg transition disabled:opacity-30">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm text-navy-800">🕓 Suhbatlar tarixi</h3>
              <button onClick={startNewChat} className="text-[10px] font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1">
                <MessageSquarePlus size={12} /> Yangi
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-navy-400">Hali suhbat yo'q</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.session} onClick={() => openSession(s.session)}
                    className={`group w-full text-left rounded-xl px-3 py-2 transition cursor-pointer ${s.session === sessionId ? 'bg-gold/10 border border-gold/30' : 'hover:bg-navy-50 border border-transparent'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs font-semibold text-navy-700 truncate flex-1">{s.title}</div>
                      <button onClick={(e) => deleteSession(s.session, e)} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="text-[10px] text-navy-400 flex items-center justify-between mt-0.5">
                      <span>{s.count} xabar</span>
                      <span>{(s.last_at || '').slice(5, 16)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-display text-sm text-navy-800 mb-3">🤖 AI imkoniyatlari</h3>
            <div className="space-y-2 text-xs text-navy-500">
              <div className="flex items-start gap-2"><span>📚</span> Grammatika tushuntirish</div>
              <div className="flex items-start gap-2"><span>📝</span> IELTS/CEFR maslahat</div>
              <div className="flex items-start gap-2"><span>🧮</span> Matematika yechish</div>
              <div className="flex items-start gap-2"><span>📊</span> Talabalar tahlili</div>
              <div className="flex items-start gap-2"><span>💰</span> Moliya hisoboti</div>
              <div className="flex items-start gap-2"><span>📅</span> Dars rejalashtirish</div>
              <div className="flex items-start gap-2"><span>🎯</span> Motivatsiya g'oyalari</div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-display text-sm text-navy-800 mb-2">💡 Maslahat</h3>
            <p className="text-xs text-navy-400">Aniqroq savol bersangiz — batafsil javob olasiz. Masalan: "Present Perfect bilan Past Simple farqini misollar bilan tushuntir"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
