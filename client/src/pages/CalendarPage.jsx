import { useEffect, useState } from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, X, Clock3 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const WD = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya'];
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [cur, setCur] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [addModal, setAddModal] = useState(null); // {date}
  const [viewDay, setViewDay] = useState(null); // {date}
  const [form, setForm] = useState({ title: '', type: 'lesson' });
  const [local, setLocal] = useState({}); // qo'lda qo'shilgan hodisalar

  const canEdit = !['student','parent'].includes(user.role);

  async function load() {
    const [lessons, exams, ev2, live, meets] = await Promise.all([
      api.get('/lessons').catch(() => []),
      api.get('/exams').catch(() => []),
      api.get('/events').catch(() => []),
      api.get('/live_sessions').catch(() => []),
      api.get('/meetings').catch(() => []),
    ]);
    const ev = {};
    (lessons || []).forEach((l) => { if (l.date) (ev[l.date] = ev[l.date] || []).push({ t: l.title, type: 'lesson' }); });
    (exams || []).forEach((e) => { if (e.date) (ev[e.date] = ev[e.date] || []).push({ t: e.title, type: 'exam' }); });
    (ev2 || []).forEach((e) => { if (e.date) (ev[e.date] = ev[e.date] || []).push({ t: e.title, type: 'event', id: e.id, source: 'events' }); });
    (live || []).forEach((l) => { if (l.date) (ev[l.date] = ev[l.date] || []).push({ t: l.title, type: 'live', time: l.time }); });
    (meets || []).forEach((m) => { if (m.date) (ev[m.date] = ev[m.date] || []).push({ t: m.title, type: 'meeting', time: m.time }); });
    setEvents(ev);
  }
  useEffect(() => { load(); }, []);

  if (events === null) return <Spinner />;

  const year = cur.getFullYear(), month = cur.getMonth();
  const first = new Date(year, month, 1);
  const startWd = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const iso = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const allEv = (d) => [...(events[iso(d)] || []), ...(local[iso(d)] || [])];
  const move = (delta) => setCur(new Date(year, month + delta, 1));

  async function saveEvent() {
    if (!form.title.trim()) return;
    const dateKey = addModal.date;
    try {
      await api.post('/events', { title: form.title, type: form.type, date: dateKey, location: '', status: 'planned' });
      setLocal((prev) => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), { t: form.title, type: form.type }],
      }));
      load();
    } catch {
      setLocal((prev) => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), { t: form.title, type: form.type }],
      }));
    }
    setAddModal(null); setForm({ title: '', type: 'lesson' });
  }

  const TYPE_STYLE = {
    lesson: 'bg-blue-100 text-blue-700',
    exam: 'bg-rose-100 text-rose-700',
    event: 'bg-violet-100 text-violet-700',
    live: 'bg-emerald-100 text-emerald-700',
    meeting: 'bg-amber-100 text-amber-700',
  };
  const TYPE_ICO = { lesson: '📽️', exam: '📝', event: '📌', live: '🎥', meeting: '🤝' };

  async function deleteEvent(e) {
    if (e.source !== 'events' || !e.id) return;
    if (!confirm("Hodisa o'chirilsinmi?")) return;
    await api.del(`/events/${e.id}`).catch(() => {});
    await load();
  }

  function goToday() {
    const n = new Date();
    setCur(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  return (
    <div>
      <PageHeader icon={CalIcon} title="Kalendar" subtitle="Darslar, imtihonlar va tadbirlar" />
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => move(-1)} className="grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-50 text-navy-500 transition"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-3">
            <div className="font-display text-xl text-navy-800">{MONTHS[month]} {year}</div>
            <button onClick={goToday} className="text-[11px] font-bold text-gold-600 hover:text-gold-700 border border-gold/30 rounded-full px-2.5 py-1">Bugun</button>
          </div>
          <button onClick={() => move(1)} className="grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-50 text-navy-500 transition"><ChevronRight size={18} /></button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs mb-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 inline-block" /> Dars</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 inline-block" /> Imtihon</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-100 inline-block" /> Tadbir</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> Live Classroom</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Yig'ilish</span>
          <span className="flex items-center gap-1 ml-auto text-navy-400">📌 Kun ustiga bosib to'liq rejani ko'ring</span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {WD.map((w) => <div key={w} className="text-center text-xs font-bold text-navy-400 pb-1">{w}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const today = new Date();
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const evs = allEv(d);
            return (
              <div key={i}
                onClick={() => setViewDay({ date: iso(d), day: d })}
                className={`min-h-[80px] rounded-xl border transition p-1.5 cursor-pointer ${
                  isToday ? 'border-gold bg-gold/5 shadow-glow' :
                  'border-navy-100 hover:border-gold/50 hover:bg-gold/[.02]'}`}>
                <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-gold-600 font-bold' : 'text-navy-500'}`}>{d}</div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e, j) => (
                    <div key={j} className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate ${TYPE_STYLE[e.type] || 'bg-navy-100 text-navy-600'}`}>
                      {TYPE_ICO[e.type]} {e.t}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="text-[9px] text-navy-400">+{evs.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day view modal — barcha hodisalarni to'liq ko'rsatadi */}
      {viewDay && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade" onClick={() => setViewDay(null)}>
          <div className="card w-full max-w-md p-6 !shadow-2xl animate-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg text-navy-800">{viewDay.day}-{MONTHS[month]}, {year}</h3>
              <button onClick={() => setViewDay(null)} className="text-navy-400 hover:text-navy-700"><X size={18} /></button>
            </div>
            <p className="text-xs text-navy-400 mb-4">Shu kunga rejalashtirilgan barcha hodisalar</p>
            <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
              {allEv(viewDay.day).length === 0 ? (
                <div className="text-center text-navy-400 text-sm py-8">Bu kun uchun hodisa yo'q</div>
              ) : allEv(viewDay.day).map((e, j) => (
                <div key={j} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${TYPE_STYLE[e.type] || 'bg-navy-100 text-navy-600'}`}>
                  <span className="text-lg shrink-0">{TYPE_ICO[e.type] || '📌'}</span>
                  <span className="text-sm font-semibold flex-1">{e.t}{e.time && <span className="font-normal opacity-70"> · {e.time}</span>}</span>
                  {e.source === 'events' && canEdit && (
                    <button onClick={() => deleteEvent(e)} className="opacity-60 hover:opacity-100 transition shrink-0"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <button className="btn-gold w-full" onClick={() => { setAddModal({ date: viewDay.date }); setViewDay(null); }}>
                <Plus size={16} /> Hodisa qo'shish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add event modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade" onClick={() => setAddModal(null)}>
          <div className="card w-full max-w-sm p-6 !shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-navy-800">Hodisa qo'shish</h3>
              <button onClick={() => setAddModal(null)} className="text-navy-400 hover:text-navy-700"><X size={18} /></button>
            </div>
            <div className="text-sm text-navy-400 mb-4">📅 {addModal.date}</div>
            <label className="label">Sarlavha</label>
            <input className="input !py-2.5 mb-3" placeholder="Hodisa nomi..." autoFocus
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveEvent()} />
            <label className="label">Turi</label>
            <select className="input !py-2.5 mb-5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="lesson">📽️ Dars</option>
              <option value="exam">📝 Imtihon</option>
              <option value="event">📌 Tadbir</option>
            </select>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setAddModal(null)}>Bekor</button>
              <button className="btn-gold flex-1" onClick={saveEvent}><Plus size={16} /> Qo'shish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
