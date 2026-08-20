import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';

const STAGES = [
  { key: 'Qiziqish', color: 'bg-navy-100 text-navy-600' },
  { key: 'Demo dars', color: 'bg-blue-100 text-blue-700' },
  { key: 'Shartnoma', color: 'bg-amber-100 text-amber-700' },
  { key: "To'lov", color: 'bg-emerald-100 text-emerald-700' },
];
const empty = { lead: '', stage: 'Qiziqish', value: 0, probability: 30, assigned_to: '', next_action: '', status: 'active' };

export default function SalesPipelinePage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);

  async function load() { setRows(await api.get('/sales_pipeline?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const active = useMemo(() => (rows || []).filter((r) => r.status !== 'lost'), [rows]);
  const totalValue = useMemo(() => active.reduce((a, r) => a + (Number(r.value) || 0), 0), [active]);
  const won = useMemo(() => (rows || []).filter((r) => r.status === 'won').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.lead.trim()) return;
    setSaving(true);
    try { await api.post('/sales_pipeline', { ...form, value: Number(form.value) || 0, probability: Number(form.probability) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function moveStage(id, stage) {
    const isLast = stage === "To'lov";
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage, ...(isLast ? { status: 'won' } : {}) } : r)));
    await api.put(`/sales_pipeline/${id}`, { stage, ...(isLast ? { status: 'won' } : {}) }).catch(() => load());
  }

  async function markLost(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'lost' } : r)));
    await api.put(`/sales_pipeline/${id}`, { status: 'lost' }).catch(() => load());
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Sales Pipeline" subtitle={`${money(totalValue)} umumiy qiymat · ${won} ta yopilgan bitim`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi bitim</button>} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map((col) => {
          const items = active.filter((r) => r.stage === col.key);
          const stageValue = items.reduce((a, r) => a + (Number(r.value) || 0), 0);
          return (
            <div key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveStage(dragId, col.key); setDragId(null); }}
              className="card p-3 min-h-[400px]">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className={`chip text-[11px] px-2 py-1 rounded-full font-bold ${col.color}`}>{col.key}</span>
                <span className="text-xs text-navy-400">{items.length}</span>
              </div>
              <div className="text-[10px] text-navy-400 px-1 mb-3">{compactMoney(stageValue)}</div>
              <div className="space-y-2">
                {items.map((p) => (
                  <div key={p.id} draggable onDragStart={() => setDragId(p.id)}
                    className="rounded-xl border border-navy-100 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition group">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-navy-800">{p.lead}</span>
                      <button onClick={() => markLost(p.id)} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition shrink-0"><X size={13} /></button>
                    </div>
                    <div className="text-xs font-bold text-gold-600">{money(p.value)}</div>
                    <div className="flex items-center justify-between text-[10px] text-navy-400 mt-1">
                      <span>{p.assigned_to || '—'}</span>
                      <span>{p.probability}%</span>
                    </div>
                    {p.next_action && <div className="text-[10px] text-navy-500 mt-1 truncate">→ {p.next_action}</div>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {STAGES.filter((c) => c.key !== col.key).map((c) => (
                        <button key={c.key} onClick={() => moveStage(p.id, c.key)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500 hover:bg-gold/10 hover:text-gold-700 transition">
                          → {c.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal} title="Yangi bitim" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Lid nomi</label>
        <input className="input !py-2.5 mb-4" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Qiymat</label>
            <input className="input !py-2.5" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="label">Ehtimol %</label>
            <input className="input !py-2.5" type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
          </div>
        </div>
        <label className="label">Mas'ul xodim</label>
        <input className="input !py-2.5 mb-4" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
        <label className="label">Keyingi qadam</label>
        <input className="input !py-2.5" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} />
      </Modal>
    </div>
  );
}
