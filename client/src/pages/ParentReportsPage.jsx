import { useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

function isoWeek() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
const empty = { student: '', week: isoWeek(), summary: '', sent_date: new Date().toISOString().slice(0, 10) };

export default function ParentReportsPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/parent_reports?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.sent_date || '').localeCompare(a.sent_date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, student: students[0]?.full_name || '' }); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/parent_reports', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileText} title="Haftalik hisobot" subtitle="Ota-onalarga yuboriladigan haftalik progress hisobotlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hisobot qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={FileText} title="Hisobot yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-navy-800">{r.student}</span>
                <span className="text-[10px] text-navy-400">{r.week} · {r.sent_date}</span>
              </div>
              <div className="text-xs text-navy-600">{r.summary}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Hisobot qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <label className="label">Xulosa</label>
        <textarea className="input !py-2.5" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Davomat, progress, uy vazifasi haqida qisqacha" />
      </Modal>
    </div>
  );
}
