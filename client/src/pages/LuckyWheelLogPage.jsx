import { useEffect, useMemo, useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { student: '', prize: '', coins: 0, date: new Date().toISOString().slice(0, 10) };

export default function LuckyWheelLogPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/lucky_wheel_log?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const totalCoins = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.coins) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/lucky_wheel_log', { ...form, coins: Number(form.coins) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Target} title="Omad g'ildiragi tarixi" subtitle={`${rows.length} ta aylantirish · ${totalCoins} coin berildi`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yozuv qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Target} title="Yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white shrink-0">🎡</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.student}</div>
                <div className="text-[11px] text-navy-400">{r.prize} · {r.date}</div>
              </div>
              <span className="font-bold text-gold-600 text-sm shrink-0">🪙 {r.coins}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yozuv qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <input className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} />
        <label className="label">Sovrin</label>
        <input className="input !py-2.5 mb-4" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
        <label className="label">Coin</label>
        <input className="input !py-2.5" type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} />
      </Modal>
    </div>
  );
}
