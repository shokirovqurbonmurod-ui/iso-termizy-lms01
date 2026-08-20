import { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';

const CATEGORIES = ['Ijaralash', 'Ish haqi', 'Marketing', 'Materiallar', 'Texnik', 'Boshqa'];
const CATEGORY_COLOR = { Ijaralash: 'bg-blue-400', 'Ish haqi': 'bg-emerald-400', Marketing: 'bg-pink-400', Materiallar: 'bg-amber-400', Texnik: 'bg-violet-400', Boshqa: 'bg-navy-400' };
const empty = { title: '', category: 'Boshqa', amount: 0, date: new Date().toISOString().slice(0, 10) };

export default function ExpensesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/expenses?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const total = useMemo(() => (rows || []).reduce((a, e) => a + (Number(e.amount) || 0), 0), [rows]);
  const thisMonth = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return (rows || []).filter((r) => (r.date || '').startsWith(ym)).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  }, [rows]);
  const byCategory = useMemo(() => {
    const m = {};
    for (const r of rows || []) m[r.category] = (m[r.category] || 0) + (Number(r.amount) || 0);
    const t = Object.values(m).reduce((a, v) => a + v, 0) || 1;
    return Object.entries(m).map(([category, amount]) => ({ category, amount, pct: Math.round((amount / t) * 100) })).sort((a, b) => b.amount - a.amount);
  }, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/expenses', { ...form, amount: Number(form.amount) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Wallet} title="Xarajatlar" subtitle="Markaz xarajatlari hisobi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Xarajat qo'shish</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{compactMoney(total)}</div>
          <div className="text-sm text-navy-400">Jami xarajat</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-red-500">{compactMoney(thisMonth)}</div>
          <div className="text-sm text-navy-400">Shu oy</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Yozuvlar</div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="card p-5 mb-6 max-w-2xl">
          <h3 className="font-display text-base text-navy-800 mb-4">Kategoriya bo'yicha</h3>
          <div className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-navy-700">{c.category}</span>
                  <span className="text-navy-400">{money(c.amount)} · {c.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full rounded-full ${CATEGORY_COLOR[c.category] || 'bg-navy-400'}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? <Empty icon={Wallet} title="Xarajat yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <span className={`w-2 h-8 rounded-full shrink-0 ${CATEGORY_COLOR[r.category] || 'bg-navy-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.title}</div>
                <div className="text-[11px] text-navy-400">{r.category} · {r.date}</div>
              </div>
              <span className="font-bold text-red-500 shrink-0">−{money(r.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Xarajat qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xarajat nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kategoriya</label>
            <select className="input !py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Summa</label>
            <input className="input !py-2.5" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <label className="label">Sana</label>
        <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Modal>
    </div>
  );
}
