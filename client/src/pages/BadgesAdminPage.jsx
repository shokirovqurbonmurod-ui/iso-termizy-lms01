import { useEffect, useState } from 'react';
import { Medal, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { name: '', icon: '🏅', criteria: '', holders: 0 };

export default function BadgesAdminPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/badges?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/badges', { ...form, holders: Number(form.holders) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Medal} title="Badge boshqaruvi" subtitle="O'quvchilarga beriladigan yutuq nishonlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Badge qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Medal} title="Badge yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 text-center">
              <div className="text-3xl mb-2">{r.icon || '🏅'}</div>
              <div className="text-sm font-bold text-navy-800">{r.name}</div>
              {r.criteria && <div className="text-[11px] text-navy-400 mt-1">{r.criteria}</div>}
              <div className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2 py-0.5 inline-block mt-2">{r.holders || 0} kishi ega</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Badge qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Badge nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Belgi (emoji)</label>
        <input className="input !py-2.5 mb-4" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <label className="label">Berilish sharti</label>
        <input className="input !py-2.5" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} />
      </Modal>
    </div>
  );
}
