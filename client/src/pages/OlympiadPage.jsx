import { useEffect, useMemo, useState } from 'react';
import { Trophy, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const LEVELS = ['Markaz', 'Viloyat', 'Respublika', 'Xalqaro'];
const empty = { title: '', subject: '', level: 'Markaz', date: new Date().toISOString().slice(0, 10), participants: 0, winners: '', status: 'planned' };

export default function OlympiadPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/olympiad?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const totalParticipants = useMemo(() => (rows || []).reduce((a, r) => a + (Number(r.participants) || 0), 0), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/olympiad', { ...form, participants: Number(form.participants) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleDone(row) {
    await api.put(`/olympiad/${row.id}`, { status: row.status === 'planned' ? 'done' : 'planned' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Trophy} title="Olimpiada markazi" subtitle={`${rows.length} ta tadbir · ${totalParticipants} ta qatnashchi`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Olimpiada qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Trophy} title="Olimpiada yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0"><Trophy size={14} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.title}</div>
                <div className="text-[11px] text-navy-400">{r.subject} · {r.level} · {r.date} · {r.participants} qatnashchi</div>
                {r.winners && <div className="text-[11px] text-gold-600 font-semibold mt-0.5">🏆 {r.winners}</div>}
              </div>
              <button onClick={() => toggleDone(r)} className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'done' ? 'yakunlandi' : 'rejalashtirilgan'}</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Olimpiada qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Olimpiada nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Fan</label>
            <input className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Daraja</label>
            <select className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Qatnashchilar</label>
            <input className="input !py-2.5" type="number" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
