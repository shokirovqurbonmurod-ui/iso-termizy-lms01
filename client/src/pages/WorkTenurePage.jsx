import { useEffect, useState } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { staff: '', position: '', hire_date: new Date().toISOString().slice(0, 10), status: 'active' };

function tenureLabel(hireDate) {
  if (!hireDate) return '—';
  const d = new Date(hireDate), now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12), rem = months % 12;
  if (years === 0) return `${rem} oy`;
  return rem === 0 ? `${years} yil` : `${years} yil ${rem} oy`;
}

export default function WorkTenurePage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/work_tenure?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (a.hire_date || '').localeCompare(b.hire_date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try { await api.post('/work_tenure', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Ish staji" subtitle="Xodimlarning markazda ishlash muddati"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Xodim qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={TrendingUp} title="Yozuv yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="text-sm font-bold text-navy-800">{r.staff}</div>
              <div className="text-[11px] text-navy-400 mb-2">{r.position || "lavozim ko'rsatilmagan"} · {r.hire_date}</div>
              <div className="font-display text-lg text-gold-600">{tenureLabel(r.hire_date)}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Xodim qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-tenure" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <datalist id="staff-list-tenure">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Lavozim</label>
        <input className="input !py-2.5 mb-4" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <label className="label">Ishga kirgan sana</label>
        <input className="input !py-2.5" type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
      </Modal>
    </div>
  );
}
