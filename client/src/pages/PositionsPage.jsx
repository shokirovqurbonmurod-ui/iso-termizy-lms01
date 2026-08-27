import { useEffect, useMemo, useState } from 'react';
import { Contact, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const empty = { title: '', department: '', headcount: 1, base_salary: 0 };

export default function PositionsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/positions?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const totalHeadcount = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.headcount) || 0), 0), [rows]);

  function openAdd() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(p) { setEditing(p); setForm({ title: p.title || '', department: p.department || '', headcount: p.headcount ?? 1, base_salary: p.base_salary ?? 0 }); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, headcount: Number(form.headcount) || 0, base_salary: Number(form.base_salary) || 0 };
      if (editing) await api.put(`/positions/${editing.id}`, payload);
      else await api.post('/positions', payload);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(p) {
    if (!confirm(`"${p.title}" lavozimini o'chirmoqchimisiz?`)) return;
    try { await api.del(`/positions/${p.id}`); await load(); }
    catch (e) { alert(e.message); }
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Contact} title="Lavozimlar" subtitle={`${rows.length} ta lavozim · ${totalHeadcount} shtat birligi`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Lavozim qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Contact} title="Lavozim yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm font-bold text-navy-800">{p.title}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={13} /></button>
                  <button onClick={() => remove(p)} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="text-[11px] text-navy-400 mb-3">{p.department || "bo'lim ko'rsatilmagan"}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{p.headcount} shtat</span>
                <span className="font-bold text-gold-600">{money(p.base_salary)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title={editing ? 'Lavozimni tahrirlash' : "Lavozim qo'shish"} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Lavozim nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Bo'lim</label>
        <input className="input !py-2.5 mb-4" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Shtat birligi</label>
            <input className="input !py-2.5" type="number" value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
          </div>
          <div>
            <label className="label">Asosiy oylik</label>
            <input className="input !py-2.5" type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
