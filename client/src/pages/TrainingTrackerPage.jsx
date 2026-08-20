import { useEffect, useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { staff: '', training: '', provider: '', date: new Date().toISOString().slice(0, 10), status: 'planned' };

export default function TrainingTrackerPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/training_tracker?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try { await api.post('/training_tracker', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleDone(row) {
    await api.put(`/training_tracker/${row.id}`, { status: row.status === 'completed' ? 'planned' : 'completed' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={GraduationCap} title="Trening tracker" subtitle="Xodimlar treninglari va malaka oshirish"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Trening qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={GraduationCap} title="Trening yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.training}</div>
                <div className="text-[11px] text-navy-400">{r.staff} · {r.provider || 'provider yo\'q'} · {r.date}</div>
              </div>
              <button onClick={() => toggleDone(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'completed' ? 'tugallandi' : 'rejalashtirilgan'}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Trening qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-tr" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <datalist id="staff-list-tr">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Trening nomi</label>
        <input className="input !py-2.5 mb-4" value={form.training} onChange={(e) => setForm({ ...form, training: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Provayder</label>
            <input className="input !py-2.5" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
