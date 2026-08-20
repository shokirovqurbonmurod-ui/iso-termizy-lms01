import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Plus, Instagram, Send, Users2, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const SOURCES = ['Reception', 'Instagram', 'Telegram', "Tavsiya", 'Boshqa'];
const SOURCE_ICON = { Reception: Users2, Instagram: Instagram, Telegram: Send, Tavsiya: Sparkles, Boshqa: UserPlus };

const empty = { student: '', course: '', date: new Date().toISOString().slice(0, 10), source: 'Reception', status: 'active' };

export default function EnrollmentPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/enrollments?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const thisMonth = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return (rows || []).filter((r) => (r.date || '').startsWith(ym));
  }, [rows]);

  const bySource = useMemo(() => {
    const m = {};
    for (const r of rows || []) m[r.source] = (m[r.source] || 0) + 1;
    return SOURCES.map((s) => ({ source: s, count: m[s] || 0 }));
  }, [rows]);
  const maxSource = Math.max(1, ...bySource.map((s) => s.count));

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/enrollments', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={UserPlus} title="Ro'yxatga olish" subtitle="Yangi o'quvchilarni ro'yxatga olish jarayoni"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi yozuv</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Jami yozuvlar</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-gold-600">{thisMonth.length}</div>
          <div className="text-sm text-navy-400">Shu oy</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-emerald-600">{rows.filter((r) => r.status === 'active').length}</div>
          <div className="text-sm text-navy-400">Faol</div>
        </div>
      </div>

      <div className="card p-5 mb-6 max-w-2xl">
        <h3 className="font-display text-base text-navy-800 mb-4">Manba bo'yicha</h3>
        <div className="space-y-2.5">
          {bySource.map((s) => {
            const Icon = SOURCE_ICON[s.source] || UserPlus;
            return (
              <div key={s.source} className="flex items-center gap-3">
                <Icon size={13} className="text-navy-400 shrink-0" />
                <span className="text-xs text-navy-500 w-20 shrink-0">{s.source}</span>
                <div className="flex-1 h-2 rounded-full bg-navy-50 overflow-hidden">
                  <div className="h-full bg-gold-500 rounded-full" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-navy-700 w-6 text-right shrink-0">{s.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={UserPlus} title="Hali yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const Icon = SOURCE_ICON[r.source] || UserPlus;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white shrink-0"><Icon size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800 truncate">{r.student}</div>
                  <div className="text-[11px] text-navy-400">{r.course || '—'} · {r.source} · {r.date}</div>
                </div>
                <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${r.status === 'active' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>{r.status === 'active' ? 'Faol' : 'Bekor qilingan'}</span>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi ro'yxatga olish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Ism familiya</label>
        <input className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="F.I.Sh" />
        <label className="label">Kurs</label>
        <input className="input !py-2.5 mb-4" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Masalan: Ingliz tili" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Manba</label>
            <select className="input !py-2.5" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
