import { useEffect, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { days: 7, reward_coins: 15, badge: '', status: 'active' };

export default function StreakRewardsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/streak_rewards?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (a.days || 0) - (b.days || 0)));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.days) return;
    setSaving(true);
    try { await api.post('/streak_rewards', { ...form, days: Number(form.days) || 0, reward_coins: Number(form.reward_coins) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleStatus(row) {
    await api.put(`/streak_rewards/${row.id}`, { status: row.status === 'active' ? 'disabled' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Flame} title="Streak mukofotlari" subtitle="Ketma-ket kelish uchun mukofot bosqichlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Bosqich qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Flame} title="Streak mukofoti yo'q" /> : (
        <div className="flex flex-wrap gap-4">
          {rows.map((r) => (
            <button key={r.id} onClick={() => toggleStatus(r)} className="card p-4 w-40 text-center hover:-translate-y-1 transition">
              <div className="flex items-center justify-center gap-1 text-rose-500 mb-1"><Flame size={18} /> <span className="font-display text-xl text-navy-800">{r.days}</span></div>
              <div className="text-[11px] text-navy-400 mb-2">kun ketma-ket</div>
              <div className="text-xs font-bold text-gold-600">🪙 {r.reward_coins}</div>
              {r.badge && <div className="text-[10px] text-navy-500 mt-1">{r.badge}</div>}
              <span className={`chip text-[9px] mt-2 inline-block ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : "o'chirilgan"}</span>
            </button>
          ))}
        </div>
      )}

      <Modal open={modal} title="Streak bosqichi qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Necha kun</label>
            <input className="input !py-2.5" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          </div>
          <div>
            <label className="label">Mukofot coin</label>
            <input className="input !py-2.5" type="number" value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} />
          </div>
        </div>
        <label className="label">Badge nomi (ixtiyoriy)</label>
        <input className="input !py-2.5" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
      </Modal>
    </div>
  );
}
