import { useEffect, useMemo, useState } from 'react';
import { Landmark, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { compactMoney, statusStyle } from '../lib/format.js';

const CURRENCIES = ['UZS', 'USD', 'EUR'];
const empty = { bank: '', account: '', balance: 0, currency: 'UZS', status: 'active' };

export default function BankAccountsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/bank_accounts?limit=500').catch(() => []);
    setRows(r || []);
  }
  useEffect(() => { load(); }, []);

  const totalUzs = useMemo(() => (rows || []).filter((b) => b.currency === 'UZS' || !b.currency).reduce((a, b) => a + (Number(b.balance) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.bank.trim()) return;
    setSaving(true);
    try { await api.post('/bank_accounts', { ...form, balance: Number(form.balance) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleStatus(row) {
    await api.put(`/bank_accounts/${row.id}`, { status: row.status === 'active' ? 'closed' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Landmark} title="Bank hisoblari" subtitle="Markazning bank hisob raqamlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hisob qo'shish</button>} />

      <div className="mb-6 max-w-xs">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{compactMoney(totalUzs)}</div>
          <div className="text-sm text-navy-400">Jami balans (UZS)</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Landmark} title="Bank hisobi yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-navy-800 text-sm">{b.bank}</span>
                <button onClick={() => toggleStatus(b)} className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${statusStyle(b.status)}`}>{b.status}</button>
              </div>
              <div className="text-[11px] text-navy-400 font-mono mb-2 truncate">{b.account}</div>
              <div className="font-display text-xl text-navy-800">{compactMoney(b.balance)} <span className="text-xs text-navy-400 font-sans">{b.currency}</span></div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Bank hisobi qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Bank nomi</label>
        <input className="input !py-2.5 mb-4" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
        <label className="label">Hisob raqam</label>
        <input className="input !py-2.5 mb-4" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Balans</label>
            <input className="input !py-2.5" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          </div>
          <div>
            <label className="label">Valyuta</label>
            <select className="input !py-2.5" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
