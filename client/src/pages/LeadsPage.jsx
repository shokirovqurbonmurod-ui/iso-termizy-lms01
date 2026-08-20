import { useEffect, useMemo, useState } from 'react';
import { UserSearch, Plus, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const SOURCES = ['Instagram', 'Telegram', 'Facebook', 'Tavsiya', 'Boshqa'];
const STATUSES = ['new', 'contacted', 'trial', 'won', 'lost'];
const STATUS_LABEL = { new: 'Yangi', contacted: "Bog'lanildi", trial: 'Sinov darsda', won: 'Yutildi', lost: "Yo'qotildi" };
const empty = { name: '', phone: '', source: 'Instagram', assigned_to: '', status: 'new', date: new Date().toISOString().slice(0, 10) };

export default function LeadsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    const r = await api.get('/leads?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || [])
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase())), [rows, q, statusFilter]);

  const won = useMemo(() => (rows || []).filter((r) => r.status === 'won').length, [rows]);
  const conversion = rows && rows.length ? Math.round((won / rows.length) * 100) : 0;

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/leads', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function setStatus(row, status) {
    await api.put(`/leads/${row.id}`, { status }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={UserSearch} title="Lidlar bazasi" subtitle={`${rows.length} ta lid · ${conversion}% konversiya`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi lid</button>} />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !py-2 !w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Barcha holatlar</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty icon={UserSearch} title="Lid topilmadi" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{r.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.name}</div>
                <div className="text-[11px] text-navy-400">{r.phone || '—'} · {r.source} · {r.assigned_to || "mas'ul yo'q"}</div>
              </div>
              <select value={r.status} onChange={(e) => setStatus(r, e.target.value)}
                className={`chip text-[10px] border-0 cursor-pointer ${statusStyle(r.status)}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi lid" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Ism familiya</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Telefon</label>
        <input className="input !py-2.5 mb-4" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Manba</label>
            <select className="input !py-2.5" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Mas'ul xodim</label>
            <input className="input !py-2.5" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
