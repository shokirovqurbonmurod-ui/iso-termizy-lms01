import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';

const STAGES = [
  { key: 'Ariza', color: 'bg-navy-100 text-navy-600' },
  { key: 'Suhbat', color: 'bg-blue-100 text-blue-700' },
  { key: 'Test', color: 'bg-amber-100 text-amber-700' },
  { key: 'Taklif', color: 'bg-violet-100 text-violet-700' },
  { key: 'Ishga qabul', color: 'bg-emerald-100 text-emerald-700' },
];
const empty = { candidate: '', position: '', stage: 'Ariza', phone: '', date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function HiringPipelinePage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);

  async function load() { setRows(await api.get('/hiring_pipeline?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const active = useMemo(() => (rows || []).filter((r) => r.status !== 'rejected'), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.candidate.trim()) return;
    setSaving(true);
    try { await api.post('/hiring_pipeline', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function moveStage(id, stage) {
    const status = stage === 'Ishga qabul' ? 'hired' : 'active';
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage, status } : r)));
    await api.put(`/hiring_pipeline/${id}`, { stage, status }).catch(() => load());
  }

  async function reject(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
    await api.put(`/hiring_pipeline/${id}`, { status: 'rejected' }).catch(() => load());
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Ishga qabul" subtitle="Nomzodlar bo'yicha ishga qabul jarayoni"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Nomzod qo'shish</button>} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {STAGES.map((col) => {
          const items = active.filter((r) => r.stage === col.key);
          return (
            <div key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveStage(dragId, col.key); setDragId(null); }}
              className="card p-3 min-h-[300px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`chip text-[10px] px-2 py-1 rounded-full font-bold ${col.color}`}>{col.key}</span>
                <span className="text-xs text-navy-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                    className="rounded-xl border border-navy-100 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition group">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-navy-800">{c.candidate}</span>
                      <button onClick={() => reject(c.id)} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition shrink-0"><X size={13} /></button>
                    </div>
                    <div className="text-[11px] text-navy-400">{c.position}</div>
                    {c.phone && <div className="text-[10px] text-navy-400 mt-1">{c.phone}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal} title="Nomzod qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Nomzod</label>
        <input className="input !py-2.5 mb-4" value={form.candidate} onChange={(e) => setForm({ ...form, candidate: e.target.value })} />
        <label className="label">Lavozim</label>
        <input className="input !py-2.5 mb-4" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <label className="label">Telefon</label>
        <input className="input !py-2.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Modal>
    </div>
  );
}
