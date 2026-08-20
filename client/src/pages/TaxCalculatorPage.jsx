import { useEffect, useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const TAX_RATE = 0.12;
const empty = { staff: '', gross: 0 };

export default function TaxCalculatorPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/tax_calculator?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  const gross = Number(form.gross) || 0;
  const taxAmount = Math.round(gross * TAX_RATE);
  const net = gross - taxAmount;

  async function saveCalc() {
    if (!form.staff.trim() || !gross) return;
    setSaving(true);
    try {
      await api.post('/tax_calculator', { staff: form.staff, gross, tax_amount: taxAmount, net, date: new Date().toISOString().slice(0, 10) });
      setForm(empty); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Calculator} title="Soliq kalkulator" subtitle={`Yagona ijtimoiy to'lov (${TAX_RATE * 100}%) hisoblash`} />

      <div className="card p-5 mb-6 max-w-xl">
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-tax" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <datalist id="staff-list-tax">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Yalpi (gross) oylik</label>
        <input className="input !py-2.5 mb-4" type="number" value={form.gross} onChange={(e) => setForm({ ...form, gross: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-red-50 px-4 py-3">
            <div className="text-[11px] text-red-500 font-bold">Soliq summasi</div>
            <div className="font-display text-lg text-red-600">{money(taxAmount)}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="text-[11px] text-emerald-600 font-bold">Net oylik</div>
            <div className="font-display text-lg text-emerald-700">{money(net)}</div>
          </div>
        </div>
        <button onClick={saveCalc} disabled={saving} className="btn-gold w-full"><Plus size={16} /> Hisoblab saqlash</button>
      </div>

      {rows.length === 0 ? <Empty icon={Calculator} title="Hisoblash tarixi yo'q" /> : (
        <div className="space-y-1.5 max-w-xl">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5 text-sm">
              <span className="font-semibold text-navy-800">{r.staff}</span>
              <span className="text-navy-400 text-xs">{r.date}</span>
              <span className="text-red-500 text-xs">−{money(r.tax_amount)}</span>
              <span className="font-bold text-emerald-600">{money(r.net)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
