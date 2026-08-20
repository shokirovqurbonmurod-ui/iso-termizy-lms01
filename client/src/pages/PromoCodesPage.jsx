import { useEffect, useState } from 'react';
import { Gift, Plus, Copy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

function genCode() {
  return 'ISO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}
const empty = { code: genCode(), reward_coins: 20, max_uses: 50, used: 0, expires: '', status: 'active' };

export default function PromoCodesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/promo_codes?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, code: genCode() }); setModal(true); }

  async function save() {
    if (!form.code.trim()) return;
    setSaving(true);
    try { await api.post('/promo_codes', { ...form, reward_coins: Number(form.reward_coins) || 0, max_uses: Number(form.max_uses) || 0, used: 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  function copyCode(code) { navigator.clipboard?.writeText(code).catch(() => {}); }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gift} title="Promo kodlar" subtitle="Coin mukofoti beruvchi promo kodlar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Kod yaratish</button>} />

      {rows.length === 0 ? <Empty icon={Gift} title="Promo kod yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => copyCode(r.code)} className="font-mono text-sm font-bold text-navy-800 flex items-center gap-1.5 hover:text-gold-600 transition">{r.code} <Copy size={11} /></button>
                <span className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status}</span>
              </div>
              <div className="text-xs text-gold-600 font-bold mb-1">🪙 {r.reward_coins} coin</div>
              <div className="text-[11px] text-navy-400">{r.used || 0}/{r.max_uses} ishlatilgan {r.expires && `· ${r.expires} gacha`}</div>
              <div className="h-1.5 rounded-full bg-navy-100 overflow-hidden mt-2">
                <div className="h-full rounded-full bg-navy-400" style={{ width: `${r.max_uses ? Math.min(100, ((r.used || 0) / r.max_uses) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Promo kod yaratish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yaratish'}</button>
        </>}
      >
        <label className="label">Kod</label>
        <input className="input !py-2.5 mb-4 font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Mukofot (coin)</label>
            <input className="input !py-2.5" type="number" value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} />
          </div>
          <div>
            <label className="label">Maksimal ishlatish</label>
            <input className="input !py-2.5" type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          </div>
        </div>
        <label className="label">Amal qilish muddati</label>
        <input className="input !py-2.5" type="date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
      </Modal>
    </div>
  );
}
