import { useEffect, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { group_name: '', period: '', avg_progress: 0, note: '', date: new Date().toISOString().slice(0, 10) };

export default function StudentProgressReportsPage() {
  const [rows, setRows] = useState(null);
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, g] = await Promise.all([api.get('/student_progress_reports?limit=500').catch(() => []), api.get('/groups').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, group_name: groups[0]?.name || '' }); setModal(true); }

  async function save() {
    if (!form.group_name.trim()) return;
    setSaving(true);
    try { await api.post('/student_progress_reports', { ...form, avg_progress: Number(form.avg_progress) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Progress hisobot" subtitle="Guruhlar bo'yicha davriy progress hisobotlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hisobot qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={BarChart3} title="Hisobot yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy-800">{r.group_name}</span>
                <span className="text-[10px] text-navy-400">{r.period} · {r.date}</span>
              </div>
              <div className="h-2 rounded-full bg-navy-100 overflow-hidden mb-1">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, r.avg_progress || 0)}%` }} />
              </div>
              <div className="text-right text-xs font-bold text-gold-600 mb-1">{r.avg_progress}%</div>
              {r.note && <div className="text-xs text-navy-500">{r.note}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Progress hisobot qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Guruh</label>
        <select className="input !py-2.5 mb-4" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Davr</label>
            <input className="input !py-2.5" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Masalan: Avgust 2026" />
          </div>
          <div>
            <label className="label">O'rtacha progress %</label>
            <input className="input !py-2.5" type="number" value={form.avg_progress} onChange={(e) => setForm({ ...form, avg_progress: e.target.value })} />
          </div>
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Modal>
    </div>
  );
}
