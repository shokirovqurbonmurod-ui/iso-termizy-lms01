import { useEffect, useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { key_name: '', room: '', holder: '', status: 'in_office' };

export default function KeyManagementPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/key_management?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.key_name.trim()) return;
    setSaving(true);
    try { await api.post('/key_management', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleCheckout(row) {
    await api.put(`/key_management/${row.id}`, { status: row.status === 'checked_out' ? 'in_office' : 'checked_out' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={KeyRound} title="Kalit boshqaruvi" subtitle="Xona kalitlarining kim qo'lida ekanligi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Kalit qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={KeyRound} title="Kalit yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy-800">{r.key_name}</span>
                <button onClick={() => toggleCheckout(r)}
                  className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${r.status === 'checked_out' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {r.status === 'checked_out' ? 'olingan' : 'ofisda'}
                </button>
              </div>
              <div className="text-[11px] text-navy-400">{r.room}</div>
              <div className="text-[11px] text-navy-500 mt-1">{r.holder || 'saqlovchi yo\'q'}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Kalit qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Kalit nomi</label>
        <input className="input !py-2.5 mb-4" value={form.key_name} onChange={(e) => setForm({ ...form, key_name: e.target.value })} />
        <label className="label">Xona</label>
        <input className="input !py-2.5 mb-4" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        <label className="label">Saqlovchi</label>
        <input className="input !py-2.5" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
      </Modal>
    </div>
  );
}
