import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const PRIORITIES = ['yuqori', "o'rta", 'past'];
const PRIORITY_COLOR = { yuqori: 'text-red-500', "o'rta": 'text-amber-500', past: 'text-navy-300' };
const empty = { from_name: '', subject: '', message: '', priority: "o'rta", date: new Date().toISOString().slice(0, 10), status: 'open' };

export default function ComplaintsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/complaints?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const open = useMemo(() => (rows || []).filter((r) => r.status !== 'resolved'), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.from_name.trim()) return;
    setSaving(true);
    try { await api.post('/complaints', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function resolve(row) {
    await api.put(`/complaints/${row.id}`, { status: 'resolved' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={AlertTriangle} title="Shikoyatlar" subtitle={`${open.length} ta hal qilinmagan`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Shikoyat qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={AlertTriangle} title="Shikoyat yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <AlertTriangle size={15} className={`shrink-0 ${PRIORITY_COLOR[r.priority] || ''}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.subject || r.from_name}</div>
                <div className="text-[11px] text-navy-400">{r.from_name} · {r.date}</div>
                {r.message && <div className="text-xs text-navy-500 mt-0.5 truncate">{r.message}</div>}
              </div>
              {r.status !== 'resolved'
                ? <button onClick={() => resolve(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Hal qilish</button>
                : <span className={`chip text-[10px] shrink-0 ${statusStyle('resolved')}`}>hal qilindi</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Shikoyat qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Ism</label>
        <input className="input !py-2.5 mb-4" value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
        <label className="label">Mavzu</label>
        <input className="input !py-2.5 mb-4" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <label className="label">Xabar</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <label className="label mb-2">Muhimlik</label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${form.priority === p ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
