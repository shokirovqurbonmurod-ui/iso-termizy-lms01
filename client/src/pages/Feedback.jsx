import { useEffect, useMemo, useState } from 'react';
import { Medal, Plus, Mail, MailOpen, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const cfg = RESOURCES.feedback;
const TYPE_COLOR = { "O'quvchi": 'bg-blue-100 text-blue-700', "Ota-ona": 'bg-violet-100 text-violet-700', Lid: 'bg-amber-100 text-amber-700', Xodim: 'bg-emerald-100 text-emerald-700' };
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Feedback() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/feedback').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      new: rows.filter((r) => r.status === 'new').length,
      resolved: rows.filter((r) => r.status === 'resolved').length,
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
    try { await api.post(cfg.endpoint, { ...form, status: form.status || 'new' }); setModal(false); await load(); }
    catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function setStatus(row, status) {
    try { await api.put(`/feedback/${row.id}`, { ...row, status }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;
  const sorted = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <PageHeader icon={Medal} title="Fikr-mulohazalar" subtitle={`${rows.length} ta xabar · ${stats.new} tasi yangi`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Fikr qo'shish</button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          [Mail, 'Yangi', stats.new, 'rose'],
          [CheckCircle2, 'Hal qilingan', stats.resolved, 'green'],
          [MailOpen, 'Jami', rows.length, 'gold'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={20} />
            </div>
            <div className="font-display text-2xl text-navy-800">{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100"><h3 className="font-display text-lg text-navy-800">📨 Xabarlar</h3></div>
        {sorted.length === 0 ? <Empty icon={Medal} title="Fikr-mulohaza yo'q" /> : (
          <div className="divide-y divide-navy-50">
            {sorted.map((r) => (
              <div key={r.id} className={`flex items-start gap-3 px-4 py-3.5 transition ${r.status === 'new' ? 'bg-gold/[.03]' : 'hover:bg-gold/[.02]'}`}>
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0 mt-0.5">{(r.from_name || '?')[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-navy-800">{r.from_name}</span>
                    <span className={`chip text-[9px] ${TYPE_COLOR[r.type] || 'bg-navy-100 text-navy-600'}`}>{r.type}</span>
                    <span className="text-[10px] text-navy-300 ml-auto">{r.date}</span>
                  </div>
                  <p className="text-sm text-navy-600">{r.message}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.status === 'new' && <button onClick={() => setStatus(r, 'read')} className="chip bg-blue-100 text-blue-700 text-[9px] hover:bg-blue-200 transition">O'qildi</button>}
                  {r.status !== 'resolved' && <button onClick={() => setStatus(r, 'resolved')} className="chip bg-emerald-100 text-emerald-700 text-[9px] hover:bg-emerald-200 transition">Hal qilindi</button>}
                  {r.status === 'resolved' && <span className="chip bg-emerald-100 text-emerald-700 text-[9px]">✓ Hal qilindi</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} title="Fikr-mulohaza qo'shish" onClose={() => setModal(false)}
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
