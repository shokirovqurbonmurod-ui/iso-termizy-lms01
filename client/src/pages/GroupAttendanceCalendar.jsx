import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, CalendarDays } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner } from '../components/ui.jsx';
import { DOTS } from './AttendanceMark.jsx';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const DOT_MAP = Object.fromEntries(DOTS.map((d) => [d.key, d]));

function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// So'nggi 6 oy — undan 6 oy oldingi va keyingi — tanlash uchun oynacha (screenshotdagi kabi).
function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ y: d.getFullYear(), m: d.getMonth(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

export default function GroupAttendanceCalendar({ group, students, onClose }) {
  const navigate = useNavigate();
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const today = new Date();
  const [sel, setSel] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [records, setRecords] = useState(null);

  useEffect(() => {
    const from = `${monthKey(sel.y, sel.m)}-01`;
    const to = `${monthKey(sel.y, sel.m)}-${String(daysInMonth(sel.y, sel.m)).padStart(2, '0')}`;
    setRecords(null);
    api.get(`/attendance-daily?group_name=${encodeURIComponent(group.name)}&from=${from}&to=${to}`)
      .then((r) => setRecords(r || []))
      .catch(() => setRecords([]));
  }, [group.name, sel]);

  const days = useMemo(() => Array.from({ length: daysInMonth(sel.y, sel.m) }, (_, i) => i + 1), [sel]);

  // studentId -> { 'YYYY-MM-DD': status }
  const byStudent = useMemo(() => {
    const map = {};
    for (const r of records || []) {
      if (!map[r.student_id]) map[r.student_id] = {};
      map[r.student_id][r.date] = r.status;
    }
    return map;
  }, [records]);

  const dateStr = (day) => `${monthKey(sel.y, sel.m)}-${String(day).padStart(2, '0')}`;

  // Har bir kun uchun umumiy faollik foizi (header qatori).
  const dailyPct = useMemo(() => {
    const out = {};
    for (const day of days) {
      const d = dateStr(day);
      let active = 0, total = 0;
      for (const r of records || []) {
        if (r.date !== d) continue;
        total++;
        if (r.status === 'active' || r.status === 'passive') active++;
      }
      out[d] = total ? Math.round((active / total) * 100) : null;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, days]);

  const overallPct = useMemo(() => {
    const vals = Object.values(dailyPct).filter((v) => v !== null);
    return vals.length ? (vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1) : '0.0';
  }, [dailyPct]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, passive: 0, inactive: 0, new: 0 };
    for (const s of students) {
      const hasAny = Object.keys(byStudent[s.id] || {}).length > 0;
      if (!hasAny) { counts.new++; continue; }
      if (s.status === 'active') counts.active++;
      else if (s.status === 'frozen') counts.passive++;
      else counts.inactive++;
    }
    return counts;
  }, [students, byStudent]);

  const total = students.length || 1;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Breadcrumb header */}
        <div className="shrink-0 px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gold-600 font-semibold cursor-pointer" onClick={onClose}>Guruhlar</span>
            <ChevronRight size={14} className="text-navy-300" />
            <span className="text-navy-800 font-bold">{group.name}</span>
          </div>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Oy tanlash */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <CalendarDays size={16} className="text-gold shrink-0" />
            {monthOptions.map((o) => {
              const active = o.y === sel.y && o.m === sel.m;
              return (
                <button key={`${o.y}-${o.m}`} onClick={() => setSel({ y: o.y, m: o.m })}
                  className={`shrink-0 chip text-xs transition ${active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  {o.label}
                </button>
              );
            })}
          </div>

          {/* Status chiplari */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="chip bg-emerald-500 text-white text-xs">Aktiv: {Math.round(statusCounts.active / total * 100)}% ({statusCounts.active})</span>
            <span className="chip bg-amber-400 text-white text-xs">Passiv: {Math.round(statusCounts.passive / total * 100)}% ({statusCounts.passive})</span>
            <span className="chip bg-red-500 text-white text-xs">Noaktiv: {Math.round(statusCounts.inactive / total * 100)}% ({statusCounts.inactive})</span>
            <span className="chip bg-violet-500 text-white text-xs">Yangi: {Math.round(statusCounts.new / total * 100)}% ({statusCounts.new})</span>
          </div>

          {records === null ? <Spinner /> : (
            <div className="overflow-x-auto rounded-2xl border border-navy-100">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="bg-navy-50/70">
                    <th className="sticky left-0 bg-navy-50/70 px-3 py-2.5 text-left font-bold text-navy-500 min-w-[200px] z-10">AKTIVLIK</th>
                    {days.map((d) => (
                      <th key={d} className="px-2 py-2.5 font-bold text-navy-500 text-center min-w-[46px]">{String(d).padStart(2, '0')}.{String(sel.m + 1).padStart(2, '0')}</th>
                    ))}
                  </tr>
                  <tr className="bg-navy-50/40 border-b border-navy-100">
                    <td className="sticky left-0 bg-navy-50/40 px-3 py-2 font-bold text-navy-600">{overallPct} %</td>
                    {days.map((d) => {
                      const p = dailyPct[dateStr(d)];
                      return <td key={d} className="px-2 py-2 text-center text-navy-500">{p === null ? '—' : `${p}%`}</td>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.id} className="border-b border-navy-50 hover:bg-gold/[.02]">
                      <td className="sticky left-0 bg-white px-3 py-2 whitespace-nowrap cursor-pointer" onClick={() => navigate(`/app/students/${s.id}`)}>
                        <span className="text-navy-300 mr-1.5">{idx + 1}.</span>
                        <span className="font-semibold text-gold-700 hover:underline">{s.full_name}</span>
                        <span className="text-[10px] text-navy-400 ml-1.5">{s.streak || 0} kun</span>
                        <span className={`chip text-[9px] ml-2 ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'}`}>{s.status === 'active' ? 'Aktiv' : s.status}</span>
                      </td>
                      {days.map((d) => {
                        const status = byStudent[s.id]?.[dateStr(d)];
                        const dot = status ? DOT_MAP[status] : null;
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <span className={`inline-block w-4 h-4 rounded-full ${dot ? dot.color : 'border-2 border-navy-100'}`} title={dot?.label || "Belgilanmagan"} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
