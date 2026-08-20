import { useEffect, useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const empty = { title: '', body: '', audience: 'Barcha xodimlar', date: new Date().toISOString().slice(0, 10) };

export default function InternalAnnouncementsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/internal_announcements?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, author: user?.full_name || '' }); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/internal_announcements', { ...form, author: user?.full_name || '' }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Bell} title="Ichki e'lonlar" subtitle="Xodimlar uchun ichki bildirishnomalar taxtasi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> E'lon qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Bell} title="E'lon yo'q" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy-800">{r.title}</span>
                <span className="text-[10px] text-navy-400">{r.date}</span>
              </div>
              {r.body && <p className="text-xs text-navy-600 mb-1.5">{r.body}</p>}
              <div className="text-[10px] text-navy-400">{r.author && `${r.author} · `}{r.audience}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="E'lon qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'E\'lon qilish'}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Matn</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <label className="label">Auditoriya</label>
        <input className="input !py-2.5" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
      </Modal>
    </div>
  );
}
