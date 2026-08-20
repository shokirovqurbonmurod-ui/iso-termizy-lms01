import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';

const empty = { branch: '', investment: 0, royalty_pct: 5, status: 'active' };

export default function FranchiseDashboardPage() {
  const [rows, setRows] = useState(null);
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, b] = await Promise.all([api.get('/franchise_dashboard?limit=500').catch(() => []), api.get('/branches').catch(() => [])]);
    setRows(r || []); setBranches(b || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, branch: branches[0]?.name || '' }); setModal(true); }

  async function save() {
    if (!form.branch.trim()) return;
    setSaving(true);
    try { await api.post('/franchise_dashboard', { ...form, investment: Number(form.investment) || 0, royalty_pct: Number(form.royalty_pct) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Building2} title="Franshiza" subtitle="Franshiza filiallari va investitsiya ko'rsatkichlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Filial qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Building2} title="Franshiza filiali yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-navy-800">{r.branch}</span>
                <span className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.status}</span>
              </div>
              <div className="text-xs text-navy-500">Investitsiya: <span className="font-semibold text-navy-700">{money(r.investment)}</span></div>
              <div className="text-xs text-navy-500 mt-1">Royalti: <span className="font-semibold text-gold-600">{r.royalty_pct}%</span></div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Franshiza filiali qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Filial</label>
        <input className="input !py-2.5 mb-4" list="branches-list-fr" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
        <datalist id="branches-list-fr">{branches.map((b) => <option key={b.id} value={b.name} />)}</datalist>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Investitsiya</label>
            <input className="input !py-2.5" type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} />
          </div>
          <div>
            <label className="label">Royalti %</label>
            <input className="input !py-2.5" type="number" value={form.royalty_pct} onChange={(e) => setForm({ ...form, royalty_pct: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
