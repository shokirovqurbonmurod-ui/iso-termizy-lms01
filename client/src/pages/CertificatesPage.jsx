import { useEffect, useMemo, useState } from 'react';
import { Award, Plus, Download, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { downloadCertificatePdf } from '../lib/certificate.js';

function randomSerial() { return 'ISO-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }

export default function CertificatesPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student: '', course: '', level: '', serial: randomSerial() });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [c, s] = await Promise.all([api.get('/certificates?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((c || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !q.trim() || r.student.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  function openAdd() {
    setForm({ student: students[0]?.full_name || '', course: '', level: '', serial: randomSerial() });
    setModal(true);
  }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try {
      await api.post('/certificates', { ...form, date: new Date().toISOString().slice(0, 10) });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Award} title="Sertifikatlar" subtitle="Berilgan sertifikatlar — bosma PDF yuklab olish mumkin"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi sertifikat</button>} />

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="O'quvchi qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={Award} title="Sertifikat yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <Award size={20} className="text-gold-500" />
                <span className="text-[10px] text-navy-400 font-mono">{c.serial}</span>
              </div>
              <div className="text-sm font-bold text-navy-800">{c.student}</div>
              <div className="text-xs text-navy-500 mb-1">{c.course} {c.level && `· ${c.level}`}</div>
              <div className="text-[11px] text-navy-400 mb-3">{c.date}</div>
              <button onClick={() => downloadCertificatePdf(c)} className="btn-ghost !py-1.5 !px-3 text-xs w-full justify-center"><Download size={12} /> PDF yuklab olish</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi sertifikat" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Kurs</label>
            <input className="input !py-2.5" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
          </div>
          <div>
            <label className="label">Daraja</label>
            <input className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
        </div>
        <label className="label">Seriya raqami</label>
        <input className="input !py-2.5" value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
      </Modal>
    </div>
  );
}
