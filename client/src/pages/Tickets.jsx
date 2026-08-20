import { useEffect, useMemo, useState } from 'react';
import { Headphones, Plus, AlertTriangle, Crown, Clock, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const cfg = RESOURCES.tickets;
const STAGES = [
  { key: 'open', label: 'Ochiq', color: 'from-blue-400 to-blue-500' },
  { key: 'in_progress', label: 'Jarayonda', color: 'from-amber-400 to-amber-500' },
  { key: 'resolved', label: 'Hal qilindi', color: 'from-emerald-400 to-emerald-500' },
  { key: 'closed', label: 'Yopilgan', color: 'from-slate-400 to-slate-500' },
];
const PRIORITY_COLOR = { yuqori: 'bg-red-100 text-red-600', "o'rta": 'bg-amber-100 text-amber-700', past: 'bg-slate-100 text-slate-600' };
function todayStr() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

// Ochilgandan beri necha kun o'tganini ko'rsatadi — to'liq SLA nazorati emas, lekin xodimga
// "bu tiket qancha kutmoqda" degan tezkor signal beradi.
function ageDays(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

export default function Tickets() {
  const { user } = useAuth();
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [allReplies, setAllReplies] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [openTicket, setOpenTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  async function load() {
    const [t, s, r] = await Promise.all([
      api.get('/tickets').catch(() => []),
      api.get('/staff').catch(() => []),
      api.get('/ticket_replies?limit=2000').catch(() => []),
    ]);
    setRows(t); setStaff(s || []); setAllReplies(r || []);
  }

  function replyCount(ticketId) { return allReplies.filter((r) => String(r.ticket_id) === String(ticketId)).length; }
  useEffect(() => { load(); }, []);

  async function loadReplies(ticketId) {
    const all = await api.get('/ticket_replies?limit=2000').catch(() => []);
    setReplies((all || []).filter((r) => String(r.ticket_id) === String(ticketId)).sort((a, b) => (a.at || '').localeCompare(b.at || '')));
  }

  function openDetail(t) { setOpenTicket(t); setReplyText(''); loadReplies(t.id); }
  function closeDetail() { setOpenTicket(null); setReplies([]); }

  async function sendReply() {
    const msg = replyText.trim();
    if (!msg || !openTicket) return;
    setSendingReply(true);
    try {
      await api.post('/ticket_replies', { ticket_id: openTicket.id, author: user.full_name, author_role: user.role, message: msg, at: now() });
      // Xodim javob yozganda "Ochiq" holat avtomatik "Jarayonda"ga o'tadi — mijoz kutayotganini bildirib turmasin.
      if (isStaff && openTicket.status === 'open') {
        await api.put(`/tickets/${openTicket.id}`, { ...openTicket, status: 'in_progress' });
        setOpenTicket((t) => ({ ...t, status: 'in_progress' }));
        await load();
      }
      setReplyText('');
      await loadReplies(openTicket.id);
    } catch (e) { alert(e.message); }
    setSendingReply(false);
  }

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      open: rows.filter((r) => r.status === 'open').length,
      inProgress: rows.filter((r) => r.status === 'in_progress').length,
      resolved: rows.filter((r) => ['resolved', 'closed'].includes(r.status)).length,
      urgent: rows.filter((r) => r.priority === 'yuqori' && !['resolved', 'closed'].includes(r.status)).length,
    };
  }, [rows]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.key === 'date' ? todayStr() : ''; });
    setForm(init); setErr(''); setModal(true);
  }

  async function save() {
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try { await api.post(cfg.endpoint, { ...form, status: form.status || 'open' }); setModal(false); await load(); }
    catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function moveStage(row, status) {
    try { await api.put(`/tickets/${row.id}`, { ...row, status }); await load(); }
    catch (e) { alert(e.message); }
  }

  async function assignTo(row, assigned_to) {
    try { await api.put(`/tickets/${row.id}`, { ...row, assigned_to }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Headphones} title="Tiket markazi" subtitle={`${rows.length} ta tiket · ${stats.urgent} tasi shoshilinch`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi tiket</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['📥', 'Ochiq', stats.open, ''],
          ['⚙️', 'Jarayonda', stats.inProgress, ''],
          ['✅', 'Hal qilindi', stats.resolved, 'text-emerald-600'],
          ['🔥', 'Shoshilinch', stats.urgent, 'text-red-600'],
        ].map(([ic, label, val, cls], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-2xl mb-2">{ic}</div>
            <div className={`font-display text-2xl text-navy-800 ${cls}`}>{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const items = rows.filter((r) => r.status === stage.key);
          return (
            <div key={stage.key} className="rounded-2xl bg-navy-50/50 p-3 min-h-[160px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-navy-600">{stage.label}</span>
                <span className="text-[10px] text-navy-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? <p className="text-[11px] text-navy-300 px-1">Bo'sh</p> : items.map((t) => {
                  const age = ageDays(t.date);
                  const stale = age !== null && age >= 2 && !['resolved', 'closed'].includes(t.status);
                  const rc = replyCount(t.id);
                  return (
                  <div key={t.id} className="rounded-xl bg-white border border-navy-100 p-3 shadow-sm hover:border-gold/50 transition cursor-pointer" onClick={() => openDetail(t)}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {t.priority === 'yuqori' && <Crown size={11} className="text-amber-500 shrink-0" title="VIP / yuqori muhimlik" />}
                      <span className="text-xs font-semibold text-navy-800 truncate flex-1">{t.title}</span>
                      {rc > 0 && <span className="chip bg-navy-50 text-navy-500 text-[9px] shrink-0">{rc}</span>}
                    </div>
                    <div className="text-[10px] text-navy-400 mb-2">{t.from_name} {age !== null && (
                      <span className={stale ? 'text-red-500 font-semibold' : ''}>
                        {' · '}{stale ? <AlertTriangle size={9} className="inline -mt-0.5" /> : <Clock size={9} className="inline -mt-0.5" />} {age} kun
                      </span>
                    )}</div>
                    <div onClick={(e) => e.stopPropagation()} className="mb-2">
                      <select className="w-full text-[9px] border border-navy-100 rounded-lg px-1.5 py-1 text-navy-500" value={t.assigned_to || ''} onChange={(e) => assignTo(t, e.target.value)}>
                        <option value="">Mas'ul biriktirilmagan</option>
                        {staff.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                      </select>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between gap-1">
                      <span className={`chip text-[9px] ${PRIORITY_COLOR[t.priority] || 'bg-navy-100 text-navy-600'}`}>{t.category}</span>
                      <select className="text-[9px] border border-navy-100 rounded-lg px-1.5 py-1 text-navy-500" value={t.status} onChange={(e) => moveStage(t, e.target.value)}>
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!modal} title="Yangi tiket" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
              {f.type === 'select' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input !py-2.5" placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!openTicket} title={openTicket?.title || 'Tiket'} onClose={closeDetail}>
        {openTicket && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-navy-500">
              <span className={`chip text-[10px] ${PRIORITY_COLOR[openTicket.priority] || 'bg-navy-100 text-navy-600'}`}>{openTicket.category}</span>
              <span>{openTicket.from_name}</span>
              <span>·</span>
              <span>{openTicket.assigned_to || "Mas'ul biriktirilmagan"}</span>
              <span>·</span>
              <span>{STAGES.find((s) => s.key === openTicket.status)?.label}</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 mb-4 pr-1">
              {replies.length === 0 ? (
                <p className="text-xs text-navy-300 text-center py-6">Hali javob yo'q</p>
              ) : replies.map((r) => (
                <div key={r.id} className={`rounded-xl px-3 py-2 text-xs max-w-[85%] ${r.author === user.full_name ? 'bg-[#0A84FF] text-white ml-auto' : 'bg-navy-50 text-navy-700'}`}>
                  <div className={`font-semibold text-[10px] mb-0.5 ${r.author === user.full_name ? 'text-white/80' : 'text-navy-500'}`}>{r.author}</div>
                  {r.message}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input className="input !py-2.5 flex-1" placeholder="Javob yozing..." value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())} />
              <button onClick={sendReply} disabled={!replyText.trim() || sendingReply} className="btn-gold shrink-0">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
