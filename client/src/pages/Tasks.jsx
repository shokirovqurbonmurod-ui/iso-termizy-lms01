import { useEffect, useState } from 'react';
import { ClipboardList, Plus, X, Flag } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const COLUMNS = [
  { key: 'todo', label: 'Boshlanmagan', color: 'bg-navy-100 text-navy-600' },
  { key: 'in_progress', label: 'Jarayonda', color: 'bg-amber-100 text-amber-700' },
  { key: 'done', label: 'Bajarildi', color: 'bg-emerald-100 text-emerald-700' },
];
const PRIORITY_COLOR = { yuqori: 'text-red-500', "o'rta": 'text-amber-500', past: 'text-navy-300' };

// Eski ma'lumotlar 'open' statusida bo'lishi mumkin — shuni 'todo' ustuniga joylashtiramiz.
function normalizeStatus(s) { return s === 'open' ? 'todo' : (s || 'todo'); }

export default function Tasks() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', assigned_to: '', priority: "o'rta", deadline: '' });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);

  async function load() { setRows(await api.get('/tasks?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm({ title: '', assigned_to: user.full_name, priority: "o'rta", deadline: '' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks', { ...form, status: 'todo' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function moveTask(id, status) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await api.put(`/tasks/${id}`, { status }).catch(() => load());
  }

  async function removeTask(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await api.del(`/tasks/${id}`).catch(() => {});
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Vazifalar" subtitle="Ustunlar orasida sudrab statusni o'zgartiring"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi vazifa</button>} />

      <div className="grid sm:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = rows.filter((r) => normalizeStatus(r.status) === col.key);
          return (
            <div key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveTask(dragId, col.key); setDragId(null); }}
              className="card p-3 min-h-[400px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`chip text-[11px] ${col.color}`}>{col.label}</span>
                <span className="text-xs text-navy-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} draggable onDragStart={() => setDragId(t.id)}
                    className="rounded-xl border border-navy-100 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition group">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-navy-800">{t.title}</span>
                      <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition shrink-0"><X size={13} /></button>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-navy-400">
                      {t.assigned_to && <span>{t.assigned_to}</span>}
                      {t.priority && <span className={`flex items-center gap-0.5 ${PRIORITY_COLOR[t.priority] || ''}`}><Flag size={10} /> {t.priority}</span>}
                    </div>
                    {t.deadline && <div className="text-[10px] text-navy-400 mt-1">📅 {t.deadline}</div>}
                    <div className="flex gap-1 mt-2">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button key={c.key} onClick={() => moveTask(t.id, c.key)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500 hover:bg-gold/10 hover:text-gold-700 transition">
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal} title="Yangi vazifa" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Vazifa nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Mas'ul</label>
            <input className="input !py-2.5" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
          </div>
          <div>
            <label className="label">Muddat</label>
            <input className="input !py-2.5" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <label className="label mb-2">Muhimlik</label>
        <div className="grid grid-cols-3 gap-2">
          {['yuqori', "o'rta", 'past'].map((p) => (
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
