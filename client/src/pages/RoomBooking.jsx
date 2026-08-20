import { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Plus, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const STATUS_STYLE = { confirmed: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-500' };
const ROOMS = ['101-xona', '201-xona', '202-xona', '204-xona', '301-xona'];

function toMinutes(t) { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function overlaps(a, b) { return toMinutes(a.time_start) < toMinutes(b.time_end) && toMinutes(b.time_start) < toMinutes(a.time_end); }

export default function RoomBooking() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(ROOMS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ room: ROOMS[0], date: new Date().toISOString().slice(0, 10), time_start: '09:00', time_end: '10:00', purpose: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [b, r] = await Promise.all([api.get('/room_bookings?limit=500').catch(() => []), api.get('/rooms').catch(() => [])]);
    setBookings(b || []); setRooms(r || []);
  }
  useEffect(() => { load(); }, []);

  const roomNames = rooms.length ? [...new Set(rooms.map((r) => r.name))] : ROOMS;
  const dayBookings = useMemo(() => (bookings || [])
    .filter((b) => b.room === room && b.date === date && b.status !== 'cancelled')
    .sort((a, b) => toMinutes(a.time_start) - toMinutes(b.time_start)), [bookings, room, date]);

  function openAdd() {
    setForm({ room, date, time_start: '09:00', time_end: '10:00', purpose: '' });
    setErr(''); setModal(true);
  }

  const conflict = useMemo(() => {
    return dayBookings.find((b) => b.status === 'confirmed' && overlaps(b, form));
  }, [dayBookings, form]);

  async function save() {
    if (toMinutes(form.time_end) <= toMinutes(form.time_start)) { setErr("Tugash vaqti boshlanishdan keyin bo'lishi kerak"); return; }
    if (conflict) { setErr(`Bu vaqt band: ${conflict.booked_by || conflict.purpose} (${conflict.time_start}–${conflict.time_end})`); return; }
    setSaving(true);
    try {
      await api.post('/room_bookings', { ...form, booked_by: user.full_name, status: 'confirmed' });
      setModal(false);
      if (form.room === room && form.date === date) {} else { setRoom(form.room); setDate(form.date); }
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function removeBooking(b) {
    if (!confirm(`"${b.purpose || 'Nomsiz'}" broni o'chirilsinmi?`)) return;
    await api.del(`/room_bookings/${b.id}`).catch(() => {});
    await load();
  }

  if (bookings === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={DoorOpen} title="Xona bron" subtitle="Xonalarni band qiling — to'qnashuvlar avtomatik ogohlantiriladi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi bron</button>} />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select className="input !py-2.5 !w-auto" value={room} onChange={(e) => setRoom(e.target.value)}>
          {roomNames.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="input !py-2.5 !w-auto" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4">{room} — {date}</h3>
        {dayBookings.length === 0 ? <Empty icon={DoorOpen} title="Bu kunga bron yo'q" /> : (
          <div className="space-y-2">
            {dayBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                <div className="flex items-center gap-1.5 text-sm font-bold text-navy-800 w-32 shrink-0"><Clock size={13} /> {b.time_start}–{b.time_end}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-700 truncate">{b.purpose || 'Nomsiz'}</div>
                  <div className="text-[11px] text-navy-400">{b.booked_by}</div>
                </div>
                <span className={`chip text-[10px] shrink-0 ${STATUS_STYLE[b.status] || ''}`}>{b.status}</span>
                <button onClick={() => removeBooking(b)} title="O'chirish" className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} title="Yangi xona bron" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving || !!conflict}>{saving ? 'Saqlanmoqda...' : 'Bron qilish'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Xona</label>
            <select className="input !py-2.5" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
              {roomNames.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Boshlanish</label>
            <input className="input !py-2.5" type="time" value={form.time_start} onChange={(e) => setForm({ ...form, time_start: e.target.value })} />
          </div>
          <div>
            <label className="label">Tugash</label>
            <input className="input !py-2.5" type="time" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} />
          </div>
        </div>
        <label className="label">Maqsad</label>
        <input className="input !py-2.5 mb-3" placeholder="Masalan: IELTS Mock Exam" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
        {conflict && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertTriangle size={14} className="shrink-0" /> Bu vaqt band: {conflict.booked_by || conflict.purpose} ({conflict.time_start}–{conflict.time_end})
          </div>
        )}
      </Modal>
    </div>
  );
}
