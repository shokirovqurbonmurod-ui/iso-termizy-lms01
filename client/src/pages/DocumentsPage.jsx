import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const TYPES = ['Litsenziya', 'Nizom', 'Shablon', 'Bayonnoma', 'Buyruq', 'Boshqa'];
const empty = { title: '', type: 'Boshqa', owner: '', date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function DocumentsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  async function load() {
    const r = await api.get('/documents?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !typeFilter || r.type === typeFilter), [rows, typeFilter]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/documents', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleArchive(row) {
    await api.put(`/documents/${row.id}`, { status: row.status === 'active' ? 'archived' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileText} title="Hujjatlar" subtitle="Markaz rasmiy hujjatlari arxivi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hujjat qo'shish</button>} />

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTypeFilter('')} className={`text-xs font-bold rounded-full px-3 py-1.5 transition ${!typeFilter ? 'bg-gold-500 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>Barchasi</button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs font-bold rounded-full px-3 py-1.5 transition ${typeFilter === t ? 'bg-gold-500 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon={FileText} title="Hujjat yo'q" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white shrink-0"><FileText size={14} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.title}</div>
                <div className="text-[11px] text-navy-400">{r.type} · {r.owner || "mas'ul yo'q"} · {r.date}</div>
              </div>
              <button onClick={() => toggleArchive(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : 'arxiv'}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Hujjat qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Hujjat nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <label className="label">Mas'ul bo'lim</label>
        <input className="input !py-2.5" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
      </Modal>
    </div>
  );
}
