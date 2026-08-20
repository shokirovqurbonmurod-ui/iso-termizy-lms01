import { useEffect, useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { owner: '', objective: '', key_result: '', progress: 0, quarter: 'Q3 2026', status: 'active' };

export default function OkrGoalsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/okr_goals?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.objective.trim()) return;
    setSaving(true);
    try { await api.post('/okr_goals', { ...form, progress: Number(form.progress) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Target} title="OKR maqsadlar" subtitle="Bo'lim va xodimlarning choraklik maqsadlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Maqsad qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Target} title="OKR yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-navy-400 bg-navy-100 rounded-full px-2 py-0.5">{r.quarter}</span>
                <span className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status}</span>
              </div>
              <div className="text-sm font-bold text-navy-800 mt-2">{r.objective}</div>
              {r.key_result && <div className="text-xs text-navy-500 mt-1">🎯 {r.key_result}</div>}
              <div className="text-[11px] text-navy-400 mt-1">{r.owner}</div>
              <div className="h-2 rounded-full bg-navy-100 overflow-hidden mt-2">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, r.progress || 0)}%` }} />
              </div>
              <div className="text-right text-[11px] font-bold text-gold-600 mt-1">{r.progress || 0}%</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="OKR maqsad qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Egasi (bo'lim/xodim)</label>
        <input className="input !py-2.5 mb-4" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        <label className="label">Maqsad (Objective)</label>
        <input className="input !py-2.5 mb-4" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
        <label className="label">Asosiy natija (Key Result)</label>
        <input className="input !py-2.5 mb-4" value={form.key_result} onChange={(e) => setForm({ ...form, key_result: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Chorak</label>
            <input className="input !py-2.5" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} />
          </div>
          <div>
            <label className="label">Bajarilish %</label>
            <input className="input !py-2.5" type="number" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
