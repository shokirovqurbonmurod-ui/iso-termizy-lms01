import { useEffect, useMemo, useState } from 'react';
import { Receipt, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';

function today() { return new Date().toISOString().slice(0, 10); }
function nextNumber(rows) {
  const n = rows.length + 1;
  return `INV-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

export default function InvoicesPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ number: '', student: '', amount: 0, date: today(), due_date: today(), status: 'unpaid' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/invoices?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const overdueCount = useMemo(() => (rows || []).filter((r) => r.status !== 'paid' && r.due_date && r.due_date < today()).length, [rows]);
  const unpaidTotal = useMemo(() => (rows || []).filter((r) => r.status !== 'paid').reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);

  function openAdd() { setForm({ number: nextNumber(rows || []), student: students[0]?.full_name || '', amount: 0, date: today(), due_date: today(), status: 'unpaid' }); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/invoices', { ...form, amount: Number(form.amount) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function markPaid(row) {
    await api.put(`/invoices/${row.id}`, { status: 'paid' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Receipt} title="Fatura" subtitle="Hisob-fakturalar boshqaruvi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi fatura</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Jami fatura</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-amber-600">{money(unpaidTotal)}</div>
          <div className="text-sm text-navy-400">To'lanmagan</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-red-600">{overdueCount}</div>
          <div className="text-sm text-navy-400">Muddati o'tgan</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Receipt} title="Fatura yo'q" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                {['Raqam', "O'quvchi", 'Summa', 'Muddat', 'Holat', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const overdue = inv.status !== 'paid' && inv.due_date && inv.due_date < today();
                return (
                  <tr key={inv.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                    <td className="px-4 py-3 font-mono text-xs text-navy-600">{inv.number}</td>
                    <td className="px-4 py-3 font-semibold text-navy-800">{inv.student}</td>
                    <td className="px-4 py-3 tabular-nums text-navy-700">{money(inv.amount)}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-bold' : 'text-navy-500'}`}>{inv.due_date}{overdue && " · muddati o'tgan"}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold rounded-full px-2 py-1 ${statusStyle(overdue ? 'lost' : inv.status)}`}>{overdue ? "muddati o'tgan" : inv.status}</span></td>
                    <td className="px-4 py-3">
                      {inv.status !== 'paid' && <button onClick={() => markPaid(inv)} className="btn-ghost !py-1 !px-2.5 text-[11px]"><Check size={12} /> To'landi</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title="Yangi fatura" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Fatura raqami</label>
        <input className="input !py-2.5 mb-4" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Summa</label>
            <input className="input !py-2.5" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">To'lov muddati</label>
            <input className="input !py-2.5" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
