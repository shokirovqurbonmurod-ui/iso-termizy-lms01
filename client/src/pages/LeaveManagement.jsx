import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const cfg = RESOURCES.leave_management;

export default function LeaveManagement() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/leave_management').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const pending = rows.filter((r) => r.status === 'pending');
    const approved = rows.filter((r) => r.status === 'approved');
    const rejected = rows.filter((r) => r.status === 'rejected');
    return { pending, approved, rejected, totalDays: approved.reduce((a, r) => a + (Number(r.days) || 0), 0) };
  }, [rows]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    setForm(init); setErr(''); setModal(true);
  }

  async function save() {
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form, status: form.status || 'pending' };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      await api.post(cfg.endpoint, payload); setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function decide(row, status) {
    try { await api.put(`/leave_management/${row.id}`, { ...row, status }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;
  const rest = rows.filter((r) => r.status !== 'pending').sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  return (
    <div>
      <PageHeader icon={Calendar} title="Ta'til boshqaruvi" subtitle={`${rows.length} ta so'rov · ${stats.pending.length} tasi kutilmoqda`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi so'rov</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [Clock, 'Kutilmoqda', stats.pending.length, 'gold'],
          [CheckCircle2, 'Tasdiqlangan', stats.approved.length, 'green'],
          [XCircle, 'Rad etilgan', stats.rejected.length, 'rose'],
          [Calendar, 'Jami tasdiqlangan kunlar', stats.totalDays, 'blue'],
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

      <div className="card p-5 mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-4">⏳ Tasdiqlash kutilmoqda</h3>
        {stats.pending.length === 0 ? <p className="text-sm text-navy-400">Kutilayotgan so'rov yo'q 👍</p> : (
          <div className="space-y-2">
            {stats.pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-amber-50/60 px-3 py-2.5">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(r.staff || '?')[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800 truncate">{r.staff}</div>
                  <div className="text-[11px] text-navy-400 truncate">{r.type} · {r.start_date} — {r.end_date} · {r.days} kun</div>
                  {r.reason && <div className="text-[10px] text-navy-400 italic truncate">{r.reason}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(r, 'approved')} className="chip bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition">Tasdiqlash</button>
                  <button onClick={() => decide(r, 'rejected')} className="chip bg-red-50 text-red-500 hover:bg-red-100 transition">Rad etish</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100"><h3 className="font-display text-lg text-navy-800">📋 Tarix</h3></div>
        {rest.length === 0 ? <Empty icon={Calendar} title="Yozuv yo'q" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                  {['Xodim', 'Turi', 'Boshlanish', 'Tugash', 'Kunlar', 'Holat'].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => (
                  <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                    <td className="px-4 py-3 font-semibold text-navy-800">{r.staff}</td>
                    <td className="px-4 py-3 text-navy-500">{r.type}</td>
                    <td className="px-4 py-3 text-navy-500 font-mono text-xs">{r.start_date}</td>
                    <td className="px-4 py-3 text-navy-500 font-mono text-xs">{r.end_date}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-navy-700">{r.days}</td>
                    <td className="px-4 py-3"><span className={`chip ${statusStyle(r.status)}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} title="Yangi ta'til so'rovi" onClose={() => setModal(false)}
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
                <input className="input !py-2.5" type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
