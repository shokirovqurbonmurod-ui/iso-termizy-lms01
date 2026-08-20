import { useEffect, useState } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const empty = { department: '', period: 'Q3 2026', budget: 0, spent: 0 };

export default function DepartmentBudgetsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/department_budgets?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.department.trim()) return;
    setSaving(true);
    try { await api.post('/department_budgets', { ...form, budget: Number(form.budget) || 0, spent: Number(form.spent) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Wallet} title="Bo'lim byudjetlari" subtitle="Har bir bo'lim uchun choraklik byudjet"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Byudjet qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Wallet} title="Byudjet yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => {
            const pct = r.budget ? Math.min(100, Math.round((r.spent / r.budget) * 100)) : 0;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-navy-800">{r.department}</span>
                  <span className="text-[10px] font-bold text-navy-400 bg-navy-100 rounded-full px-2 py-0.5">{r.period}</span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-gold-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-500">{money(r.spent)} sarflandi</span>
                  <span className="font-semibold text-navy-700">{money(r.budget)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Byudjet qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Bo'lim</label>
        <input className="input !py-2.5 mb-4" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <label className="label">Davr</label>
        <input className="input !py-2.5 mb-4" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Byudjet</label>
            <input className="input !py-2.5" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div>
            <label className="label">Sarflangan</label>
            <input className="input !py-2.5" type="number" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
