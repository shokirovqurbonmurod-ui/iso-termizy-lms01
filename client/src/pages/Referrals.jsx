import { useEffect, useMemo, useState } from 'react';
import { Gift, Plus, Coins, Trophy, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const cfg = RESOURCES.referrals;
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Referrals() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/referrals').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const paidCoins = rows.filter((r) => r.status === 'paid').reduce((a, r) => a + (Number(r.bonus_coins) || 0), 0);
    const pending = rows.filter((r) => r.status === 'pending').length;
    const byReferrer = {};
    for (const r of rows) byReferrer[r.referrer] = (byReferrer[r.referrer] || 0) + 1;
    const top = Object.entries(byReferrer).map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count);
    return { paidCoins, pending, top };
  }, [rows]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : (f.key === 'date' ? todayStr() : ''); });
    setForm(init); setErr(''); setModal(true);
  }

  async function save() {
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      await api.post(cfg.endpoint, payload); setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function markPaid(row) {
    try { await api.put(`/referrals/${row.id}`, { ...row, status: 'paid' }); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!rows || !stats) return <Spinner />;
  const sorted = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <PageHeader icon={Gift} title="Tavsiya dasturi" subtitle={`${rows.length} ta tavsiya · ${stats.paidCoins} coin to'landi`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi tavsiya</button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          [Gift, 'Jami tavsiyalar', rows.length, 'gold'],
          [Coins, "To'langan bonus", stats.paidCoins + ' 🪙', 'green'],
          [Clock, 'Kutilayotgan', stats.pending, 'rose'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={20} />
            </div>
            <div className="font-display text-2xl text-navy-800">{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-navy-100">
            <h3 className="font-display text-lg text-navy-800">📋 Tavsiyalar ro'yxati</h3>
          </div>
          {sorted.length === 0 ? <Empty icon={Gift} title="Tavsiya yo'q" /> : (
            <div className="divide-y divide-navy-50">
              {sorted.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gold/[.02] transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{r.referrer} → {r.referred}</div>
                    <div className="text-[11px] text-navy-400 truncate">{r.course} · {r.date}</div>
                  </div>
                  <span className="text-xs font-bold text-gold-600 shrink-0">{r.bonus_coins} 🪙</span>
                  {r.status === 'pending' ? (
                    <button onClick={() => markPaid(r)} className="chip bg-emerald-100 text-emerald-700 text-[9px] hover:bg-emerald-200 transition shrink-0">To'lash</button>
                  ) : (
                    <span className={`chip text-[9px] shrink-0 ${statusStyle(r.status)}`}>{r.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Trophy size={18} className="text-gold" /> Top tavsiya qiluvchilar</h3>
          {stats.top.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-2">
              {stats.top.map((t, i) => (
                <div key={t.referrer} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xs font-bold shrink-0">{i + 1}</div>
                  <span className="text-sm font-semibold text-navy-700 truncate flex-1">{t.referrer}</span>
                  <span className="text-sm font-bold text-gold-600 shrink-0">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!modal} title="Yangi tavsiya" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
              {f.type === 'select' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input !py-2.5" type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
