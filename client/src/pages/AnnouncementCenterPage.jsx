import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, AlertCircle, Eye, Users2, GraduationCap, Globe2, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TARGET_META = {
  all: { icon: Globe2, label: 'Barchaga' },
  group: { icon: Users2, label: 'Guruhga' },
  course: { icon: GraduationCap, label: 'Kursga' },
};
const ANNOUNCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'academic_manager', 'marketing', 'smm'];
const empty = { title: '', body: '', target_type: 'all', target_value: '', priority: 'normal', date: new Date().toISOString().slice(0, 10) };

export default function AnnouncementCenterPage() {
  const { user } = useAuth();
  const canSend = ANNOUNCE_ROLES.includes(user.role);
  const [rows, setRows] = useState(null);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [readsFor, setReadsFor] = useState(null);
  const [reads, setReads] = useState([]);

  async function load() {
    const [a, g, c] = await Promise.all([
      api.get('/announcements?limit=500').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/courses').catch(() => []),
    ]);
    setRows((a || []).sort((x, y) => (y.date || '').localeCompare(x.date || '')));
    setGroups(g || []);
    setCourses(c || []);
  }
  useEffect(() => { load(); }, []);

  const unreadCount = useMemo(() => (rows || []).filter((r) => !r.read).length, [rows]);

  function openAdd() { setEditing(null); setForm(empty); setErr(''); setModal(true); }
  function openEdit(a) {
    setEditing(a); setErr('');
    setForm({ title: a.title || '', body: a.body || '', target_type: a.target_type || 'all', target_value: a.target_value || '', priority: a.priority || 'normal', date: a.date || empty.date });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) { setErr('Sarlavha kerak.'); return; }
    if (form.target_type !== 'all' && !form.target_value) { setErr("Nishon (guruh/kurs) tanlang."); return; }
    setSaving(true); setErr('');
    try {
      if (editing) await api.put(`/announcements/${editing.id}`, form);
      else await api.post('/announcements', form);
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function remove(a) {
    if (!confirm(`"${a.title}" e'lonini o'chirmoqchimisiz?`)) return;
    try { await api.del(`/announcements/${a.id}`); await load(); }
    catch (e) { alert(e.message); }
  }

  async function openReads(a) {
    setReadsFor(a);
    const r = await api.get(`/announcements/${a.id}/reads`).catch(() => []);
    setReads(r || []);
  }

  async function markRead(a) {
    if (a.read) return;
    await api.post(`/announcements/${a.id}/read`, {}).catch(() => {});
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, read: true } : r)));
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Megaphone} title="E'lon markazi" subtitle={canSend ? `${rows.length} ta e'lon` : `${unreadCount} ta o'qilmagan`}
        actions={canSend && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi e'lon</button>} />

      {rows.length === 0 ? <Empty icon={Megaphone} title="E'lon yo'q" /> : (
        <div className="space-y-2">
          {rows.map((a) => {
            const meta = TARGET_META[a.target_type] || TARGET_META.all;
            return (
              <div key={a.id} onClick={() => markRead(a)}
                className={`card p-4 cursor-pointer transition ${!a.read ? 'border-l-4 border-gold' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {a.priority === 'muhim' && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                    <span className={`text-sm truncate ${!a.read ? 'font-bold text-navy-900' : 'font-semibold text-navy-700'}`}>{a.title}</span>
                    {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                  </div>
                  <span className="text-[10px] text-navy-400 shrink-0">{a.date}</span>
                </div>
                {a.body && <p className="text-xs text-navy-500 mb-2">{a.body}</p>}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-navy-400">
                    <meta.icon size={11} />
                    <span>{meta.label}{a.target_value ? `: ${a.target_value}` : ''}</span>
                    {a.author && <span>· {a.author}</span>}
                  </div>
                  {canSend && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openReads(a); }} className="flex items-center gap-1 text-[10px] text-navy-400 hover:text-gold-600 transition">
                        <Eye size={11} /> Kim o'qidi
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash">
                        <Pencil size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); remove(a); }} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title={editing ? "E'lonni tahrirlash" : "Yangi e'lon"} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : "E'lon qilish"}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Matn</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kimga</label>
            <select className="input !py-2.5" value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value, target_value: '' })}>
              <option value="all">Barchaga</option>
              <option value="group">Guruhga</option>
              <option value="course">Kursga</option>
            </select>
          </div>
          <div>
            <label className="label">Muhimlik</label>
            <select className="input !py-2.5" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">Oddiy</option>
              <option value="muhim">Muhim</option>
            </select>
          </div>
        </div>
        {form.target_type !== 'all' && (
          <div className="mb-4">
            <label className="label">{form.target_type === 'group' ? 'Guruh' : 'Kurs'}</label>
            <select className="input !py-2.5" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}>
              <option value="">— tanlang —</option>
              {(form.target_type === 'group' ? groups.map((g) => g.name) : courses.map((c) => c.name)).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
        <label className="label">Sana</label>
        <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Modal>

      <Modal open={!!readsFor} title={`"${readsFor?.title || ''}" — o'qiganlar`} onClose={() => setReadsFor(null)}>
        {reads.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-6">Hali hech kim o'qimagan</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {reads.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs rounded-lg bg-navy-50/60 px-3 py-2">
                <span className="font-semibold text-navy-700">{r.user_name}</span>
                <span className="text-navy-400">{r.read_at}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
