import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Clock, Target, Package, ListOrdered, Paperclip, Trash2, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const LEVELS = ['Starter', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function LessonPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState(null);
  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: '', level: 'A1', duration: 60, objectives: '', materials: '', activities: '', file: null });
  const [saving, setSaving] = useState(false);

  async function load() { setPlans(await api.get('/lesson_plans?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (plans || [])
    .filter((p) => !levelFilter || p.level === levelFilter)
    .filter((p) => !q.trim() || p.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')), [plans, q, levelFilter]);

  function openAdd() {
    setForm({ title: '', level: 'A1', duration: 60, objectives: '', materials: '', activities: '', file: null });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let file_url = null;
      if (form.file) { const up = await api.upload(form.file); file_url = up.url; }
      await api.post('/lesson_plans', {
        title: form.title.trim(), teacher: user.full_name, level: form.level, duration: Number(form.duration) || 60,
        objectives: form.objectives, materials: form.materials, activities: form.activities, file_url,
        created_at: new Date().toISOString().slice(0, 10),
      });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function removePlan(id) {
    if (!confirm("Dars rejasi o'chirilsinmi?")) return;
    await api.del(`/lesson_plans/${id}`).catch(() => {});
    setDetail(null);
    await load();
  }

  if (plans === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={NotebookPen} title="Dars rejasi" subtitle="Qayta ishlatiladigan dars rejalari kutubxonasi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi reja</button>} />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setLevelFilter('')} className={`chip text-xs ${!levelFilter ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700'}`}>Barchasi</button>
        {LEVELS.map((l) => (
          <button key={l} onClick={() => setLevelFilter(l)} className={`chip text-xs ${levelFilter === l ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon={NotebookPen} title="Dars rejasi topilmadi" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} onClick={() => setDetail(p)} className="card p-4 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="chip text-[10px] bg-gold/10 text-gold-700">{p.level}</span>
                <span className="flex items-center gap-1 text-[11px] text-navy-400"><Clock size={11} /> {p.duration} daq</span>
              </div>
              <div className="text-sm font-bold text-navy-800 mb-1">{p.title}</div>
              <div className="text-xs text-navy-400">{p.teacher}</div>
              {p.file_url && <div className="text-[11px] text-gold-600 mt-2 flex items-center gap-1"><Paperclip size={11} /> Fayl biriktirilgan</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi dars rejasi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Daraja</label>
            <select className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Davomiylik (daqiqa)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
        </div>
        <label className="label">Maqsadlar</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
        <label className="label">Materiallar</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} />
        <label className="label">Bosqichlar (warm-up → asosiy qism → yakun)</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} />
        <label className="label">Slayd/fayl (ixtiyoriy)</label>
        <input type="file" className="input !py-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
      </Modal>

      <Modal open={!!detail} title={detail?.title || ''} onClose={() => setDetail(null)}
        footer={<>
          <button className="btn-ghost !text-red-500" onClick={() => removePlan(detail.id)}><Trash2 size={14} /> O'chirish</button>
          <button className="btn-gold" onClick={() => setDetail(null)}>Yopish</button>
        </>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="chip text-[10px] bg-gold/10 text-gold-700">{detail.level}</span>
              <span className="flex items-center gap-1 text-xs text-navy-400"><Clock size={12} /> {detail.duration} daqiqa</span>
              <span className="text-xs text-navy-400">· {detail.teacher}</span>
            </div>
            {detail.objectives && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600 mb-1"><Target size={12} /> Maqsadlar</div>
                <p className="text-sm text-navy-700 whitespace-pre-line">{detail.objectives}</p>
              </div>
            )}
            {detail.materials && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600 mb-1"><Package size={12} /> Materiallar</div>
                <p className="text-sm text-navy-700 whitespace-pre-line">{detail.materials}</p>
              </div>
            )}
            {detail.activities && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600 mb-1"><ListOrdered size={12} /> Bosqichlar</div>
                <p className="text-sm text-navy-700 whitespace-pre-line">{detail.activities}</p>
              </div>
            )}
            {detail.file_url && (
              <a href={api.fileUrl(detail.file_url)} target="_blank" rel="noreferrer" className="btn-ghost !inline-flex text-xs"><Paperclip size={13} /> Faylni ochish</a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
