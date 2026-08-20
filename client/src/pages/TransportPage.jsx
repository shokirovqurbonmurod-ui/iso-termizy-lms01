import { useEffect, useState } from 'react';
import { Bus, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { vehicle: '', driver: '', route: '', capacity: 20, status: 'active' };

export default function TransportPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/transport?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.vehicle.trim()) return;
    setSaving(true);
    try { await api.post('/transport', { ...form, capacity: Number(form.capacity) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Bus} title="Transport" subtitle="Markaz transport vositalari va marshrutlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Transport qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Bus} title="Transport yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy-800">{r.vehicle}</span>
                <span className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : "ta'mirda"}</span>
              </div>
              <div className="text-[11px] text-navy-400">{r.driver || "haydovchi yo'q"}</div>
              <div className="text-[11px] text-navy-500 mt-1">{r.route}</div>
              <div className="text-[10px] text-navy-400 mt-1">{r.capacity} o'rin</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Transport qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Transport (marka/raqam)</label>
        <input className="input !py-2.5 mb-4" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
        <label className="label">Haydovchi</label>
        <input className="input !py-2.5 mb-4" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
        <label className="label">Marshrut</label>
        <input className="input !py-2.5 mb-4" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
        <label className="label">Sig'im</label>
        <input className="input !py-2.5" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      </Modal>
    </div>
  );
}
