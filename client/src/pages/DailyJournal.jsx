import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Users, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function DailyJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), group_name: '', topic: '', homework: '', notes: '', present: 0, absent: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, g] = await Promise.all([api.get('/daily_journal?limit=500').catch(() => []), api.get('/groups').catch(() => [])]);
    setEntries((e || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => groupFilter ? (entries || []).filter((e) => e.group_name === groupFilter) : (entries || []), [entries, groupFilter]);

  function openAdd() {
    setForm({ date: new Date().toISOString().slice(0, 10), group_name: groups[0]?.name || '', topic: '', homework: '', notes: '', present: 0, absent: 0 });
    setModal(true);
  }

  async function save() {
    if (!form.group_name || !form.topic.trim()) { alert('Guruh va mavzuni kiriting'); return; }
    setSaving(true);
    try {
      await api.post('/daily_journal', { ...form, author: user.full_name, present: Number(form.present) || 0, absent: Number(form.absent) || 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function removeEntry(id) {
    if (!confirm("Yozuv o'chirilsinmi?")) return;
    await api.del(`/daily_journal/${id}`).catch(() => {});
    await load();
  }

  if (entries === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={NotebookPen} title="Kundalik jurnal" subtitle="Har kunlik dars mavzusi, uy vazifasi va davomat qaydlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi yozuv</button>} />

      <div className="mb-5">
        <select className="input !py-2.5 !w-auto" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty icon={NotebookPen} title="Yozuv yo'q" /> : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="card p-4 group relative">
              <button onClick={() => removeEntry(e.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition"><X size={14} /></button>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-navy-800">{e.date}</span>
                <span className="chip text-[9px] bg-navy-100 text-navy-500">{e.group_name}</span>
                <span className="text-[11px] text-navy-400">{e.author}</span>
              </div>
              <div className="text-sm font-semibold text-navy-800 mb-1">{e.topic}</div>
              {e.homework && <div className="text-xs text-navy-500 mb-1"><b>Uy vazifasi:</b> {e.homework}</div>}
              {e.notes && <div className="text-xs text-navy-400 mb-2 italic">{e.notes}</div>}
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600"><Users size={11} /> Keldi: {e.present ?? 0}</span>
                <span className="flex items-center gap-1 text-red-500">Kelmadi: {e.absent ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi kundalik yozuv" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              <option value="">— tanlang —</option>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <label className="label">Dars mavzusi</label>
        <input className="input !py-2.5 mb-4" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <label className="label">Uy vazifasi</label>
        <input className="input !py-2.5 mb-4" value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Kelganlar soni</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.present} onChange={(e) => setForm({ ...form, present: e.target.value })} />
          </div>
          <div>
            <label className="label">Kelmaganlar soni</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.absent} onChange={(e) => setForm({ ...form, absent: e.target.value })} />
          </div>
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Modal>
    </div>
  );
}
