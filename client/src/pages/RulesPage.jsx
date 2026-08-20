import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const CATEGORIES = ['Intizom', 'Tartib', 'Moliya', 'Xavfsizlik'];
const CATEGORY_COLOR = { Intizom: 'bg-rose-400', Tartib: 'bg-blue-400', Moliya: 'bg-emerald-400', Xavfsizlik: 'bg-amber-400' };
const empty = { title: '', category: 'Tartib', description: '', status: 'active' };

export default function RulesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  async function load() { setRows(await api.get('/rules?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !categoryFilter || r.category === categoryFilter), [rows, categoryFilter]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/rules', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleArchive(row) {
    await api.put(`/rules/${row.id}`, { status: row.status === 'active' ? 'archived' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Tartib-qoidalar" subtitle="Markaz ichki qoidalari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Qoida qo'shish</button>} />

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setCategoryFilter('')} className={`text-xs font-bold rounded-full px-3 py-1.5 transition ${!categoryFilter ? 'bg-gold-500 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>Barchasi</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)} className={`text-xs font-bold rounded-full px-3 py-1.5 transition ${categoryFilter === c ? 'bg-gold-500 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon={ClipboardList} title="Qoida yo'q" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${CATEGORY_COLOR[r.category] || 'bg-navy-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.title}</div>
                {r.description && <div className="text-xs text-navy-500 mt-0.5">{r.description}</div>}
              </div>
              <button onClick={() => toggleArchive(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : 'arxiv'}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Qoida qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Qoida nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Turkum</label>
        <select className="input !py-2.5 mb-4" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Modal>
    </div>
  );
}
