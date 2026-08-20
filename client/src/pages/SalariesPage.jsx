import { useEffect, useMemo, useState } from 'react';
import { Banknote, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';

const empty = { name: '', role: '', base: 0, bonus: 0, total: 0 };

export default function SalariesPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/salaries?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.total || 0) - (a.total || 0))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  const totalPayroll = useMemo(() => (rows || []).reduce((a, s) => a + (Number(s.total) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  function pickStaff(name) {
    const st = staff.find((s) => s.full_name === name);
    setForm((f) => ({ ...f, name, role: st?.role_label || f.role }));
  }

  async function save() {
    if (!form.name.trim()) return;
    const base = Number(form.base) || 0, bonus = Number(form.bonus) || 0;
    setSaving(true);
    try { await api.post('/salaries', { ...form, base, bonus, total: base + bonus }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Banknote} title="Oyliklar" subtitle="Xodimlar ish haqi jadvali"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Oylik qo'shish</button>} />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{compactMoney(totalPayroll)}</div>
          <div className="text-sm text-navy-400">Jami fond</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{rows.length}</div>
          <div className="text-sm text-navy-400">Xodim</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Banknote} title="Oylik yozuvi yo'q" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                {['Xodim', 'Lavozim', 'Asosiy', 'Bonus', 'Jami'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                  <td className="px-4 py-3 font-semibold text-navy-800">{r.name}</td>
                  <td className="px-4 py-3 text-navy-500 text-xs">{r.role}</td>
                  <td className="px-4 py-3 tabular-nums text-navy-600">{money(r.base)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-600">+{money(r.bonus)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-navy-800">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title="Oylik qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" list="staff-list" value={form.name} onChange={(e) => pickStaff(e.target.value)} placeholder="Ism yozing yoki tanlang" />
        <datalist id="staff-list">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label">Lavozim</label>
        <input className="input !py-2.5 mb-4" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Asosiy oylik</label>
            <input className="input !py-2.5" type="number" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
          </div>
          <div>
            <label className="label">Bonus</label>
            <input className="input !py-2.5" type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
