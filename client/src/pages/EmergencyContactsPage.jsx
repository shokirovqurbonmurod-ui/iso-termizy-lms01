import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const TYPES = ["Yong'in", 'Tibbiy', 'Politsiya', 'Ichki'];
const TYPE_COLOR = { "Yong'in": 'bg-red-500', Tibbiy: 'bg-emerald-500', Politsiya: 'bg-blue-500', Ichki: 'bg-navy-500' };
const empty = { name: '', role: '', phone: '', type: 'Ichki' };

export default function EmergencyContactsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/emergency_contacts?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/emergency_contacts', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={AlertTriangle} title="Favqulodda aloqa" subtitle="Shoshilinch vaziyatlar uchun telefon raqamlar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Kontakt qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={AlertTriangle} title="Kontakt yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 flex items-center gap-3">
              <div className={`grid place-items-center w-10 h-10 rounded-full text-white shrink-0 ${TYPE_COLOR[r.type] || 'bg-navy-500'}`}><Phone size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-navy-800 truncate">{r.name}</div>
                <div className="text-[11px] text-navy-400">{r.role}</div>
                <div className="text-sm font-mono font-bold text-navy-700 mt-0.5">{r.phone}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Kontakt qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Rol/lavozim</label>
        <input className="input !py-2.5 mb-4" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefon</label>
            <input className="input !py-2.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
