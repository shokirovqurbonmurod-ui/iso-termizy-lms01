import { useEffect, useMemo, useState } from 'react';
import { Headphones, Plus, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';

const cfg = RESOURCES.tickets;
const STAGES = [
  { key: 'open', label: 'Ochiq', color: 'from-blue-400 to-blue-500' },
  { key: 'in_progress', label: 'Jarayonda', color: 'from-amber-400 to-amber-500' },
  { key: 'resolved', label: 'Hal qilindi', color: 'from-emerald-400 to-emerald-500' },
  { key: 'closed', label: 'Yopilgan', color: 'from-slate-400 to-slate-500' },
];
const PRIORITY_COLOR = { yuqori: 'bg-red-100 text-red-600', "o'rta": 'bg-amber-100 text-amber-700', past: 'bg-slate-100 text-slate-600' };
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Tickets() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/tickets').catch(() => [])); }
  useEffect(() => { load(); }, []);

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
                {items.length === 0 ? <p className="text-[11px] text-navy-300 px-1">Bo'sh</p> : items.map((t) => (
                  <div key={t.id} className="rounded-xl bg-white border border-navy-100 p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      {t.priority === 'yuqori' && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
                      <span className="text-xs font-semibold text-navy-800 truncate">{t.title}</span>
                    </div>
                    <div className="text-[10px] text-navy-400 mb-2">{t.from_name} · {t.assigned_to || 'Mas\'ul yo\'q'}</div>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`chip text-[9px] ${PRIORITY_COLOR[t.priority] || 'bg-navy-100 text-navy-600'}`}>{t.category}</span>
                      <select className="text-[9px] border border-navy-100 rounded-lg px-1.5 py-1 text-navy-500" value={t.status} onChange={(e) => moveStage(t, e.target.value)}>
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
