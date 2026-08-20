import { useEffect, useMemo, useState } from 'react';
import { Snowflake, Plus, Sun } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

export default function FrozenStudentsPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', reason: '', unfreeze_date: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/frozen_students?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.freeze_date || '').localeCompare(a.freeze_date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const active = useMemo(() => (rows || []).filter((r) => r.status === 'frozen'), [rows]);
  const past = useMemo(() => (rows || []).filter((r) => r.status !== 'frozen'), [rows]);
  const availableStudents = useMemo(() => students.filter((s) => s.status !== 'frozen'), [students]);

  function openAdd() {
    setForm({ student_id: availableStudents[0]?.id || '', reason: '', unfreeze_date: '' });
    setModal(true);
  }

  async function freeze() {
    const student = students.find((s) => String(s.id) === String(form.student_id));
    if (!student) return;
    setSaving(true);
    try {
      await api.post('/frozen_students', {
        student: student.full_name, group_name: student.group_name, freeze_date: new Date().toISOString().slice(0, 10),
        unfreeze_date: form.unfreeze_date, reason: form.reason, status: 'frozen',
      });
      await api.put(`/students/${student.id}`, { status: 'frozen' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function unfreeze(row) {
    if (!confirm(`${row.student} muzlatishdan chiqarilsinmi?`)) return;
    await api.put(`/frozen_students/${row.id}`, { status: 'unfrozen' }).catch(() => {});
    const student = students.find((s) => s.full_name === row.student);
    if (student) await api.put(`/students/${student.id}`, { status: 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Snowflake} title="Muzlatilganlar" subtitle="Vaqtincha to'xtatilgan o'quvchilar"
        actions={availableStudents.length > 0 && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Muzlatish</button>} />

      <div className="mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-3">Hozir muzlatilgan ({active.length})</h3>
        {active.length === 0 ? <Empty icon={Snowflake} title="Muzlatilgan o'quvchi yo'q" /> : (
          <div className="space-y-2">
            {active.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-sky-50/60 border border-sky-100 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">{r.student}</div>
                  <div className="text-[11px] text-navy-400">{r.group_name} · muzlatilgan: {r.freeze_date} {r.unfreeze_date && `· rejalashtirilgan ochilish: ${r.unfreeze_date}`}</div>
                  {r.reason && <div className="text-xs text-navy-500 mt-0.5">{r.reason}</div>}
                </div>
                <button onClick={() => unfreeze(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Sun size={13} /> Ochish</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">Tarix</h3>
          <div className="space-y-1.5">
            {past.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                <span className="text-navy-700">{r.student} — {r.group_name}</span>
                <span className="text-[11px] text-navy-400">{r.freeze_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} title="O'quvchini muzlatish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={freeze} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Muzlatish'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
          {availableStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.group_name}</option>)}
        </select>
        <label className="label">Rejalashtirilgan ochilish sanasi (ixtiyoriy)</label>
        <input className="input !py-2.5 mb-4" type="date" value={form.unfreeze_date} onChange={(e) => setForm({ ...form, unfreeze_date: e.target.value })} />
        <label className="label">Sabab</label>
        <textarea className="input !py-2.5" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Modal>
    </div>
  );
}
