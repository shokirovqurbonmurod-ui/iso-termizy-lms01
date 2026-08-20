import { useEffect, useMemo, useState } from 'react';
import { Smile, Meh, Frown, Plus, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TONE = {
  positive: { label: 'Ijobiy', icon: Smile, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  neutral: { label: "Neytral", icon: Meh, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  negative: { label: 'Salbiy', icon: Frown, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
};

export default function StudentBehavior() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student: '', tone: 'positive', detail: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, t] = await Promise.all([
      api.get('/students').catch(() => []),
      api.get('/student_timeline?limit=500').catch(() => []),
    ]);
    setStudents(s || []);
    setRows((t || []).filter((r) => r.type === 'positive' || r.type === 'neutral' || r.type === 'negative')
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filter === 'all' ? rows || [] : (rows || []).filter((r) => r.type === filter), [rows, filter]);

  const counts = useMemo(() => {
    const c = { positive: 0, neutral: 0, negative: 0 };
    for (const r of rows || []) if (c[r.type] !== undefined) c[r.type]++;
    return c;
  }, [rows]);

  function openAdd() {
    setForm({ student: students[0]?.full_name || '', tone: 'positive', detail: '' });
    setErr(''); setModal(true);
  }

  async function save() {
    if (!form.student || !form.detail.trim()) { setErr("O'quvchi va izohni kiriting"); return; }
    setSaving(true);
    try {
      await api.post('/student_timeline', {
        student: form.student, event: TONE[form.tone].label, detail: form.detail.trim(),
        date: new Date().toISOString().slice(0, 10), type: form.tone,
      });
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Talaba xulqi" subtitle="O'quvchilar xatti-harakati bo'yicha ijobiy va salbiy qaydlar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi qayd</button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(TONE).map(([key, t]) => {
          const Icon = t.icon;
          return (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`card p-4 text-center transition ${filter === key ? 'ring-2 ring-gold' : ''}`}>
              <Icon size={22} className={`${t.color} mx-auto mb-1.5`} />
              <div className="font-display text-xl text-navy-800">{counts[key]}</div>
              <div className="text-xs text-navy-400">{t.label}</div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? <Empty icon={Users} title="Qayd yo'q" /> : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const t = TONE[r.type];
            const Icon = t.icon;
            return (
              <div key={r.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${t.bg}`}>
                <Icon size={18} className={`${t.color} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">{r.student}</div>
                  <div className="text-sm text-navy-600">{r.detail}</div>
                </div>
                <span className="text-[10px] text-navy-400 shrink-0">{r.date}</span>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi xulq qaydi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name} · {s.group_name}</option>)}
        </select>
        <label className="label mb-2">Turi</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(TONE).map(([key, t]) => {
            const Icon = t.icon;
            return (
              <button key={key} type="button" onClick={() => setForm({ ...form, tone: key })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${form.tone === key ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
      </Modal>
    </div>
  );
}
