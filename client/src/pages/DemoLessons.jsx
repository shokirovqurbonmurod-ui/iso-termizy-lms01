import { useEffect, useMemo, useState } from 'react';
import { Video, Plus, CalendarClock, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const cfg = RESOURCES.demo_lessons;
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DemoLessons() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/demo_lessons').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const done = rows.filter((r) => r.status === 'done').length;
    const planned = rows.filter((r) => r.status === 'planned').length;
    const noShow = rows.filter((r) => r.status === 'no_show').length;
    const byTeacher = {};
    for (const r of rows) byTeacher[r.teacher] = (byTeacher[r.teacher] || 0) + 1;
    return { done, planned, noShow, byTeacher: Object.entries(byTeacher).map(([teacher, count]) => ({ teacher, count })).sort((a, b) => b.count - a.count) };
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

  if (!rows || !stats) return <Spinner />;
  const upcoming = rows.filter((r) => r.status === 'planned').sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const past = rows.filter((r) => r.status !== 'planned').sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  return (
    <div>
      <PageHeader icon={Video} title="Demo darslar" subtitle={`${rows.length} ta demo dars · ${stats.planned} tasi rejalashtirilgan`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi demo dars</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [CalendarClock, 'Rejalashtirilgan', stats.planned, 'gold'],
          [CheckCircle2, "O'tkazilgan", stats.done, 'green'],
          [XCircle, 'Kelmagan', stats.noShow, 'rose'],
          [GraduationCap, 'Jami', rows.length, 'blue'],
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
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">📅 Kelasi demo darslar</h3>
            {upcoming.length === 0 ? <p className="text-sm text-navy-400">Rejalashtirilgan demo dars yo'q</p> : (
              <div className="space-y-2">
                {upcoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                    <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white text-[10px] font-bold shrink-0">{(r.lead || '?')[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800 truncate">{r.lead}</div>
                      <div className="text-[11px] text-navy-400 truncate">{r.subject} · {r.teacher}</div>
                    </div>
                    <div className="text-[11px] font-bold text-navy-600 shrink-0">{r.date} {r.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">🕓 O'tgan demo darslar</h3>
            {past.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
              <div className="space-y-2">
                {past.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                    <span className={`chip text-[9px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'no_show' ? 'kelmadi' : 'bo\'ldi'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800 truncate">{r.lead}</div>
                      <div className="text-[11px] text-navy-400 truncate">{r.result || '—'}</div>
                    </div>
                    <div className="text-[11px] text-navy-400 shrink-0">{r.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">👨‍🏫 O'qituvchi bo'yicha</h3>
          {stats.byTeacher.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-2">
              {stats.byTeacher.map((t) => (
                <div key={t.teacher} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <span className="text-sm font-semibold text-navy-700 truncate">{t.teacher}</span>
                  <span className="text-sm font-bold text-gold-600 shrink-0">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!modal} title="Yangi demo dars" onClose={() => setModal(false)}
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
