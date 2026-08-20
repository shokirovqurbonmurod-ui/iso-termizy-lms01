import { useEffect, useMemo, useState } from 'react';
import { Headphones, Plus, Users, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const cfg = RESOURCES.reception_log;
const PURPOSE_COLOR = { 'Demo dars': 'bg-blue-400', "Ro'yxatga olish": 'bg-emerald-400', "To'lov": 'bg-gold-400', 'Shikoyat': 'bg-red-400' };

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Reception() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/reception_log').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const today = rows.filter((r) => r.date === todayStr());
    const pending = rows.filter((r) => r.status !== 'done');
    const byPurpose = {};
    for (const r of rows) byPurpose[r.purpose] = (byPurpose[r.purpose] || 0) + 1;
    const byStaff = {};
    for (const r of rows) byStaff[r.staff] = (byStaff[r.staff] || 0) + 1;
    const topStaff = Object.entries(byStaff).sort((a, b) => b[1] - a[1])[0];
    return {
      today: today.length, pending: pending.length,
      purposeList: Object.entries(byPurpose).map(([purpose, count]) => ({ purpose, count })).sort((a, b) => b.count - a.count),
      topStaff: topStaff ? topStaff[0] : '—',
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
    try {
      await api.post(cfg.endpoint, form);
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function toggleDone(row) {
    try { await api.put(`/reception_log/${row.id}`, { ...row, status: row.status === 'done' ? 'pending' : 'done' }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;
  const sorted = [...rows].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  return (
    <div>
      <PageHeader icon={Headphones} title="Reception" subtitle={`${rows.length} ta tashrif · ${stats.today} tasi bugun`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi tashrif</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [CalendarClock, 'Bugungi tashriflar', stats.today, 'gold'],
          [Clock, 'Kutilmoqda', stats.pending, 'rose'],
          [Users, 'Jami tashriflar', rows.length, 'blue'],
          [CheckCircle2, 'Eng band xodim', stats.topStaff, 'green'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'blue' ? 'from-blue-400/20 to-blue-100/10 text-blue-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={20} />
            </div>
            <div className="font-display text-xl text-navy-800 truncate">{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">🎯 Maqsad bo'yicha</h3>
          <div className="space-y-3">
            {stats.purposeList.map((p) => (
              <div key={p.purpose}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-navy-700">{p.purpose}</span>
                  <span className="text-navy-400">{p.count} ta</span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full rounded-full ${PURPOSE_COLOR[p.purpose] || 'bg-navy-400'}`} style={{ width: `${Math.round((p.count / rows.length) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-navy-100">
            <h3 className="font-display text-lg text-navy-800">🕓 Tashriflar ro'yxati</h3>
          </div>
          {sorted.length === 0 ? <Empty icon={Headphones} title="Tashrif yo'q" /> : (
            <div className="divide-y divide-navy-50 max-h-[420px] overflow-y-auto">
              {sorted.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gold/[.02] transition">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(r.visitor || '?')[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{r.visitor}</div>
                    <div className="text-[11px] text-navy-400 truncate">{r.purpose} · {r.staff}</div>
                  </div>
                  <div className="text-[11px] text-navy-400 shrink-0">{r.date} {r.time}</div>
                  <button onClick={() => toggleDone(r)} className={`chip text-[9px] shrink-0 cursor-pointer ${statusStyle(r.status)}`}>{r.status}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!modal} title="Yangi tashrif" onClose={() => setModal(false)}
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
