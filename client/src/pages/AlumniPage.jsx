import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Award } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { student: '', course: '', graduation_date: new Date().toISOString().slice(0, 10), certificate: '', current_status: '' };

export default function AlumniPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/alumni_records?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.graduation_date || '').localeCompare(a.graduation_date || '')));
  }
  useEffect(() => { load(); }, []);

  const thisYear = useMemo(() => {
    const y = String(new Date().getFullYear());
    return (rows || []).filter((r) => (r.graduation_date || '').startsWith(y));
  }, [rows]);

  const byCourse = useMemo(() => {
    const m = {};
    for (const r of rows || []) { const k = r.course || "Noma'lum"; m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try {
      await api.post('/alumni_records', form);
      const student = (await api.get(`/students?q=${encodeURIComponent(form.student)}`).catch(() => []))
        .find((s) => s.full_name.toLowerCase() === form.student.trim().toLowerCase());
      if (student) await api.put(`/students/${student.id}`, { status: 'graduated' }).catch(() => {});
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={GraduationCap} title="Bitiruvchilar" subtitle="Kursni muvaffaqiyatli tugatgan o'quvchilar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Bitiruvchi qo'shish</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Jami bitiruvchi</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-gold-600">{thisYear.length}</div>
          <div className="text-sm text-navy-400">Bu yil</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-emerald-600">{rows.filter((r) => r.certificate).length}</div>
          <div className="text-sm text-navy-400">Sertifikatli</div>
        </div>
      </div>

      {byCourse.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {byCourse.map(([c, n]) => (
            <span key={c} className="text-[11px] font-bold text-navy-600 bg-navy-50 rounded-full px-2.5 py-1">{c}: {n}</span>
          ))}
        </div>
      )}

      {rows.length === 0 ? <Empty icon={GraduationCap} title="Hali bitiruvchi yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0"><GraduationCap size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.student}</div>
                <div className="text-[11px] text-navy-400">{r.course || '—'} · bitirgan: {r.graduation_date}</div>
                {r.current_status && <div className="text-[11px] text-navy-500 mt-0.5">{r.current_status}</div>}
              </div>
              {r.certificate && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600 shrink-0"><Award size={12} /> {r.certificate}</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Bitiruvchi qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">O'quvchi (F.I.Sh)</label>
        <input className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} />
        <label className="label">Kurs</label>
        <input className="input !py-2.5 mb-4" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Bitirgan sana</label>
            <input className="input !py-2.5" type="date" value={form.graduation_date} onChange={(e) => setForm({ ...form, graduation_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Sertifikat №</label>
            <input className="input !py-2.5" value={form.certificate} onChange={(e) => setForm({ ...form, certificate: e.target.value })} />
          </div>
        </div>
        <label className="label">Hozirgi holati (ixtiyoriy)</label>
        <input className="input !py-2.5" placeholder="Masalan: universitetda o'qiydi" value={form.current_status} onChange={(e) => setForm({ ...form, current_status: e.target.value })} />
      </Modal>
    </div>
  );
}
