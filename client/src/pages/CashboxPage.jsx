import { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';

const empty = { title: '', type: 'kirim', amount: 0, date: new Date().toISOString().slice(0, 10), note: '' };

export default function CashboxPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/cashbox?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const balance = useMemo(() => (rows || []).reduce((a, c) => a + (c.type === 'kirim' ? 1 : -1) * (Number(c.amount) || 0), 0), [rows]);
  const kirim = useMemo(() => (rows || []).filter((r) => r.type === 'kirim').reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);
  const chiqim = useMemo(() => (rows || []).filter((r) => r.type === 'chiqim').reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/cashbox', { ...form, amount: Number(form.amount) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={PiggyBank} title="Kassa" subtitle="Naqd pul harakati"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Operatsiya</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-gold-600">{compactMoney(balance)}</div>
          <div className="text-sm text-navy-400">Kassa balansi</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-emerald-600">+{compactMoney(kirim)}</div>
          <div className="text-sm text-navy-400">Kirim</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-red-500">−{compactMoney(chiqim)}</div>
          <div className="text-sm text-navy-400">Chiqim</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={PiggyBank} title="Kassa yozuvi yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <span className={`grid place-items-center w-8 h-8 rounded-lg text-white text-sm font-bold shrink-0 ${c.type === 'kirim' ? 'bg-emerald-500' : 'bg-red-500'}`}>{c.type === 'kirim' ? '+' : '−'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{c.title}</div>
                <div className="text-[11px] text-navy-400">{c.date} {c.note && `· ${c.note}`}</div>
              </div>
              <span className={`font-bold shrink-0 ${c.type === 'kirim' ? 'text-emerald-600' : 'text-red-500'}`}>{c.type === 'kirim' ? '+' : '−'}{money(c.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Kassa operatsiyasi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Operatsiya nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="kirim">Kirim</option>
              <option value="chiqim">Chiqim</option>
            </select>
          </div>
          <div>
            <label className="label">Summa</label>
            <input className="input !py-2.5" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <label className="label">Sana</label>
        <input className="input !py-2.5 mb-4" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <label className="label">Izoh</label>
        <input className="input !py-2.5" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Modal>
    </div>
  );
}
