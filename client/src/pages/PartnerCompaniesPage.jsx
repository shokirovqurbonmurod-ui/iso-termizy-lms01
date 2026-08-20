import { useEffect, useState } from 'react';
import { Building2, Plus, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const TYPES = ['Sertifikatsiya', "Ta'lim", 'Xizmat', 'Marketing'];
const empty = { name: '', type: "Ta'lim", contact: '', agreement: '', status: 'active' };

export default function PartnerCompaniesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/partner_companies?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/partner_companies', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleStatus(row) {
    await api.put(`/partner_companies/${row.id}`, { status: row.status === 'active' ? 'expired' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Building2} title="Hamkor tashkilotlar" subtitle="Markazning rasmiy hamkorlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hamkor qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Building2} title="Hamkor yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-navy-800 text-sm">{p.name}</span>
                <button onClick={() => toggleStatus(p)} className={`chip text-[9px] ${statusStyle(p.status)}`}>{p.status}</button>
              </div>
              <span className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2 py-0.5">{p.type}</span>
              {p.contact && <div className="flex items-center gap-1.5 text-xs text-navy-500 mt-2"><Phone size={11} /> {p.contact}</div>}
              {p.agreement && <div className="text-[11px] text-navy-400 mt-1">{p.agreement}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Hamkor qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Tashkilot nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Turi</label>
        <select className="input !py-2.5 mb-4" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="label">Aloqa</label>
        <input className="input !py-2.5 mb-4" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <label className="label">Shartnoma</label>
        <input className="input !py-2.5" value={form.agreement} onChange={(e) => setForm({ ...form, agreement: e.target.value })} />
      </Modal>
    </div>
  );
}
