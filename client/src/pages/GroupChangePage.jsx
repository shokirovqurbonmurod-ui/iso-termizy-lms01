import { useEffect, useMemo, useState } from 'react';
import { Repeat, Plus, ArrowRight, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

export default function GroupChangePage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', to_group: '', reason: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s, g] = await Promise.all([
      api.get('/transfers?limit=500').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/groups').catch(() => []),
    ]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setStudents(s || []); setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  const pending = useMemo(() => (rows || []).filter((r) => r.status === 'pending'), [rows]);
  const done = useMemo(() => (rows || []).filter((r) => r.status !== 'pending'), [rows]);

  function openAdd() {
    setForm({ student_id: students[0]?.id || '', to_group: groups[0]?.name || '', reason: '' });
    setModal(true);
  }

  async function save() {
    const student = students.find((s) => String(s.id) === String(form.student_id));
    if (!student || !form.to_group) return;
    setSaving(true);
    try {
      await api.post('/transfers', {
        student: student.full_name, from_group: student.group_name || '—', to_group: form.to_group,
        date: new Date().toISOString().slice(0, 10), reason: form.reason, status: 'pending',
      });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function approve(row) {
    const student = students.find((s) => s.full_name === row.student);
    if (!confirm(`${row.student} guruhi "${row.to_group}"ga o'zgartirilsinmi?`)) return;
    try {
      if (student) await api.put(`/students/${student.id}`, { group_name: row.to_group });
      await api.put(`/transfers/${row.id}`, { status: 'done' });
      await load();
    } catch (e) { alert(e.message); }
  }

  async function reject(row) {
    if (!confirm("Bu so'rov bekor qilinsinmi?")) return;
    await api.put(`/transfers/${row.id}`, { status: 'rejected' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Repeat} title="Guruh o'zgartirish" subtitle="O'quvchilarni boshqa guruhga ko'chirish so'rovlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi so'rov</button>} />

      <div className="mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-3">Kutilmoqda ({pending.length})</h3>
        {pending.length === 0 ? <Empty icon={Repeat} title="Kutilayotgan so'rov yo'q" /> : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">{r.student}</div>
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mt-0.5">
                    <span>{r.from_group}</span><ArrowRight size={12} /><span className="font-semibold text-navy-700">{r.to_group}</span>
                  </div>
                  {r.reason && <div className="text-[11px] text-navy-400 mt-0.5">{r.reason}</div>}
                </div>
                <button onClick={() => reject(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">Rad etish</button>
                <button onClick={() => approve(r)} className="btn-gold !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Tasdiqlash</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">Tarix</h3>
          <div className="space-y-1.5">
            {done.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                <span className="text-navy-700 flex items-center gap-1.5">{r.student}: {r.from_group} <ArrowRight size={11} /> {r.to_group}</span>
                <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${r.status === 'done' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>{r.status === 'done' ? 'Bajarildi' : 'Rad etildi'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} title="Guruh o'zgartirish so'rovi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.group_name}</option>)}
        </select>
        <label className="label">Yangi guruh</label>
        <select className="input !py-2.5 mb-4" value={form.to_group} onChange={(e) => setForm({ ...form, to_group: e.target.value })}>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <label className="label">Sabab</label>
        <textarea className="input !py-2.5" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Modal>
    </div>
  );
}
