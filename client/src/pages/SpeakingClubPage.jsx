import { useEffect, useState } from 'react';
import { Video, Plus, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { title: '', topic: '', teacher: '', date: new Date().toISOString().slice(0, 10), time: '', max_seats: 10, registered: 0, status: 'open' };

export default function SpeakingClubPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/speaking_club?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/speaking_club', { ...form, max_seats: Number(form.max_seats) || 0, registered: Number(form.registered) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function joinSeat(row) {
    if ((row.registered || 0) >= (row.max_seats || 0)) return;
    const registered = (row.registered || 0) + 1;
    const status = registered >= row.max_seats ? 'full' : 'open';
    await api.put(`/speaking_club/${row.id}`, { registered, status }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Video} title="Speaking Club" subtitle="Ingliz tilida erkin muloqot sessiyalari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Sessiya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Video} title="Sessiya yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => {
            const full = r.status === 'full' || (r.registered || 0) >= (r.max_seats || 0);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-navy-800 text-sm">{r.title}</span>
                  <span className={`chip text-[9px] ${full ? 'bg-red-50 text-red-500' : r.status === 'done' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>{r.status === 'done' ? 'tugadi' : full ? "to'la" : "o'rin bor"}</span>
                </div>
                {r.topic && <div className="text-[11px] text-navy-400 mb-1">{r.topic}</div>}
                <div className="text-[11px] text-navy-400 mb-3">{r.teacher || "o'qituvchi yo'q"} · {r.date} {r.time}</div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-navy-600"><Users size={12} /> {r.registered || 0}/{r.max_seats || 0}</span>
                  {r.status !== 'done' && <button onClick={() => joinSeat(r)} disabled={full} className="btn-ghost !py-1 !px-2.5 text-[11px] disabled:opacity-40">Yozilish</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Sessiya qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Sessiya nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Tema</label>
        <input className="input !py-2.5 mb-4" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <label className="label">O'qituvchi</label>
        <input className="input !py-2.5 mb-4" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div>
            <label className="label">Max o'rin</label>
            <input className="input !py-2.5" type="number" value={form.max_seats} onChange={(e) => setForm({ ...form, max_seats: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
