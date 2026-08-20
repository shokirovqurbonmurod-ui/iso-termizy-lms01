import { useEffect, useState, useMemo } from 'react';
import { CalendarClock, Search, Plus, X, Trash2, Phone, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const DAYS = [
  { key: 'Du', label: 'Dushanba' },
  { key: 'Se', label: 'Seshanba' },
  { key: 'Cho', label: 'Chorshanba' },
  { key: 'Pa', label: 'Payshanba' },
  { key: 'Ju', label: 'Juma' },
  { key: 'Sh', label: 'Shanba' },
  { key: 'Ya', label: 'Yakshanba' },
];

const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-orange-100 text-orange-800 border-orange-200',
];

function parseDays(str) {
  const time = (str.match(/\d{1,2}:\d{2}/) || [''])[0];
  if (/har kuni/i.test(str)) return { days: DAYS.map((d) => d.key), time };
  const found = DAYS.filter((d) => new RegExp(`(^|[^A-Za-z])${d.key}([^a-z]|$)`).test(str)).map((d) => d.key);
  return { days: found, time };
}

// Bugungi kun
const TODAY_KEY = ['Ya','Du','Se','Cho','Pa','Ju','Sh'][new Date().getDay()];

export default function Schedule() {
  const { user } = useAuth();
  const [groups, setGroups] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [q, setQ] = useState('');
  const [view, setView] = useState('week');
  const [addModal, setAddModal] = useState(null); // { dayKey, dayLabel }
  const [form, setForm] = useState({ name: '', teacher: '', time: '', room: '', level: '' });
  const [localExtra, setLocalExtra] = useState({});
  const [editLesson, setEditLesson] = useState(null); // guruh obyekti (tahrirlanayotgan)
  const [editForm, setEditForm] = useState({ name: '', teacher: '', days: '', room: '', level: '' });
  const [teacherInfo, setTeacherInfo] = useState(null); // { name, items }

  const canEdit = ['director','super_admin','admin','academic_manager'].includes(user.role);

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  async function load() {
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const [g, t, st, at] = await Promise.all([
      api.get('/groups').catch(() => []),
      api.get('/teachers').catch(() => []),
      api.get('/students').catch(() => []),
      api.get(`/attendance-daily?from=${monthStart}`).catch(() => []),
    ]);
    setGroups(g || []); setTeachers(t || []); setStudents(st || []); setAttendance(at || []);
  }
  useEffect(() => { load(); }, []);

  // Guruh bo'yicha shu oylik Aktiv/Passiv/Noaktiv/Yangi taqsimoti — reyting kartochkalari uchun.
  const statsByGroup = useMemo(() => {
    const map = {};
    for (const g of groups || []) {
      const roster = students.filter((s) => s.group_name === g.name);
      const total = roster.length || 1;
      let active = 0, passive = 0, inactive = 0, neu = 0;
      for (const s of roster) {
        const hasAny = attendance.some((a) => a.student_id === s.id);
        if (!hasAny) { neu++; continue; }
        if (s.status === 'active') active++;
        else if (s.status === 'frozen') passive++;
        else inactive++;
      }
      map[g.name] = {
        active: Math.round((active / total) * 100), activeCount: active,
        passive: Math.round((passive / total) * 100), passiveCount: passive,
        inactive: Math.round((inactive / total) * 100), inactiveCount: inactive,
        neu: Math.round((neu / total) * 100), neuCount: neu,
        overall: roster.length ? Math.round((active / roster.length) * 100) : 0,
      };
    }
    return map;
  }, [groups, students, attendance]);

  const byDay = useMemo(() => {
    const m = {};
    DAYS.forEach((d) => (m[d.key] = []));
    (groups || []).forEach((g, i) => {
      if (q && !`${g.name} ${g.teacher} ${g.room}`.toLowerCase().includes(q.toLowerCase())) return;
      const { days, time } = parseDays(g.days || '');
      const tInfo = teachers.find((t) => t.full_name === g.teacher);
      days.forEach((dk) => m[dk].push({ ...g, time, color: COLORS[i % COLORS.length], rating: tInfo?.rating || '' }));
    });
    // localExtra qo'shish
    Object.entries(localExtra).forEach(([dk, items]) => {
      if (!m[dk]) return;
      items.forEach((it, i) => m[dk].push({ ...it, id: 'local_'+dk+'_'+i, color: COLORS[5] }));
    });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    return m;
  }, [groups, teachers, q, localExtra]);

  const byTeacher = useMemo(() => {
    const m = {};
    (groups || []).forEach((g, i) => {
      if (q && !`${g.name} ${g.teacher} ${g.room}`.toLowerCase().includes(q.toLowerCase())) return;
      const { days, time } = parseDays(g.days || '');
      if (!m[g.teacher]) m[g.teacher] = [];
      m[g.teacher].push({ ...g, time, days, color: COLORS[i % COLORS.length] });
    });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    return m;
  }, [groups, q]);

  if (groups === null) return <Spinner />;

  function openAdd(dayKey, dayLabel) {
    setForm({ name: '', teacher: '', time: '09:00', room: '', level: 'A1' });
    setAddModal({ dayKey, dayLabel });
  }

  async function saveLesson() {
    if (!form.name.trim()) return;
    const dayKey = addModal.dayKey;
    const daysStr = dayKey + ' ' + form.time;
    try {
      await api.post('/groups', {
        name: form.name, teacher: form.teacher, days: daysStr,
        room: form.room, level: form.level, students_count: 0, branch: 'Sherobod — Bosh filial',
      });
      await load();
    } catch {
      // fallback: local ko'rinish
      setLocalExtra((prev) => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), {
          name: form.name, teacher: form.teacher,
          time: form.time, room: form.room, level: form.level,
        }],
      }));
    }
    setAddModal(null);
  }

  function openEdit(g) {
    if (!canEdit || String(g.id).startsWith('local_')) return;
    setEditForm({ name: g.name || '', teacher: g.teacher || '', days: g.days || '', room: g.room || '', level: g.level || '' });
    setEditLesson(g);
  }

  async function saveEdit() {
    if (!editForm.name.trim() || !editLesson) return;
    try {
      await api.put(`/groups/${editLesson.id}`, { ...editForm });
      await load();
      setEditLesson(null);
    } catch (e) {
      alert(e.message || "Saqlashda xatolik yuz berdi");
    }
  }

  async function deleteEdit() {
    if (!editLesson) return;
    if (!confirm(`"${editLesson.name}" darsini (guruhini) o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    try {
      await api.del(`/groups/${editLesson.id}`);
      await load();
      setEditLesson(null);
    } catch (e) {
      alert(e.message || "O'chirishda xatolik yuz berdi");
    }
  }

  return (
    <div>
      <PageHeader icon={CalendarClock} title="Jadval"
        subtitle="Haftalik dars jadvali — kun ustiga bosib yangi dars qo'shing" />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-white border border-navy-100 rounded-xl p-1">
          {[['week','Haftalik'], ['teacher',"O'qituvchi"]].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${view===k?'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow':'text-navy-500 hover:text-navy-700'}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Guruh, o'qituvchi, xona..."
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm text-navy-400">{groups.length} ta guruh</span>
        {canEdit && <span className="text-xs text-navy-400">📌 Kun sarlavhasiga bosib dars qo'shing</span>}
      </div>

      {view === 'week' && (
        groups.length === 0 ? <Empty icon={CalendarClock} title="Guruhlar yo'q" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {DAYS.map((d) => {
            const isToday = d.key === TODAY_KEY;
            return (
              <div key={d.key} className={`card p-3 min-h-[140px] ${isToday ? 'ring-2 ring-gold shadow-glow' : ''}`}>
                {/* Kun sarlavhasi — bosib dars qo'shish */}
                <button
                  onClick={() => canEdit && openAdd(d.key, d.label)}
                  className={`w-full flex items-center justify-between text-xs font-bold pb-2 mb-2 border-b border-navy-100 tracking-wide uppercase transition ${
                    isToday ? 'text-gold-600' : 'text-navy-600 hover:text-gold-600'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span>{d.label}</span>
                  {canEdit && <Plus size={13} className="opacity-50 group-hover:opacity-100" />}
                </button>
                <div className="space-y-2">
                  {byDay[d.key].length === 0 ? (
                    <div onClick={() => canEdit && openAdd(d.key, d.label)}
                      className={`text-center text-xs text-navy-200 py-6 ${canEdit ? 'cursor-pointer hover:text-gold-400 transition' : ''}`}>
                      {canEdit ? '+ Dars qo\'shish' : '—'}
                    </div>
                  ) : byDay[d.key].map((g) => (
                    <div key={g.id} onClick={() => openEdit(g)}
                      className={`rounded-xl border p-2.5 ${g.color} transition hover:shadow-sm ${canEdit && !String(g.id).startsWith('local_') ? 'cursor-pointer' : ''}`}>
                      <div className="text-[11px] font-bold opacity-70">{g.time || ''}</div>
                      <div className="text-sm font-bold truncate mt-0.5">{g.name}</div>
                      <div className="text-[11px] opacity-80 truncate">{g.teacher}</div>
                      <div className="text-[11px] opacity-60 truncate">{g.room} · {g.level}</div>
                      {g.rating && <div className="text-[11px] opacity-70 mt-0.5">⭐ {g.rating}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'teacher' && (
        <div className="space-y-4">
          {Object.entries(byTeacher).map(([teacher, items], ti) => {
            const tInfo = teachers.find((t) => t.full_name === teacher);
            return (
              <div key={teacher} className="card p-4 animate-fade" style={{ animationDelay: `${ti * 40}ms` }}>
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-navy-100 cursor-pointer group" onClick={() => setTeacherInfo({ name: teacher, info: tInfo, items })}>
                  <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold">{teacher[0]}</div>
                  <div className="flex-1">
                    <div className="font-bold text-navy-800 group-hover:text-gold-600 transition">{teacher}</div>
                    <div className="text-xs text-navy-400">{tInfo?.langs || ''} · {items.length} guruh · ⭐ {tInfo?.rating || '—'}</div>
                  </div>
                  <span className="chip bg-gold/10 text-gold-700">{tInfo?.level || ''}</span>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {items.map((g) => {
                    const s = statsByGroup[g.name];
                    return (
                      <div key={g.id} onClick={() => openEdit(g)}
                        className={`rounded-xl border p-3 ${g.color} ${canEdit ? 'cursor-pointer hover:shadow-sm' : ''} transition`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="text-[11px] font-bold opacity-70">{g.time} · {g.days?.map?.((k) => DAYS.find((d) => d.key === k)?.label?.slice(0,3)).join?.(', ')}</div>
                            <div className="text-sm font-bold truncate">{g.name}</div>
                          </div>
                          {s && <span className="chip text-[9px] bg-white/60 shrink-0">{s.overall}%</span>}
                        </div>
                        <div className="text-[11px] opacity-70 mb-2">{g.room} · {g.level} · 👥 {g.students_count}</div>
                        {s && (
                          <div className="flex flex-wrap gap-1">
                            <span className="chip text-[9px] bg-emerald-500 text-white">Aktiv {s.active}% ({s.activeCount})</span>
                            <span className="chip text-[9px] bg-amber-400 text-white">Passiv {s.passive}% ({s.passiveCount})</span>
                            <span className="chip text-[9px] bg-red-500 text-white">Noaktiv {s.inactive}% ({s.inactiveCount})</span>
                            <span className="chip text-[9px] bg-violet-500 text-white">Yangi {s.neu}% ({s.neuCount})</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dars qo'shish modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade"
          onClick={() => setAddModal(null)}>
          <div className="card w-full max-w-md p-6 !shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-xl text-navy-800">Yangi dars qo'shish</h3>
                <p className="text-sm text-navy-400">{addModal.dayLabel}</p>
              </div>
              <button onClick={() => setAddModal(null)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-100 text-navy-400 transition"><X size={16} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Guruh nomi <span className="text-red-400">*</span></label>
                <input className="input !py-2.5" placeholder="Masalan: Ingliz tili A1" autoFocus
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">O'qituvchi</label>
                <select className="input !py-2.5" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {teachers.map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vaqt</label>
                <input className="input !py-2.5" type="time" value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
              <div>
                <label className="label">Xona</label>
                <input className="input !py-2.5" placeholder="101-xona" value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </div>
              <div>
                <label className="label">Daraja</label>
                <select className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {['A1','A2','B1','B2','B2+','C1','C2','Pro','Abituriyent'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn-ghost flex-1" onClick={() => setAddModal(null)}>Bekor</button>
              <button className="btn-gold flex-1" onClick={saveLesson}><Plus size={16} /> Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* Darsni tahrirlash / o'chirish modal */}
      {editLesson && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade"
          onClick={() => setEditLesson(null)}>
          <div className="card w-full max-w-md p-6 !shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-xl text-navy-800">Darsni tahrirlash</h3>
                <p className="text-sm text-navy-400">{editLesson.name}</p>
              </div>
              <button onClick={() => setEditLesson(null)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-100 text-navy-400 transition"><X size={16} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Guruh nomi <span className="text-red-400">*</span></label>
                <input className="input !py-2.5" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="label">O'qituvchi</label>
                <select className="input !py-2.5" value={editForm.teacher} onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {teachers.map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Xona</label>
                <input className="input !py-2.5" value={editForm.room} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} />
              </div>
              <div>
                <label className="label">Daraja</label>
                <select className="input !py-2.5" value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}>
                  {['A1','A2','B1','B2','B2+','C1','C2','Pro','Abituriyent'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Kunlar va vaqt</label>
                <input className="input !py-2.5" placeholder="Masalan: Du Cho Ju 18:00" value={editForm.days}
                  onChange={(e) => setEditForm({ ...editForm, days: e.target.value })} />
                <p className="text-[11px] text-navy-400 mt-1">Kun qisqartmalari: Du, Se, Cho, Pa, Ju, Sh, Ya — so'ngida vaqt (masalan 18:00)</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn-ghost !px-3 text-red-500 hover:bg-red-50" onClick={deleteEdit} title="Darsni o'chirish"><Trash2 size={16} /></button>
              <button className="btn-ghost flex-1" onClick={() => setEditLesson(null)}>Bekor</button>
              <button className="btn-gold flex-1" onClick={saveEdit}>Saqlash</button>
            </div>
          </div>
        </div>
      )}

      {/* O'qituvchi ma'lumotlari modal */}
      {teacherInfo && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade"
          onClick={() => setTeacherInfo(null)}>
          <div className="card w-full max-w-md p-6 !shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center w-12 h-12 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold text-lg shrink-0">{teacherInfo.name[0]}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg text-navy-800 truncate">{teacherInfo.name}</h3>
                <p className="text-xs text-navy-400">{teacherInfo.info?.langs || '—'}</p>
              </div>
              <button onClick={() => setTeacherInfo(null)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-100 text-navy-400 transition shrink-0"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-navy-50/60 px-3 py-2.5 flex items-center gap-2">
                <Phone size={14} className="text-navy-400" />
                <span className="text-sm font-semibold text-navy-700">{teacherInfo.info?.phone || '—'}</span>
              </div>
              <div className="rounded-xl bg-navy-50/60 px-3 py-2.5 flex items-center gap-2">
                <Star size={14} className="text-gold-500" />
                <span className="text-sm font-semibold text-navy-700">{teacherInfo.info?.rating || '—'}</span>
              </div>
              <div className="rounded-xl bg-navy-50/60 px-3 py-2.5">
                <div className="text-[10px] text-navy-400">Daraja</div>
                <div className="text-sm font-semibold text-navy-700">{teacherInfo.info?.level || '—'}</div>
              </div>
              <div className="rounded-xl bg-navy-50/60 px-3 py-2.5">
                <div className="text-[10px] text-navy-400">Guruhlar</div>
                <div className="text-sm font-semibold text-navy-700">{teacherInfo.items.length} ta</div>
              </div>
            </div>
            <div className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Guruhlari</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {teacherInfo.items.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg bg-navy-50/40 px-3 py-2 text-sm">
                  <span className="font-semibold text-navy-700 truncate">{g.name}</span>
                  <span className="text-xs text-navy-400 shrink-0 ml-2">{g.room} · {g.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
