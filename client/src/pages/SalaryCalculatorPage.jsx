import { useEffect, useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const empty = { staff: '', base: 0, bonus: 0, deductions: 0 };

export default function SalaryCalculatorPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/salary_calculator?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  const net = (Number(form.base) || 0) + (Number(form.bonus) || 0) - (Number(form.deductions) || 0);

  async function saveCalc() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try {
      await api.post('/salary_calculator', { ...form, base: Number(form.base) || 0, bonus: Number(form.bonus) || 0, deductions: Number(form.deductions) || 0, net, date: new Date().toISOString().slice(0, 10) });
      setForm(empty); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Calculator} title="Oylik kalkulator" subtitle="Xodim uchun net oylikni hisoblash va saqlash" />

      <div className="card p-5 mb-6 max-w-xl">
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-calc" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <datalist id="staff-list-calc">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="label">Asosiy oylik</label>
            <input className="input !py-2.5" type="number" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
          </div>
          <div>
            <label className="label">Bonus</label>
            <input className="input !py-2.5" type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
          </div>
          <div>
            <label className="label">Ushlanma</label>
            <input className="input !py-2.5" type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gold/[.08] px-4 py-3 mb-4">
          <span className="text-sm font-semibold text-navy-700">Net oylik</span>
          <span className="font-display text-xl text-gold-600">{money(net)}</span>
        </div>
        <button onClick={saveCalc} disabled={saving} className="btn-gold w-full"><Plus size={16} /> Hisoblab saqlash</button>
      </div>

      {rows.length === 0 ? <Empty icon={Calculator} title="Hisoblash tarixi yo'q" /> : (
        <div className="space-y-1.5 max-w-xl">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5 text-sm">
              <span className="font-semibold text-navy-800">{r.staff}</span>
              <span className="text-navy-400 text-xs">{r.date}</span>
              <span className="font-bold text-gold-600">{money(r.net)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
