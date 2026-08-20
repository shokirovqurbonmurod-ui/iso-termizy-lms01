import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';

const cfg = RESOURCES.waiting_list;
const PRIORITY = [
  { key: 'yuqori', label: 'Yuqori muhimlik', chip: 'bg-red-100 text-red-600' },
  { key: "o'rta", label: "O'rta muhimlik", chip: 'bg-amber-100 text-amber-700' },
  { key: 'past', label: 'Past muhimlik', chip: 'bg-slate-100 text-slate-600' },
];
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function WaitingList() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/waiting_list').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const waiting = rows.filter((r) => r.status === 'waiting');
    const enrolled = rows.filter((r) => r.status === 'enrolled').length;
    const cancelled = rows.filter((r) => r.status === 'cancelled').length;
    const byCourse = {};
    for (const r of waiting) byCourse[r.course] = (byCourse[r.course] || 0) + 1;
    return { waiting: waiting.length, enrolled, cancelled, byCourse: Object.entries(byCourse).map(([course, count]) => ({ course, count })).sort((a, b) => b.count - a.count) };
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
    try { await api.post(cfg.endpoint, form); setModal(false); await load(); }
    catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function setStatus(row, status) {
    try { await api.put(`/waiting_list/${row.id}`, { ...row, status }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Kutish ro'yxati" subtitle={`${stats.waiting} kutmoqda · ${stats.enrolled} ro'yxatga olindi`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Ro'yxatga qo'shish</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [Users, 'Kutmoqda', stats.waiting, 'gold'],
          [CheckCircle2, 'Ro\'yxatga olindi', stats.enrolled, 'green'],
          [XCircle, 'Bekor qilindi', stats.cancelled, 'rose'],
          [AlertTriangle, 'Jami', rows.length, 'blue'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'blue' ? 'from-blue-400/20 to-blue-100/10 text-blue-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={20} />
            </div>
            <div className="font-display text-2xl text-navy-800">{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {PRIORITY.map((p) => {
            const items = rows.filter((r) => r.priority === p.key && r.status === 'waiting');
            if (items.length === 0) return null;
            return (
              <div key={p.key} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`chip text-[10px] ${p.chip}`}>{p.label}</span>
                  <span className="text-xs text-navy-400">{items.length} ta</span>
                </div>
                <div className="space-y-2">
                  {items.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                      <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(r.name || '?')[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-800 truncate">{r.name}</div>
                        <div className="text-[11px] text-navy-400 truncate">{r.course} · {r.date}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setStatus(r, 'enrolled')} className="chip bg-emerald-100 text-emerald-700 text-[9px] hover:bg-emerald-200 transition">Qabul qilindi</button>
                        <button onClick={() => setStatus(r, 'cancelled')} className="chip bg-red-50 text-red-500 text-[9px] hover:bg-red-100 transition">Bekor</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {stats.waiting === 0 && <p className="text-sm text-navy-400">Kutish ro'yxati bo'sh 👍</p>}
        </div>

        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📚 Kurs bo'yicha</h3>
          {stats.byCourse.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-2">
              {stats.byCourse.map((c) => (
                <div key={c.course} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <span className="text-sm font-semibold text-navy-700 truncate">{c.course}</span>
                  <span className="text-sm font-bold text-gold-600 shrink-0">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!modal} title="Kutish ro'yxatiga qo'shish" onClose={() => setModal(false)}
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
