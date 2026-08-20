import { useEffect, useMemo, useState } from 'react';
import { Presentation, Plus, PlayCircle, Coins } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Matematika', 'Tarix', 'Huquq', 'IT'];

export default function LessonsPage() {
  const [lessons, setLessons] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', subject: SUBJECTS[0], group_name: '', teacher: '', date: new Date().toISOString().slice(0, 10), duration: 60, video_url: '', coin_reward: 10 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [l, g] = await Promise.all([api.get('/lessons?limit=500').catch(() => []), api.get('/groups').catch(() => [])]);
    setLessons((l || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => groupFilter ? (lessons || []).filter((l) => l.group_name === groupFilter) : (lessons || []), [lessons, groupFilter]);

  function openAdd() {
    setForm({ title: '', subject: SUBJECTS[0], group_name: groups[0]?.name || '', teacher: '', date: new Date().toISOString().slice(0, 10), duration: 60, video_url: '', coin_reward: 10 });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/lessons', { ...form, duration: Number(form.duration) || 0, coin_reward: Math.min(40, Number(form.coin_reward) || 0), status: 'planned' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (lessons === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Presentation} title="Darslar" subtitle="Video darslar ro'yxati va coin mukofoti"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi dars</button>} />

      <div className="mb-5">
        <select className="input !py-2.5 !w-auto" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty icon={Presentation} title="Dars yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="chip text-[9px] bg-gold/10 text-gold-700">{l.subject}</span>
                {l.coin_reward > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600"><Coins size={12} /> {l.coin_reward}</span>}
              </div>
              <div className="text-sm font-bold text-navy-800 mb-0.5">{l.title}</div>
              <div className="text-xs text-navy-400 mb-3">{l.group_name} · {l.teacher} · {l.date}</div>
              {l.video_url && (
                <a href={l.video_url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3 text-xs w-full justify-center"><PlayCircle size={13} /> Videoni ochish</a>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi dars" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Dars nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Fan</label>
            <select className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">O'qituvchi</label>
            <input className="input !py-2.5" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Davomiyligi (daq)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <div>
            <label className="label">Coin mukofoti (maks 40)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.coin_reward} onChange={(e) => setForm({ ...form, coin_reward: e.target.value })} />
          </div>
        </div>
        <label className="label">Video havola</label>
        <input className="input !py-2.5" placeholder="https://..." value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
      </Modal>
    </div>
  );
}
