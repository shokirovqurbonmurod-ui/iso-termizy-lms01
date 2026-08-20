import { useEffect, useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { title: '', reward_coins: 10, target: 10, progress: 0, status: 'active' };

export default function MissionsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/missions?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/missions', { ...form, reward_coins: Math.min(40, Number(form.reward_coins) || 0), target: Number(form.target) || 0, progress: Number(form.progress) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Target} title="Missiyalar" subtitle="O'quvchilar uchun gamifikatsiya missiyalari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Missiya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Target} title="Missiya yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => {
            const pct = r.target ? Math.min(100, Math.round((r.progress / r.target) * 100)) : 0;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-navy-800 text-sm">{r.title}</span>
                  <span className="text-[11px] font-bold text-gold-600">🪙 {r.reward_coins}</span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden mb-1.5">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-navy-400">
                  <span>{r.progress}/{r.target}</span>
                  <span>{r.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Missiya qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Missiya nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Mukofot (max 40)</label>
            <input className="input !py-2.5" type="number" max={40} value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} />
          </div>
          <div>
            <label className="label">Maqsad</label>
            <input className="input !py-2.5" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          </div>
          <div>
            <label className="label">Bajarilgan</label>
            <input className="input !py-2.5" type="number" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
