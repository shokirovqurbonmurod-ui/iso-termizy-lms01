import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Plus, ChevronUp } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const CATEGORIES = ['Metodika', 'Marketing', 'IT', 'Boshqa'];
const empty = { submitted_by: '', idea: '', category: 'Metodika', votes: 0, status: 'new' };

export default function InnovationBoardPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/innovation_board?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.votes || 0) - (a.votes || 0)));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.idea.trim()) return;
    setSaving(true);
    try { await api.post('/innovation_board', { ...form, votes: 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function upvote(row) {
    await api.put(`/innovation_board/${row.id}`, { votes: (row.votes || 0) + 1 }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Lightbulb} title="Innovatsiya board" subtitle="Xodimlardan yangi g'oyalar va takliflar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> G'oya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Lightbulb} title="G'oya yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <button onClick={() => upvote(r)} className="flex flex-col items-center gap-0.5 text-navy-400 hover:text-gold-600 transition shrink-0">
                <ChevronUp size={16} />
                <span className="text-xs font-bold">{r.votes || 0}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.idea}</div>
                <div className="text-[11px] text-navy-400">{r.submitted_by || "noma'lum"} · {r.category}</div>
              </div>
              <span className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi g'oya" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">G'oya</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} />
        <label className="label">Taklif etuvchi</label>
        <input className="input !py-2.5 mb-4" value={form.submitted_by} onChange={(e) => setForm({ ...form, submitted_by: e.target.value })} />
        <label className="label">Turkum</label>
        <select className="input !py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Modal>
    </div>
  );
}
