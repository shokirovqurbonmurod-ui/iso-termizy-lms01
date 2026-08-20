import { useEffect, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { title: '', department: '', description: '', deadline: '', status: 'open' };

export default function InternalJobsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/internal_jobs?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1)));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/internal_jobs', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleClosed(row) {
    await api.put(`/internal_jobs/${row.id}`, { status: row.status === 'open' ? 'closed' : 'open' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Briefcase} title="Ichki vakansiyalar" subtitle="Xodimlar uchun ichki ko'tarilish imkoniyatlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Vakansiya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Briefcase} title="Vakansiya yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy-800">{r.title}</span>
                <button onClick={() => toggleClosed(r)} className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status === 'open' ? 'ochiq' : 'yopilgan'}</button>
              </div>
              <div className="text-[11px] text-navy-400 mb-2">{r.department} {r.deadline && `· ${r.deadline} gacha`}</div>
              {r.description && <p className="text-xs text-navy-500">{r.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Vakansiya qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Lavozim nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Bo'lim</label>
            <input className="input !py-2.5" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Muddat</label>
            <input className="input !py-2.5" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Modal>
    </div>
  );
}
