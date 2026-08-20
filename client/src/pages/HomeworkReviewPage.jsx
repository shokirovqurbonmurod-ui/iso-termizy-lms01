import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Plus, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function scoreColor(score) {
  if (score >= 85) return 'text-emerald-600 bg-emerald-50';
  if (score >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export default function HomeworkReviewPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student: '', homework: '', score: 0, feedback: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/homework_reviews?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !q.trim() || r.student.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  function openAdd() {
    setForm({ student: students[0]?.full_name || '', homework: '', score: 0, feedback: '' });
    setModal(true);
  }

  async function save() {
    if (!form.student.trim() || !form.homework.trim()) return;
    setSaving(true);
    try {
      await api.post('/homework_reviews', { ...form, score: Number(form.score) || 0, reviewer: user.full_name, date: new Date().toISOString().slice(0, 10) });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileCheck2} title="Vazifa tekshiruvi" subtitle="Topshirilgan uy vazifalarini baholash va fikr-mulohaza"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Baholash</button>} />

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="O'quvchi qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={FileCheck2} title="Tekshirilgan vazifa yo'q" /> : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold text-navy-800">{r.student}</div>
                <span className={`chip text-[11px] font-bold ${scoreColor(r.score)}`}>{r.score}</span>
              </div>
              <div className="text-xs text-navy-500 mb-1">{r.homework}</div>
              {r.feedback && <p className="text-xs text-navy-400 italic">"{r.feedback}"</p>}
              <div className="text-[10px] text-navy-400 mt-1">{r.reviewer} · {r.date}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Vazifani baholash" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <label className="label">Vazifa nomi</label>
        <input className="input !py-2.5 mb-4" value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} />
        <label className="label">Ball</label>
        <input className="input !py-2.5 mb-4" type="number" onWheel={(e) => e.target.blur()} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
        <label className="label">Fikr-mulohaza</label>
        <textarea className="input !py-2.5" rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
      </Modal>
    </div>
  );
}
