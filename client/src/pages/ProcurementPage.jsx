import { useEffect, useState } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';

const empty = { item: '', quantity: 1, cost: 0, vendor: '', status: 'pending' };
const STATUSES = ['pending', 'ordered', 'received'];
const STATUS_LABEL = { pending: 'kutilmoqda', ordered: 'buyurtma qilindi', received: 'qabul qilindi' };

export default function ProcurementPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/procurement?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.item.trim()) return;
    setSaving(true);
    try { await api.post('/procurement', { ...form, quantity: Number(form.quantity) || 0, cost: Number(form.cost) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function advanceStatus(row) {
    const idx = STATUSES.indexOf(row.status);
    const next = STATUSES[Math.min(idx + 1, STATUSES.length - 1)];
    await api.put(`/procurement/${row.id}`, { status: next }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ShoppingBag} title="Xarid qilish" subtitle="Markaz uchun jihoz va materiallar xaridi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Xarid qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={ShoppingBag} title="Xarid yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.item} {r.quantity > 1 && `× ${r.quantity}`}</div>
                <div className="text-[11px] text-navy-400">{r.vendor || "yetkazuvchi yo'q"} · {money(r.cost)}</div>
              </div>
              <button onClick={() => advanceStatus(r)} disabled={r.status === 'received'}
                className={`chip text-[10px] shrink-0 disabled:cursor-default ${statusStyle(r.status === 'received' ? 'done' : r.status === 'ordered' ? 'pending' : 'new')}`}>
                {STATUS_LABEL[r.status] || r.status}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Xarid qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Mahsulot</label>
        <input className="input !py-2.5 mb-4" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Soni</label>
            <input className="input !py-2.5" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label">Narxi</label>
            <input className="input !py-2.5" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
        </div>
        <label className="label">Yetkazuvchi</label>
        <input className="input !py-2.5" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
      </Modal>
    </div>
  );
}
