import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, MapPin, Clock, ChevronDown, FileText, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const TYPE_COLOR = { Ichki: 'bg-navy-100 text-navy-600', Tashqi: 'bg-violet-100 text-violet-700', Online: 'bg-blue-100 text-blue-700' };

function isPast(m) {
  if (!m.date) return false;
  return new Date(`${m.date}T${m.time || '23:59'}`).getTime() < Date.now();
}

export default function Meetings() {
  const [meetings, setMeetings] = useState(null);
  const [notesByMeeting, setNotesByMeeting] = useState({});
  const [openId, setOpenId] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', participants: '', date: new Date().toISOString().slice(0, 10), time: '10:00', location: '', type: 'Ichki' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const m = await api.get('/meetings?limit=200').catch(() => []);
    setMeetings((m || []).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
  }
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => (meetings || []).filter((m) => !isPast(m)), [meetings]);
  const past = useMemo(() => (meetings || []).filter(isPast).reverse(), [meetings]);

  async function toggleOpen(m) {
    const next = openId === m.id ? null : m.id;
    setOpenId(next);
    setNewNote('');
    if (next && !notesByMeeting[m.id]) {
      const rows = await api.get(`/meeting_notes?q=${encodeURIComponent(m.title)}`).catch(() => []);
      setNotesByMeeting((prev) => ({ ...prev, [m.id]: rows || [] }));
    }
  }

  async function addNote(m) {
    if (!newNote.trim()) return;
    await api.post('/meeting_notes', { name: m.title, notes: newNote.trim(), status: 'active', date: new Date().toISOString().slice(0, 10) }).catch(() => {});
    setNewNote('');
    const rows = await api.get(`/meeting_notes?q=${encodeURIComponent(m.title)}`).catch(() => []);
    setNotesByMeeting((prev) => ({ ...prev, [m.id]: rows || [] }));
  }

  function openAdd() {
    setEditing(null);
    setForm({ title: '', participants: '', date: new Date().toISOString().slice(0, 10), time: '10:00', location: '', type: 'Ichki' });
    setModal(true);
  }

  function openEdit(m) {
    setEditing(m);
    setForm({ title: m.title || '', participants: m.participants || '', date: m.date || '', time: m.time || '10:00', location: m.location || '', type: m.type || 'Ichki' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) await api.put(`/meetings/${editing.id}`, form);
      else await api.post('/meetings', { ...form, status: 'planned' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(m) {
    if (!confirm(`"${m.title}" yig'ilishini o'chirmoqchimisiz?`)) return;
    try { await api.del(`/meetings/${m.id}`); await load(); }
    catch (e) { alert(e.message); }
  }

  function MeetingRow({ m }) {
    const open = openId === m.id;
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-navy-50/40" onClick={() => toggleOpen(m)}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-navy-800">{m.title}</div>
            <div className="flex items-center gap-3 text-[11px] text-navy-400 mt-0.5">
              <span className="flex items-center gap-1"><Clock size={10} /> {m.date} · {m.time}</span>
              {m.location && <span className="flex items-center gap-1"><MapPin size={10} /> {m.location}</span>}
              {m.participants && <span>{m.participants}</span>}
            </div>
          </div>
          <span className={`chip text-[9px] shrink-0 ${TYPE_COLOR[m.type] || 'bg-navy-100 text-navy-500'}`}>{m.type}</span>
          <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition shrink-0" title="Tahrirlash">
            <Pencil size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); remove(m); }} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition shrink-0" title="O'chirish">
            <Trash2 size={13} />
          </button>
          <ChevronDown size={16} className={`text-navy-400 transition shrink-0 ${open ? 'rotate-180' : ''}`} />
        </div>
        {open && (
          <div className="border-t border-navy-100 bg-navy-50/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-navy-500 mb-2"><FileText size={12} /> Qarorlar / eslatmalar</div>
            {(notesByMeeting[m.id] || []).length === 0 ? (
              <p className="text-xs text-navy-400 mb-3">Hali yozuv yo'q</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {(notesByMeeting[m.id] || []).map((n) => (
                  <div key={n.id} className="text-sm rounded-lg bg-white px-3 py-2">{n.notes}</div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input className="input !py-2 text-sm flex-1" placeholder="Qaror yoki eslatma qo'shish..." value={newNote}
                onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote(m)} />
              <button onClick={() => addNote(m)} className="btn-gold !py-2 !px-3 text-xs shrink-0">Qo'shish</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={Users} title="Yig'ilishlar" subtitle="Rejalashtirilgan va o'tgan yig'ilishlar — qarorlar bilan birga"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi yig'ilish</button>} />

      {meetings === null ? <Spinner /> : (
        <>
          <div className="mb-6">
            <h3 className="font-display text-lg text-navy-800 mb-3">Yaqinlashayotgan</h3>
            {upcoming.length === 0 ? <Empty icon={Users} title="Rejalashtirilgan yig'ilish yo'q" /> : (
              <div className="space-y-2">{upcoming.map((m) => <MeetingRow key={m.id} m={m} />)}</div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h3 className="font-display text-lg text-navy-800 mb-3">O'tgan yig'ilishlar</h3>
              <div className="space-y-2">{past.slice(0, 15).map((m) => <MeetingRow key={m.id} m={m} />)}</div>
            </div>
          )}
        </>
      )}

      <Modal open={modal} title={editing ? "Yig'ilishni tahrirlash" : "Yangi yig'ilish"} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Mavzu</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div>
            <label className="label">Joy</label>
            <input className="input !py-2.5" placeholder="Masalan: 301-xona / Zoom" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.keys(TYPE_COLOR).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <label className="label">Qatnashchilar</label>
        <input className="input !py-2.5" placeholder="Ism-familiyalar, vergul bilan" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
      </Modal>
    </div>
  );
}
