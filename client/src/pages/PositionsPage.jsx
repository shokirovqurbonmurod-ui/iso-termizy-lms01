import { useEffect, useMemo, useState } from 'react';
import { Contact, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const empty = { title: '', department: '', headcount: 1, base_salary: 0 };

export default function PositionsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/positions?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const totalHeadcount = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.headcount) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/positions', { ...form, headcount: Number(form.headcount) || 0, base_salary: Number(form.base_salary) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
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
              <div className="text-sm font-bold text-navy-800 mb-1">{p.title}</div>
              <div className="text-[11px] text-navy-400 mb-3">{p.department || "bo'lim ko'rsatilmagan"}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{p.headcount} shtat</span>
                <span className="font-bold text-gold-600">{money(p.base_salary)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Lavozim qo'shish" onClose={() => setModal(false)}
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
