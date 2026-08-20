import { useEffect, useState } from 'react';
import { Users, Plus, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { mentor: '', mentee: '', focus: '', start_date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function MentorshipPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/mentorship?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows(r || []); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.mentor.trim() || !form.mentee.trim()) return;
    setSaving(true);
    try { await api.post('/mentorship', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleDone(row) {
    await api.put(`/mentorship/${row.id}`, { status: row.status === 'active' ? 'completed' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Mentorlik" subtitle="Tajribali xodimlar tomonidan yangi xodimlarni yetaklash"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Juftlik qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Users} title="Mentorlik juftligi yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-800">{r.mentor} <ArrowRight size={12} className="text-navy-400" /> {r.mentee}</div>
                <div className="text-[11px] text-navy-400">{r.focus || 'yo\'nalish belgilanmagan'} · {r.start_date}</div>
              </div>
              <button onClick={() => toggleDone(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : 'tugallandi'}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Mentorlik juftligi qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Mentor</label>
        <input className="input !py-2.5 mb-4" list="staff-list-mentor" value={form.mentor} onChange={(e) => setForm({ ...form, mentor: e.target.value })} />
        <label className="label">Mentee (yetaklanuvchi)</label>
        <input className="input !py-2.5 mb-4" list="staff-list-mentor" value={form.mentee} onChange={(e) => setForm({ ...form, mentee: e.target.value })} />
        <datalist id="staff-list-mentor">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Yo'nalish</label>
        <input className="input !py-2.5" value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} placeholder="Masalan: metodika, klass boshqaruvi" />
      </Modal>
    </div>
  );
}
