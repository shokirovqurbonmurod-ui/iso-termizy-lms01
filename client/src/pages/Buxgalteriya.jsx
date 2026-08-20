import { useEffect, useMemo, useState } from 'react';
import { Calculator, Wallet, Banknote, Gift, AlertTriangle, PiggyBank, Landmark, Receipt, Percent, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { money, compactMoney, statusStyle } from '../lib/format.js';

const METHOD_COLOR = { Naqd: 'bg-emerald-400', QR: 'bg-blue-400', Payme: 'bg-sky-400', Click: 'bg-amber-400', 'Uzum Bank': 'bg-violet-400', Karta: 'bg-rose-400' };
const CATEGORY_COLOR = { Ijaralash: 'bg-blue-400', 'Ish haqi': 'bg-emerald-400', Marketing: 'bg-pink-400', Materiallar: 'bg-amber-400', Texnik: 'bg-violet-400', Boshqa: 'bg-navy-400' };

const ADD_TYPES = {
  expenses: 'Yangi xarajat',
  bonuses: 'Yangi bonus',
  fines: 'Yangi jarima',
  invoices: 'Yangi fatura',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Buxgalteriya() {
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null); // {type}
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [payments, expenses, salaries, bonuses, fines, cashbox, bankAccounts, invoices, discounts] = await Promise.all([
      api.get('/payments').catch(() => []),
      api.get('/expenses').catch(() => []),
      api.get('/salaries').catch(() => []),
      api.get('/bonuses').catch(() => []),
      api.get('/fines').catch(() => []),
      api.get('/cashbox').catch(() => []),
      api.get('/bank_accounts').catch(() => []),
      api.get('/invoices').catch(() => []),
      api.get('/discounts').catch(() => []),
    ]);
    setD({ payments: payments || [], expenses: expenses || [], salaries: salaries || [], bonuses: bonuses || [], fines: fines || [], cashbox: cashbox || [], bankAccounts: bankAccounts || [], invoices: invoices || [], discounts: discounts || [] });
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!d) return null;
    const revenue = d.payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const expenseTotal = d.expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const payrollTotal = d.salaries.reduce((a, s) => a + (Number(s.total) || 0), 0);
    const netProfit = revenue - expenseTotal - payrollTotal;
    const cashboxBalance = d.cashbox.reduce((a, c) => a + (c.type === 'kirim' ? 1 : -1) * (Number(c.amount) || 0), 0);
    const bankTotal = d.bankAccounts.filter((b) => b.currency === 'UZS' || !b.currency).reduce((a, b) => a + (Number(b.balance) || 0), 0);
    return { revenue, expenseTotal, payrollTotal, netProfit, cashboxBalance, bankTotal };
  }, [d]);

  const byCategory = useMemo(() => {
    if (!d) return [];
    const counts = {};
    for (const e of d.expenses) counts[e.category] = (counts[e.category] || 0) + (Number(e.amount) || 0);
    const total = Object.values(counts).reduce((a, v) => a + v, 0) || 1;
    return Object.entries(counts).map(([category, amount]) => ({ category, amount, pct: Math.round((amount / total) * 100) })).sort((a, b) => b.amount - a.amount);
  }, [d]);

  const byMethod = useMemo(() => {
    if (!d) return [];
    const counts = {};
    for (const p of d.payments) counts[p.method] = (counts[p.method] || 0) + (Number(p.amount) || 0);
    const total = Object.values(counts).reduce((a, v) => a + v, 0) || 1;
    return Object.entries(counts).map(([method, amount]) => ({ method, amount, pct: Math.round((amount / total) * 100) })).sort((a, b) => b.amount - a.amount);
  }, [d]);

  function openCreate(type) {
    const cfg = RESOURCES[type];
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : (f.key === 'date' ? todayStr() : ''); });
    setForm(init); setErr(''); setModal({ type });
  }

  async function save() {
    const cfg = RESOURCES[modal.type];
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      await api.post(cfg.endpoint, payload);
      setModal(null);
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (!d || !stats) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Calculator} title="Buxgalteriya" subtitle={`${money(stats.revenue)} daromad · ${money(stats.expenseTotal + stats.payrollTotal)} xarajat · ${stats.netProfit >= 0 ? 'sof foyda' : "sof zarar"} ${money(Math.abs(stats.netProfit))}`}
        actions={<button className="btn-gold" onClick={() => openCreate('expenses')}><Plus size={16} /> Xarajat qo'shish</button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          [Banknote, 'Daromad', compactMoney(stats.revenue), 'green'],
          [Wallet, 'Xarajatlar', compactMoney(stats.expenseTotal), 'rose'],
          [Landmark, 'Ish haqi jamg\'armasi', compactMoney(stats.payrollTotal), 'blue'],
          [stats.netProfit >= 0 ? TrendingUp : TrendingDown, 'Sof foyda', compactMoney(stats.netProfit), stats.netProfit >= 0 ? 'green' : 'rose'],
          [PiggyBank, 'Kassa balansi', compactMoney(stats.cashboxBalance), 'gold'],
          [Landmark, 'Bank balansi', compactMoney(stats.bankTotal), 'blue'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-4" style={{ animationDelay: `${i * 40}ms` }}>
            <div className={`grid place-items-center w-9 h-9 rounded-xl mb-2.5 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'blue' ? 'from-blue-400/20 to-blue-100/10 text-blue-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={17} />
            </div>
            <div className="font-display text-lg text-navy-800">{val}</div>
            <div className="text-xs text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Xarajatlar taqsimoti */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Wallet size={18} className="text-gold" /> Xarajatlar taqsimoti</h3>
            <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('expenses')}><Plus size={13} /> Qo'shish</button>
          </div>
          {byCategory.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
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
          )}
        </div>

        {/* To'lov usullari */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Receipt size={18} className="text-gold" /> To'lov usullari</h3>
          {byMethod.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-3">
              {byMethod.map((m) => (
                <div key={m.method}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-navy-700">{m.method}</span>
                    <span className="text-navy-400">{money(m.amount)} · {m.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                    <div className={`h-full rounded-full ${METHOD_COLOR[m.method] || 'bg-navy-400'}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bank hisoblari */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Landmark size={18} className="text-gold" /> Bank hisoblari</h3>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {d.bankAccounts.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-navy-800 text-sm">{b.bank}</span>
                <span className={`chip text-[9px] ${statusStyle(b.status)}`}>{b.status}</span>
              </div>
              <div className="text-[11px] text-navy-400 font-mono mb-2 truncate">{b.account}</div>
              <div className="font-display text-xl text-navy-800">{compactMoney(b.balance)} <span className="text-xs text-navy-400 font-sans">{b.currency}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Kassa harakati */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><PiggyBank size={18} className="text-gold" /> Kassa harakati</h3>
          {d.cashbox.length === 0 ? <p className="text-sm text-navy-400">Yozuv yo'q</p> : (
            <div className="space-y-2">
              {d.cashbox.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <span className={`grid place-items-center w-7 h-7 rounded-lg text-white text-xs font-bold shrink-0 ${c.type === 'kirim' ? 'bg-emerald-500' : 'bg-red-500'}`}>{c.type === 'kirim' ? '+' : '−'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{c.title}</div>
                    <div className="text-[10px] text-navy-400">{c.date} {c.note && `· ${c.note}`}</div>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${c.type === 'kirim' ? 'text-emerald-600' : 'text-red-500'}`}>{c.type === 'kirim' ? '+' : '−'}{compactMoney(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Xodim to'lovlari: bonus/jarima */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Gift size={18} className="text-gold" /> Bonus / Jarima</h3>
            <div className="flex gap-1.5">
              <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('bonuses')}><Plus size={13} /> Bonus</button>
              <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('fines')}><Plus size={13} /> Jarima</button>
            </div>
          </div>
          <div className="space-y-2">
            {[...d.bonuses.map((b) => ({ ...b, kind: 'bonus' })), ...d.fines.map((f) => ({ ...f, kind: 'fine', staff: f.person }))]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .map((x) => (
                <div key={`${x.kind}-${x.id}`} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <span className={x.kind === 'bonus' ? 'text-emerald-500' : 'text-red-500'}>{x.kind === 'bonus' ? <Gift size={16} /> : <AlertTriangle size={16} />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{x.staff}</div>
                    <div className="text-[10px] text-navy-400 truncate">{x.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${x.kind === 'bonus' ? 'text-emerald-600' : 'text-red-500'}`}>{x.kind === 'bonus' ? '+' : '−'}{compactMoney(x.amount)}</div>
                    <span className={`chip text-[9px] ${statusStyle(x.status)}`}>{x.status}</span>
                  </div>
                </div>
              ))}
            {d.bonuses.length === 0 && d.fines.length === 0 && <p className="text-sm text-navy-400">Yozuv yo'q</p>}
          </div>
        </div>
      </div>

      {/* Fatura */}
      <div className="card overflow-hidden mb-6">
        <div className="p-4 border-b border-navy-100 flex items-center justify-between">
          <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Receipt size={18} className="text-gold" /> Fatura (hisob-fakturalar)</h3>
          <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('invoices')}><Plus size={13} /> Yangi fatura</button>
        </div>
        {d.invoices.length === 0 ? <p className="text-sm text-navy-400 p-5">Fatura yo'q</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                  {['Raqam', "O'quvchi", 'Summa', 'Muddat', 'Holat'].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.invoices.map((inv) => {
                  const overdue = inv.status !== 'paid' && inv.due_date && inv.due_date < todayStr();
                  return (
                    <tr key={inv.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                      <td className="px-4 py-3 font-mono text-xs text-navy-600">{inv.number}</td>
                      <td className="px-4 py-3 font-semibold text-navy-800">{inv.student}</td>
                      <td className="px-4 py-3 tabular-nums text-navy-700">{money(inv.amount)}</td>
                      <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-bold' : 'text-navy-500'}`}>{inv.due_date}{overdue && ' · muddati o\'tgan'}</td>
                      <td className="px-4 py-3"><span className={`chip ${statusStyle(overdue ? 'lost' : inv.status)}`}>{overdue ? "muddati o'tgan" : inv.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chegirmalar */}
      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Percent size={18} className="text-gold" /> Faol chegirmalar</h3>
        {d.discounts.length === 0 ? <p className="text-sm text-navy-400">Chegirma yo'q</p> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {d.discounts.map((disc) => (
              <div key={disc.id} className="rounded-xl border border-navy-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gold-600 text-lg">{disc.percent}%</span>
                  <span className={`chip text-[9px] ${statusStyle(disc.status)}`}>{disc.status}</span>
                </div>
                <div className="text-sm font-semibold text-navy-800 truncate">{disc.name}</div>
                <div className="text-[10px] text-navy-400">{disc.applies_to} · {disc.valid_until} gacha</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} title={modal ? ADD_TYPES[modal.type] : ''} onClose={() => setModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        {modal && (
          <div className="grid sm:grid-cols-2 gap-4">
            {RESOURCES[modal.type].fields.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
                {f.type === 'select' ? (
                  <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">— tanlang —</option>
                    {f.options.map((o) => typeof o === 'object'
                      ? <option key={o.v} value={o.v}>{o.t}</option>
                      : <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input !py-2.5" type={f.type === 'number' ? 'number' : 'text'}
                    placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
