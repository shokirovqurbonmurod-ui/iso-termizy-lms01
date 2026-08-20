import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Users, Layers } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

export default function CoursesPage() {
  const [courses, setCourses] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '📘', level: 'A1', price: 0, modules_count: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [c, e] = await Promise.all([api.get('/courses').catch(() => []), api.get('/course-progress/enrollments').catch(() => [])]);
    setCourses(c || []); setEnrollments(e || []);
  }
  useEffect(() => { load(); }, []);

  const enrollCount = useMemo(() => {
    const m = {};
    for (const e of enrollments) m[e.course_id] = (m[e.course_id] || 0) + 1;
    return m;
  }, [enrollments]);

  function openAdd() {
    setForm({ name: '', icon: '📘', level: 'A1', price: 0, modules_count: 0 });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/courses', { ...form, price: Number(form.price) || 0, modules_count: Number(form.modules_count) || 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (courses === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BookOpen} title="Kurslar / Fanlar" subtitle="Kurslar katalogi — narx, modullar va yozilganlar soni"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi kurs</button>} />

      {courses.length === 0 ? <Empty icon={BookOpen} title="Kurs yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl">{c.icon || '📘'}</div>
                <span className="chip text-[10px] bg-gold/10 text-gold-700">{c.level}</span>
              </div>
              <div className="font-display text-lg text-navy-800 mb-1">{c.name}</div>
              <div className="text-sm text-navy-500 mb-3">{c.price ? money(c.price) : 'Bepul'}</div>
              <div className="flex items-center gap-4 text-xs text-navy-400">
                <span className="flex items-center gap-1"><Layers size={12} /> {c.modules_count || 0} modul</span>
                <span className="flex items-center gap-1"><Users size={12} /> {enrollCount[c.id] || 0} yozilgan</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi kurs" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Kurs nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Belgi (emoji)</label>
            <input className="input !py-2.5" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <div>
            <label className="label">Daraja</label>
            <input className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
          <div>
            <label className="label">Narx (so'm)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Modullar soni</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.modules_count} onChange={(e) => setForm({ ...form, modules_count: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
