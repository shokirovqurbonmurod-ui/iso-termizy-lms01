import { useEffect, useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { staff: '', policy_number: '', provider: '', valid_until: '', status: 'active' };

export default function InsurancePage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/insurance?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows(r || []); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try { await api.post('/insurance', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Sug'urta" subtitle="Xodimlarning sog'liq sug'urtasi polislari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Polis qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={ShieldCheck} title="Sug'urta polisi yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => {
            const expired = r.valid_until && r.valid_until < new Date().toISOString().slice(0, 10);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-navy-800">{r.staff}</span>
                  <span className={`chip text-[9px] ${statusStyle(expired ? 'lost' : r.status)}`}>{expired ? 'muddati tugagan' : r.status}</span>
                </div>
                <div className="text-[11px] text-navy-400">{r.provider || "provayder yo'q"}</div>
                <div className="text-[11px] text-navy-400 font-mono">{r.policy_number}</div>
                {r.valid_until && <div className="text-[11px] text-navy-500 mt-1">{r.valid_until} gacha</div>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Sug'urta polisi qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-ins" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <datalist id="staff-list-ins">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Polis raqami</label>
        <input className="input !py-2.5 mb-4" value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Provayder</label>
            <input className="input !py-2.5" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div>
            <label className="label">Amal muddati</label>
            <input className="input !py-2.5" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
