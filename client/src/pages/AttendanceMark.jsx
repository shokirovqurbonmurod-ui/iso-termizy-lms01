import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Save, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

// Dumaloq holat belgilari (foydalanuvchi talabi bo'yicha)
export const DOTS = [
  { key: 'active',   label: 'Aktiv',           color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  { key: 'passive',  label: 'Passiv',          color: 'bg-amber-400',   ring: 'ring-amber-200',   text: 'text-amber-700' },
  { key: 'inactive', label: 'Noaktiv',         color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-700' },
  { key: 'absent',   label: 'Qatnashmadi',     color: 'bg-white border-2 border-navy-300', ring: 'ring-navy-200', text: 'text-navy-600' },
  { key: 'archived', label: 'Arxiv',           color: 'bg-blue-500',    ring: 'ring-blue-200',    text: 'text-blue-700' },
];

const SHIFTS = [
  { key: 'morning', label: '🌅 Ertalabki', time: '08:00 – 12:00' },
  { key: 'day',     label: '☀️ Kunduzgi',  time: '12:00 – 16:00' },
  { key: 'evening', label: '🌙 Kechki',    time: '16:00 – 20:00' },
];

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

export default function AttendanceMark() {
  const [students, setStudents] = useState(null);
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState('');
  const [shift, setShift] = useState('morning');
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState('');

  const today = new Date();
  const dayName = WEEKDAYS[today.getDay()];
  const dateStr = today.toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      api.get('/students').catch(() => []),
      api.get('/groups').catch(() => []),
    ]).then(([s, g]) => {
      setStudents(s || []);
      setGroups(g || []);
      if (g?.length) setGroup(g[0].name);
    });
  }, []);

  const list = useMemo(
    () => (students || []).filter((s) => !group || s.group_name === group),
    [students, group]);

  function setMark(id, key) {
    setMarks((m) => ({ ...m, [id]: key }));
    setSaved('');
  }

  function exportCSV() {
    const header = 'Guruh,Sana,Kelgan,Kelmagan,Smena\n';
    const body = `${group},${dateStr},${Object.values(marks).filter(v=>v==='active'||v==='passive').length},${Object.values(marks).filter(v=>v==='absent'||v==='inactive').length},${SHIFTS.find(x=>x.key===shift)?.label}`;
    const blob = new Blob([header + body], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `davomat_${dateStr}.csv`; a.click();
  }

  function exportTXT() {
    const lines = ['ISO TERMIZY — DAVOMAT', 'Sana: ' + dateStr + ' ' + dayName, 'Guruh: ' + group, 'Smena: ' + SHIFTS.find(x=>x.key===shift)?.label, ''];
    list.forEach(s => {
      const mark = marks[s.id] || 'belgilanmagan';
      lines.push(s.full_name + ' — ' + mark);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `davomat_${dateStr}.txt`; a.click();
  }

  async function save() {
    const present = Object.values(marks).filter((v) => v === 'active' || v === 'passive').length;
    const absent = Object.values(marks).filter((v) => v === 'absent' || v === 'inactive').length;
    try {
      await api.post('/attendance', {
        group_name: group, date: dateStr, present, absent,
        note: `${SHIFTS.find((x) => x.key === shift)?.label} · ${dayName}`,
      });
      // Har bir o'quvchining shu kunlik holati alohida ham saqlanadi — "Guruh davomati" kalendarida ko'rsatish uchun.
      const records = list.filter((s) => marks[s.id]).map((s) => ({ student_id: s.id, student_name: s.full_name, status: marks[s.id] }));
      if (records.length) await api.post('/attendance-daily/bulk', { group_name: group, date: dateStr, records });
      setSaved(`✅ Saqlandi — kelgan: ${present}, kelmagan: ${absent}`);
    } catch (e) { setSaved('❌ ' + e.message); }
  }

  if (students === null) return <Spinner />;

  const counts = DOTS.map((d) => ({ ...d, n: Object.values(marks).filter((v) => v === d.key).length }));

  return (
    <div>
      <PageHeader icon={ClipboardCheck} title="Davomat belgilash"
        subtitle={`Bugun: ${dayName}, ${dateStr}`}
        actions={<div className="flex gap-2">
          <button className="btn-gold" onClick={save}><Save size={16} /> Saqlash</button>
          <button className="btn-ghost text-xs" onClick={exportCSV}>CSV</button>
          <button className="btn-ghost text-xs" onClick={exportTXT}>TXT</button>
        </div>} />

      {/* Filtrlar */}
      <div className="card p-5 mb-5">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={group} onChange={(e) => { setGroup(e.target.value); setMarks({}); }}>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name} · {g.teacher}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Smena</label>
            <div className="flex gap-2">
              {SHIFTS.map((s) => (
                <button key={s.key} onClick={() => setShift(s.key)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    shift === s.key
                      ? 'border-gold bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow'
                      : 'border-navy-100 text-navy-600 hover:border-gold/50'}`}>
                  <div>{s.label}</div>
                  <div className="text-[10px] font-normal opacity-80">{s.time}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-navy-100">
          {counts.map((d) => (
            <div key={d.key} className="flex items-center gap-2 text-xs">
              <span className={`w-3.5 h-3.5 rounded-full ${d.color} inline-block shadow-sm`} />
              <span className={`font-semibold ${d.text}`}>{d.label}</span>
              <span className="text-navy-400">({d.n})</span>
            </div>
          ))}
        </div>
      </div>

      {saved && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3">{saved}</div>}

      {/* O'quvchilar ro'yxati */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-navy-100 flex items-center gap-2">
          <Users size={16} className="text-gold" />
          <span className="font-display text-lg text-navy-800">{group || 'Guruh tanlang'}</span>
          <span className="text-sm text-navy-400 ml-auto">{list.length} o'quvchi</span>
        </div>

        {list.length === 0 ? (
          <div className="py-14 text-center text-navy-400 text-sm">Bu guruhda o'quvchi yo'q</div>
        ) : (
          <div className="divide-y divide-navy-50">
            {list.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gold/[.02] transition animate-fade" style={{ animationDelay: `${i * 25}ms` }}>
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{s.full_name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy-800 truncate">{s.full_name}</div>
                  <div className="text-xs text-navy-400">{s.level} · 🪙 {s.coins}</div>
                </div>
                {/* Dumaloq tanlash + sonlar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {DOTS.map((d) => {
                    const on = marks[s.id] === d.key;
                    return (
                      <button key={d.key} onClick={() => setMark(s.id, d.key)} title={d.label}
                        className={`w-7 h-7 rounded-full ${d.color} transition-all ${
                          on ? `ring-4 ${d.ring} scale-110` : 'opacity-30 hover:opacity-70'}`} />
                    );
                  })}
                  <div className="flex items-center gap-1 ml-2 bg-navy-50 rounded-lg px-1">
                    <button onClick={() => setMark(s.id, 'inactive')} className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center font-bold text-sm">−</button>
                    <span className="text-xs font-bold text-navy-600 w-4 text-center">{marks[s.id] === 'active' ? '✓' : marks[s.id] === 'inactive' ? '✗' : '·'}</span>
                    <button onClick={() => setMark(s.id, 'active')} className="w-6 h-6 rounded text-emerald-500 hover:bg-emerald-50 flex items-center justify-center font-bold text-sm">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
