import { useEffect, useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { person: '', area: '', access_level: 'Standart', date: new Date().toISOString().slice(0, 10), status: 'granted' };

export default function AccessControlPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/access_control?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows(r || []); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.person.trim()) return;
    setSaving(true);
    try { await api.post('/access_control', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleRevoke(row) {
    await api.put(`/access_control/${row.id}`, { status: row.status === 'granted' ? 'revoked' : 'granted' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Kirish nazorati" subtitle="Xonalar va zonalarga kirish ruxsatlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Ruxsat qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={ShieldCheck} title="Ruxsat yozuvi yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.person}</div>
                <div className="text-[11px] text-navy-400">{r.area} · {r.access_level} · {r.date}</div>
              </div>
              <button onClick={() => toggleRevoke(r)}
                className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${r.status === 'granted' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                {r.status === 'granted' ? 'ruxsat berilgan' : 'bekor qilingan'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Ruxsat qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Shaxs</label>
        <input className="input !py-2.5 mb-4" list="staff-list-ac" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} />
        <datalist id="staff-list-ac">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Zona</label>
        <input className="input !py-2.5 mb-4" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Masalan: Server xonasi" />
        <label className="label">Daraja</label>
        <input className="input !py-2.5" value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value })} />
      </Modal>
    </div>
  );
}
