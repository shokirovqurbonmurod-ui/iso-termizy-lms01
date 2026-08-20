import { useEffect, useMemo, useState } from 'react';
import { Gauge, Users, Star, TrendingUp, ClipboardCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

const PRESENT = ['active', 'passive'];
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i >= -5; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function level(score) {
  if (score >= 85) return { label: 'A\'lo', color: 'bg-emerald-100 text-emerald-700' };
  if (score >= 65) return { label: 'Yaxshi', color: 'bg-teal-100 text-teal-700' };
  if (score >= 45) return { label: "O'rtacha", color: 'bg-amber-100 text-amber-700' };
  return { label: 'Past', color: 'bg-red-100 text-red-600' };
}

export default function TeacherKpi() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(monthOptions[0].key);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/teachers').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get(`/attendance-daily?from=${month}-01`).catch(() => []),
      api.get('/exam_results?limit=2000').catch(() => []),
    ]).then(([t, g, s, a, e]) => {
      setTeachers(t || []); setGroups(g || []); setStudents(s || []); setAttendance(a || []); setExamResults(e || []);
      setLoaded(true);
    });
  }, [month]);

  const kpis = useMemo(() => {
    return teachers.map((t) => {
      const myGroups = groups.filter((g) => g.teacher === t.full_name).map((g) => g.name);
      const myStudents = students.filter((s) => myGroups.includes(s.group_name));
      const names = new Set(myStudents.map((s) => s.full_name));
      const myAttendance = attendance.filter((a) => myGroups.includes(a.group_name));
      const present = myAttendance.filter((a) => PRESENT.includes(a.status)).length;
      const attendanceRate = myAttendance.length ? Math.round((present / myAttendance.length) * 100) : 0;
      const myExams = examResults.filter((e) => names.has(e.student));
      const scores = myExams.map((e) => Number(e.score) || 0);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const kpiScore = Math.round(avgScore * 0.4 + attendanceRate * 0.4 + (t.rating || 0) * 4);
      return { teacher: t, studentsCount: myStudents.length, groupsCount: myGroups.length, attendanceRate, avgScore, kpiScore };
    }).sort((a, b) => b.kpiScore - a.kpiScore);
  }, [teachers, groups, students, attendance, examResults]);

  if (!loaded) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gauge} title="Teacher KPI" subtitle="O'qituvchilar samaradorligi — davomat, natija va reyting asosida" />

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {monthOptions.map((o) => (
          <button key={o.key} onClick={() => setMonth(o.key)}
            className={`shrink-0 chip text-xs transition ${month === o.key ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {kpis.length === 0 ? <Empty icon={Gauge} title="Ma'lumot yo'q" /> : (
        <div className="space-y-3">
          {kpis.map((k, i) => {
            const lv = level(k.kpiScore);
            return (
              <div key={k.teacher.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 text-center font-display text-navy-400 text-sm shrink-0">{i + 1}</div>
                  <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold shrink-0">{k.teacher.full_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-navy-800 truncate">{k.teacher.full_name}</div>
                    <div className="text-[11px] text-navy-400">{k.teacher.langs || ''} · {k.groupsCount} guruh</div>
                  </div>
                  <span className={`chip text-[10px] shrink-0 ${lv.color}`}>{lv.label}</span>
                  <div className="font-display text-xl text-navy-800 w-12 text-right shrink-0">{k.kpiScore}</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-navy-50/60 px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-navy-500"><Users size={11} /> {k.studentsCount}</div>
                    <div className="text-[9px] text-navy-400">O'quvchi</div>
                  </div>
                  <div className="rounded-lg bg-navy-50/60 px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-navy-500"><ClipboardCheck size={11} /> {k.attendanceRate}%</div>
                    <div className="text-[9px] text-navy-400">Davomat</div>
                  </div>
                  <div className="rounded-lg bg-navy-50/60 px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-navy-500"><TrendingUp size={11} /> {k.avgScore}</div>
                    <div className="text-[9px] text-navy-400">O'rtacha ball</div>
                  </div>
                  <div className="rounded-lg bg-navy-50/60 px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-navy-500"><Star size={11} /> {k.teacher.rating || '—'}</div>
                    <div className="text-[9px] text-navy-400">Reyting</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
