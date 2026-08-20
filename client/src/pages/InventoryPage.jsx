import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const CATEGORIES = ['Texnika', 'Mebel', 'Jihoz', 'Kanstovar', 'Boshqa'];
const STATUS_LABEL = { active: 'Ishlamoqda', repair: "Ta'mirda", written_off: 'Hisobdan chiqarilgan' };
const empty = { name: '', category: 'Texnika', qty: 1, location: '', status: 'active' };

export default function InventoryPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  async function load() { setRows(await api.get('/inventory?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const totalQty = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.qty) || 0), 0), [rows]);
  const repairCount = useMemo(() => (rows || []).filter((r) => r.status === 'repair').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/inventory', { ...form, qty: Number(form.qty) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function cycleStatus(row) {
    const order = ['active', 'repair', 'written_off'];
    const next = order[(order.indexOf(row.status) + 1) % order.length];
    await api.put(`/inventory/${row.id}`, { status: next }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Package} title="Inventar" subtitle={`${rows.length} xil jihoz · ${totalQty} dona · ${repairCount} ta ta'mirda`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Jihoz qo'shish</button>} />

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={Package} title="Jihoz topilmadi" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.name}</div>
                <div className="text-[11px] text-navy-400">{r.category} · {r.location || "joylashuv ko'rsatilmagan"} · {r.qty} dona</div>
              </div>
              <button onClick={() => cycleStatus(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{STATUS_LABEL[r.status] || r.status}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Jihoz qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Jihoz nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kategoriya</label>
            <select className="input !py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Soni</label>
            <input className="input !py-2.5" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </div>
        </div>
        <label className="label">Joylashuv</label>
        <input className="input !py-2.5" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </Modal>
    </div>
  );
}
