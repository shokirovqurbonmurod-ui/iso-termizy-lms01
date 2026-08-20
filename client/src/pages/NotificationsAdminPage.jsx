import { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const TYPES = [
  { v: 'info', label: 'Ma\'lumot', icon: Info, color: 'text-blue-500' },
  { v: 'warn', label: 'Ogohlantirish', icon: AlertTriangle, color: 'text-amber-500' },
  { v: 'success', label: 'Muvaffaqiyat', icon: CheckCircle2, color: 'text-emerald-500' },
  { v: 'error', label: 'Xato', icon: ShieldAlert, color: 'text-red-500' },
];
const ROLES = [
  { v: 'all', label: 'Barchaga' }, { v: 'director', label: 'Direktor' }, { v: 'teacher', label: "O'qituvchi" },
  { v: 'student', label: "O'quvchi" }, { v: 'reception', label: 'Reception' }, { v: 'accountant', label: 'Buxgalter' },
];
const empty = { title: '', body: '', type: 'info', target_role: 'all', date: new Date().toISOString().slice(0, 10) };

export default function NotificationsAdminPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/notifications?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const unread = useMemo(() => (rows || []).filter((r) => !r.read).length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/notifications', { ...form, read: 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Bell} title="Bildirishnomalar" subtitle={`${rows.length} ta jami · ${unread} ta o'qilmagan`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi bildirishnoma</button>} />

      {rows.length === 0 ? <Empty icon={Bell} title="Bildirishnoma yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const meta = TYPES.find((t) => t.v === r.type) || TYPES[0];
            const Icon = meta.icon;
            return (
              <div key={r.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${r.read ? 'bg-navy-50/60' : 'bg-gold/[.06] border border-gold/20'}`}>
                <Icon size={16} className={`shrink-0 mt-0.5 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800">{r.title}</div>
                  {r.body && <div className="text-xs text-navy-500 mt-0.5">{r.body}</div>}
                  <div className="text-[10px] text-navy-400 mt-1">{ROLES.find((x) => x.v === r.target_role)?.label || r.target_role || 'Barchaga'} · {r.date}</div>
                </div>
                {!r.read && <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi bildirishnoma" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Matn</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <label className="label mb-2">Turi</label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TYPES.map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })}
              className={`rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${form.type === t.v ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="label">Kimga</label>
        <select className="input !py-2.5" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}>
          {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
        </select>
      </Modal>
    </div>
  );
}
