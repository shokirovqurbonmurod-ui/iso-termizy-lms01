import { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

const PRESENT = ['active', 'passive'];

export default function GroupAnalytics() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    Promise.all([
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get(`/attendance-daily?from=${from}`).catch(() => []),
      api.get('/exam_results?limit=2000').catch(() => []),
    ]).then(([g, s, a, e]) => {
      setGroups(g || []); setStudents(s || []); setAttendance(a || []); setExamResults(e || []);
      if (g?.length) setGroupName(g[0].name);
      setLoaded(true);
    });
  }, []);

  const group = useMemo(() => groups.find((g) => g.name === groupName), [groups, groupName]);
  const roster = useMemo(() => students.filter((s) => s.group_name === groupName), [students, groupName]);
  const rosterNames = useMemo(() => new Set(roster.map((s) => s.full_name)), [roster]);
  const groupAttendance = useMemo(() => attendance.filter((a) => a.group_name === groupName), [attendance, groupName]);
  const groupExams = useMemo(() => examResults.filter((e) => rosterNames.has(e.student)), [examResults, rosterNames]);

  const avgProgress = useMemo(() => roster.length ? Math.round(roster.reduce((a, s) => a + (s.progress || 0), 0) / roster.length) : 0, [roster]);
  const avgAttendance = useMemo(() => {
    if (!groupAttendance.length) return 0;
    const present = groupAttendance.filter((a) => PRESENT.includes(a.status)).length;
    return Math.round((present / groupAttendance.length) * 100);
  }, [groupAttendance]);
  const avgExamScore = useMemo(() => {
    const scores = groupExams.map((e) => Number(e.score) || 0);
    return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  }, [groupExams]);

  const statusCounts = useMemo(() => {
    const c = { active: 0, frozen: 0, other: 0 };
    for (const s of roster) {
      if (s.status === 'active') c.active++;
      else if (s.status === 'frozen') c.frozen++;
      else c.other++;
    }
    return c;
  }, [roster]);

  const sorted = useMemo(() => [...roster].sort((a, b) => (b.progress || 0) - (a.progress || 0)), [roster]);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();

  const dailyTrend = useMemo(() => {
    const byDate = {};
    for (const a of groupAttendance) {
      if (!byDate[a.date]) byDate[a.date] = { total: 0, present: 0 };
      byDate[a.date].total++;
      if (PRESENT.includes(a.status)) byDate[a.date].present++;
    }
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, pct: Math.round((v.present / v.total) * 100) }));
  }, [groupAttendance]);

  if (!loaded) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Guruh analitika" subtitle="Har bir guruh bo'yicha chuqur tahlil — haqiqiy ma'lumotlar asosida" />

      <div className="mb-5">
        <select className="input !py-2.5 !w-auto" value={groupName} onChange={(e) => setGroupName(e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      {!group ? <Empty icon={BarChart3} title="Guruh topilmadi" /> : (
        <>
          <div className="card p-5 mb-6 flex items-center gap-4">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold text-lg shrink-0">{group.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg text-navy-800">{group.name}</div>
              <div className="text-xs text-navy-400">{group.teacher} · {group.room} · {group.level}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <span className="chip text-[10px] bg-emerald-100 text-emerald-700">Faol {statusCounts.active}</span>
              <span className="chip text-[10px] bg-sky-100 text-sky-700">Muzlatilgan {statusCounts.frozen}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card stat-glow p-5">
              <Users size={20} className="text-navy-400 mb-2" />
              <div className="font-display text-2xl text-navy-800">{roster.length}</div>
              <div className="text-sm text-navy-400">O'quvchilar</div>
            </div>
            <div className="card stat-glow p-5">
              <TrendingUp size={20} className="text-gold-500 mb-2" />
              <div className="font-display text-2xl text-navy-800">{avgProgress}%</div>
              <div className="text-sm text-navy-400">O'rtacha progress</div>
            </div>
            <div className="card stat-glow p-5">
              <BarChart3 size={20} className="text-emerald-500 mb-2" />
              <div className="font-display text-2xl text-navy-800">{avgAttendance}%</div>
              <div className="text-sm text-navy-400">Davomat (30 kun)</div>
            </div>
            <div className="card stat-glow p-5">
              <Star size={20} className="text-amber-500 mb-2" />
              <div className="font-display text-2xl text-navy-800">{avgExamScore}</div>
              <div className="text-sm text-navy-400">O'rtacha imtihon balli</div>
            </div>
          </div>

          {dailyTrend.length > 0 && (
            <div className="card p-5 mb-6">
              <h3 className="font-display text-lg text-navy-800 mb-4">Davomat trendi</h3>
              {dailyTrend.length < 3 ? (
                <div className="flex items-end gap-3 h-28">
                  {dailyTrend.map((d) => (
                    <div key={d.date} className="w-14 h-full flex flex-col items-center justify-end gap-1" title={`${d.date}: ${d.pct}%`}>
                      <span className="text-[10px] font-bold text-navy-500">{d.pct}%</span>
                      <div className={`w-full rounded-t ${d.pct >= 85 ? 'bg-emerald-400' : d.pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ height: `${Math.max(4, d.pct)}%` }} />
                      <span className="text-[9px] text-navy-400">{d.date.slice(5)}</span>
                    </div>
                  ))}
                  <span className="text-xs text-navy-400 self-center ml-2">To'liq trend uchun kamida 3 kunlik davomat ma'lumoti kerak</span>
                </div>
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {dailyTrend.map((d) => (
                    <div key={d.date} className="flex-1 h-full flex flex-col justify-end" title={`${d.date}: ${d.pct}%`}>
                      <div className={`w-full rounded-t ${d.pct >= 85 ? 'bg-emerald-400' : d.pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ height: `${Math.max(4, d.pct)}%` }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 text-emerald-600"><TrendingUp size={18} /><h3 className="font-display text-lg text-navy-800">Eng yaxshi 5 ta</h3></div>
              {top.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
                <div className="space-y-2">
                  {top.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl bg-emerald-50/60 px-3 py-2.5">
                      <div className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500 text-white text-xs font-bold shrink-0">{s.full_name[0]}</div>
                      <span className="flex-1 text-sm font-semibold text-navy-800 truncate">{s.full_name}</span>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{s.progress || 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4 text-red-500"><TrendingDown size={18} /><h3 className="font-display text-lg text-navy-800">E'tibor talab qiladi</h3></div>
              {bottom.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
                <div className="space-y-2">
                  {bottom.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl bg-red-50/60 px-3 py-2.5">
                      <div className="grid place-items-center w-8 h-8 rounded-lg bg-red-500 text-white text-xs font-bold shrink-0">{s.full_name[0]}</div>
                      <span className="flex-1 text-sm font-semibold text-navy-800 truncate">{s.full_name}</span>
                      <span className="text-sm font-bold text-red-500 shrink-0">{s.progress || 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
