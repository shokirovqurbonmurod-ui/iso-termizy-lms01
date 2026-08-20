import { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { title: '', topic: '', moderator: '', date: new Date().toISOString().slice(0, 10), time: '', participants: 0, status: 'planned' };

export default function DebateClubPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/debate_club?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/debate_club', { ...form, participants: Number(form.participants) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Debate Club" subtitle="Bahs-munozara klubi sessiyalari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Sessiya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Users} title="Sessiya yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.title}</div>
                <div className="text-[11px] text-navy-400">{r.topic || 'mavzu belgilanmagan'}</div>
                <div className="text-[11px] text-navy-400">{r.moderator || 'moderator yo\'q'} · {r.date} {r.time} · {r.participants} kishi</div>
              </div>
              <span className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Sessiya qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Mavzu</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Savol</label>
        <input className="input !py-2.5 mb-4" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <label className="label">Moderator</label>
        <input className="input !py-2.5 mb-4" value={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
