import { useEffect, useMemo, useState } from 'react';
import { Gift, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';

export default function StaffPaymentPage({ endpoint, personKey, title, subtitle, positive }) {
  const Icon = positive ? Gift : AlertTriangle;
  const empty = { [personKey]: '', reason: '', amount: 0, date: new Date().toISOString().slice(0, 10), status: 'pending' };
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get(`${endpoint}?limit=500`).catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, [endpoint]);

  const total = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);
  const paid = useMemo(() => (rows || []).filter((r) => r.status === 'paid').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form[personKey].trim()) return;
    setSaving(true);
    try { await api.post(endpoint, { ...form, amount: Number(form.amount) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function togglePaid(row) {
    await api.put(`${endpoint}/${row.id}`, { status: row.status === 'paid' ? 'pending' : 'paid' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Icon} title={title} subtitle={subtitle}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Qo'shish</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className={`font-display text-2xl ${positive ? 'text-emerald-600' : 'text-red-500'}`}>{compactMoney(total)}</div>
          <div className="text-sm text-navy-400">Jami summa</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Yozuvlar</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{paid}</div>
          <div className="text-sm text-navy-400">To'langan</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Icon} title="Yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <span className={positive ? 'text-emerald-500' : 'text-red-500'}><Icon size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r[personKey]}</div>
                <div className="text-[11px] text-navy-400 truncate">{r.reason} · {r.date}</div>
              </div>
              <span className={`font-bold text-sm shrink-0 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>{positive ? '+' : '−'}{money(r.amount)}</span>
              <button onClick={() => togglePaid(r)}
                className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 transition ${r.status === 'paid' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>
                {r.status === 'paid' ? "To'langan" : 'Kutilmoqda'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi yozuv" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list-pay" value={form[personKey]} onChange={(e) => setForm({ ...form, [personKey]: e.target.value })} placeholder="Ism yozing yoki tanlang" />
        <datalist id="staff-list-pay">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Sabab</label>
        <input className="input !py-2.5 mb-4" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Summa</label>
            <input className="input !py-2.5" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
