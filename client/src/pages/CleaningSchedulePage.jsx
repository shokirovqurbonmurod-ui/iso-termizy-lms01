import { useEffect, useState } from 'react';
import { Calendar, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const empty = { room: '', assigned_to: '', day: 'Dushanba', time: '07:00', status: 'pending' };

export default function CleaningSchedulePage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/cleaning_schedule?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.room.trim()) return;
    setSaving(true);
    try { await api.post('/cleaning_schedule', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleDone(row) {
    await api.put(`/cleaning_schedule/${row.id}`, { status: row.status === 'done' ? 'pending' : 'done' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Calendar} title="Tozalash jadvali" subtitle="Xonalar bo'yicha tozalash grafigi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Jadval qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Calendar} title="Jadval yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.room}</div>
                <div className="text-[11px] text-navy-400">{r.assigned_to || "mas'ul yo'q"} · {r.day} · {r.time}</div>
              </div>
              <button onClick={() => toggleDone(r)}
                className={`flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 transition ${r.status === 'done' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>
                <Check size={11} /> {r.status === 'done' ? 'bajarildi' : 'kutilmoqda'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Jadval qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xona</label>
        <input className="input !py-2.5 mb-4" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        <label className="label">Mas'ul</label>
        <input className="input !py-2.5 mb-4" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kun</label>
            <select className="input !py-2.5" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
