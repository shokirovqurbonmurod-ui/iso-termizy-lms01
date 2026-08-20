import { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Plus, Users, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { name: '', branch: '', capacity: 10, status: 'free' };

export default function RoomsPage() {
  const [rows, setRows] = useState(null);
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, b] = await Promise.all([api.get('/rooms?limit=500').catch(() => []), api.get('/branches').catch(() => [])]);
    setRows(r || []); setBranches(b || []);
  }
  useEffect(() => { load(); }, []);

  const freeCount = useMemo(() => (rows || []).filter((r) => r.status === 'free').length, [rows]);
  const totalCapacity = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.capacity) || 0), 0), [rows]);

  function openAdd() { setForm({ ...empty, branch: branches[0]?.name || '' }); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/rooms', { ...form, capacity: Number(form.capacity) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleStatus(row) {
    await api.put(`/rooms/${row.id}`, { status: row.status === 'free' ? 'busy' : 'free' }).catch(() => {});
    await load();
  }

  async function removeRoom(row) {
    if (!confirm(`"${row.name}" xonasi o'chirilsinmi?`)) return;
    await api.del(`/rooms/${row.id}`).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={DoorOpen} title="Xonalar" subtitle={`${freeCount}/${rows.length} bo'sh · ${totalCapacity} jami sig'im`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Xona qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={DoorOpen} title="Xona yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 group relative">
              <button onClick={() => removeRoom(r)} title="O'chirish"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
              <div className="flex items-center justify-between mb-2 pr-5">
                <span className="font-semibold text-navy-800 text-sm">{r.name}</span>
                <button onClick={() => toggleStatus(r)} className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status === 'free' ? "bo'sh" : 'band'}</button>
              </div>
              <div className="text-[11px] text-navy-400 mb-2">{r.branch || '—'}</div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-navy-700"><Users size={13} className="text-navy-400" /> {r.capacity} kishi</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Xona qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xona nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Filial</label>
        <select className="input !py-2.5 mb-4" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
          <option value="">— tanlang —</option>
          {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <label className="label">Sig'im</label>
        <input className="input !py-2.5" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      </Modal>
    </div>
  );
}
