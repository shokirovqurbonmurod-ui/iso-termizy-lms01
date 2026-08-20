import { useEffect, useState } from 'react';
import { Gift, Plus, Check, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { student: '', program: '', reason: '', date: new Date().toISOString().slice(0, 10), status: 'pending' };

export default function ScholarshipApplicationsPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/scholarship_applications?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, student: students[0]?.full_name || '' }); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/scholarship_applications', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function decide(row, status) {
    await api.put(`/scholarship_applications/${row.id}`, { status }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gift} title="Stipendiya arizalari" subtitle="O'quvchilarning stipendiya so'rovlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Ariza qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Gift} title="Ariza yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.student}</div>
                <div className="text-[11px] text-navy-400">{r.program} · {r.date}</div>
                {r.reason && <div className="text-xs text-navy-500 mt-0.5">{r.reason}</div>}
              </div>
              {r.status === 'pending' ? (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(r, 'rejected')} className="btn-ghost !py-1.5 !px-2.5 text-xs"><X size={13} /></button>
                  <button onClick={() => decide(r, 'approved')} className="btn-gold !py-1.5 !px-2.5 text-xs"><Check size={13} /></button>
                </div>
              ) : <span className={`chip text-[10px] shrink-0 ${statusStyle(r.status === 'approved' ? 'won' : 'lost')}`}>{r.status === 'approved' ? 'tasdiqlandi' : 'rad etildi'}</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Stipendiya arizasi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <label className="label">Dastur</label>
        <input className="input !py-2.5 mb-4" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="Masalan: Olimpiada stipendiyasi" />
        <label className="label">Sabab</label>
        <textarea className="input !py-2.5" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Modal>
    </div>
  );
}
