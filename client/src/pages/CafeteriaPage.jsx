import { useEffect, useState } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const CATEGORIES = ['Ovqat', 'Ichimlik', 'Shirinlik'];
const empty = { item: '', price: 0, category: 'Ovqat', status: 'available' };

export default function CafeteriaPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/cafeteria?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.item.trim()) return;
    setSaving(true);
    try { await api.post('/cafeteria', { ...form, price: Number(form.price) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleAvailable(row) {
    await api.put(`/cafeteria/${row.id}`, { status: row.status === 'available' ? 'unavailable' : 'available' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Coffee} title="Oshxona" subtitle="Kafeteriya menyusi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Taom qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Coffee} title="Menyu bo'sh" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map((r) => (
            <button key={r.id} onClick={() => toggleAvailable(r)} className={`card p-4 text-left ${r.status !== 'available' ? 'opacity-40' : ''}`}>
              <div className="text-sm font-bold text-navy-800">{r.item}</div>
              <div className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2 py-0.5 inline-block mt-1.5">{r.category}</div>
              <div className="font-display text-lg text-navy-800 mt-2">{money(r.price)}</div>
              {r.status !== 'available' && <div className="text-[10px] text-red-500 font-bold mt-1">tugagan</div>}
            </button>
          ))}
        </div>
      )}

      <Modal open={modal} title="Taom qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Taom/mahsulot nomi</label>
        <input className="input !py-2.5 mb-4" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Narx</label>
            <input className="input !py-2.5" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Turkum</label>
            <select className="input !py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
