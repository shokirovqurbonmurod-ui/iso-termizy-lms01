import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { DOTS } from './AttendanceMark.jsx';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const PRESENT = ['active', 'passive']; // "keldi" deb hisoblanadigan holatlar

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i >= -6; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}
function daysInMonth(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); }

export default function AttendanceOverall() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(monthOptions[0].key);
  const [rows, setRows] = useState(null);
  const [groupFilter, setGroupFilter] = useState('');

  async function load() {
    const from = `${month}-01`;
    const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
    const r = await api.get(`/attendance-daily?from=${from}&to=${to}`).catch(() => []);
    setRows(r || []);
  }
  useEffect(() => { load(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => [...new Set((rows || []).map((r) => r.group_name))].sort(), [rows]);

  const filtered = useMemo(() => groupFilter ? (rows || []).filter((r) => r.group_name === groupFilter) : (rows || []), [rows, groupFilter]);

  const overallPct = useMemo(() => {
    if (!filtered.length) return 0;
    const present = filtered.filter((r) => PRESENT.includes(r.status)).length;
    return Math.round((present / filtered.length) * 100);
  }, [filtered]);

  const byGroup = useMemo(() => {
    const map = {};
    for (const r of rows || []) {
      if (!map[r.group_name]) map[r.group_name] = { total: 0, present: 0 };
      map[r.group_name].total++;
      if (PRESENT.includes(r.status)) map[r.group_name].present++;
    }
    return Object.entries(map).map(([group_name, v]) => ({ group_name, pct: v.total ? Math.round((v.present / v.total) * 100) : 0, total: v.total }))
      .sort((a, b) => b.pct - a.pct);
  }, [rows]);

  const byDay = useMemo(() => {
    const map = {};
    for (const r of filtered) {
      if (!map[r.date]) map[r.date] = { total: 0, present: 0 };
      map[r.date].total++;
      if (PRESENT.includes(r.status)) map[r.date].present++;
    }
    const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
    return days.map((d) => ({ date: d, pct: map[d] ? Math.round((map[d].present / map[d].total) * 100) : null }));
  }, [filtered, month]);

  const statusCounts = useMemo(() => {
    const counts = {};
    for (const d of DOTS) counts[d.key] = 0;
    for (const r of filtered) if (counts[r.status] !== undefined) counts[r.status]++;
    return counts;
  }, [filtered]);

  const best = byGroup[0];
  const worst = byGroup[byGroup.length - 1];

  return (
    <div>
      <PageHeader icon={ClipboardCheck} title="Davomat umumiy" subtitle="Barcha guruhlar bo'yicha oylik davomat ko'rsatkichlari" />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {monthOptions.map((o) => (
          <button key={o.key} onClick={() => setMonth(o.key)}
            className={`shrink-0 chip text-xs transition ${month === o.key ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>
            {o.label}
          </button>
        ))}
        <select className="input !py-1.5 !w-auto text-xs ml-auto" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <Empty icon={ClipboardCheck} title="Bu oyda davomat yozuvi yo'q" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card stat-glow p-5">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-display text-2xl text-navy-800">{overallPct}%</div>
              <div className="text-sm text-navy-400">Umumiy davomat</div>
            </div>
            {best && (
              <div className="card stat-glow p-5">
                <div className="flex items-center gap-2 text-emerald-600 mb-2"><TrendingUp size={20} /></div>
                <div className="font-display text-lg text-navy-800 truncate">{best.group_name}</div>
                <div className="text-sm text-navy-400">Eng yaxshi — {best.pct}%</div>
              </div>
            )}
            {worst && (
              <div className="card stat-glow p-5">
                <div className="flex items-center gap-2 text-red-500 mb-2"><TrendingDown size={20} /></div>
                <div className="font-display text-lg text-navy-800 truncate">{worst.group_name}</div>
                <div className="text-sm text-navy-400">E'tibor talab — {worst.pct}%</div>
              </div>
            )}
            <div className="card stat-glow p-5">
              <div className="flex items-center gap-2 text-gold-600 mb-2"><Users size={20} /></div>
              <div className="font-display text-2xl text-navy-800">{groups.length}</div>
              <div className="text-sm text-navy-400">Faol guruhlar</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {DOTS.map((d) => (
              <span key={d.key} className={`chip text-[10px] ${d.text} bg-opacity-10`} style={{ backgroundColor: 'rgba(0,0,0,.04)' }}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${d.color}`} />
                {d.label}: {statusCounts[d.key] || 0}
              </span>
            ))}
          </div>

          <div className="card p-5 mb-6">
            <h3 className="font-display text-lg text-navy-800 mb-4">Kunlik davomat foizi</h3>
            <div className="flex items-end gap-1 h-32">
              {byDay.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className={`w-full rounded-t transition ${d.pct === null ? '' : d.pct >= 85 ? 'bg-emerald-400' : d.pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ height: d.pct === null ? '2px' : `${Math.max(4, d.pct)}%`, opacity: d.pct === null ? 0.15 : 1 }}
                    title={`${d.date}: ${d.pct === null ? "ma'lumot yo'q" : d.pct + '%'}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-navy-300 mt-1">
              <span>1</span><span>{daysInMonth(month)}</span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">Guruhlar bo'yicha</h3>
            <div className="space-y-2">
              {byGroup.map((g) => (
                <div key={g.group_name} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-sm font-semibold text-navy-700 truncate">{g.group_name}</div>
                  <div className="flex-1 h-5 rounded-lg bg-navy-50 overflow-hidden">
                    <div className={`h-full rounded-lg flex items-center justify-end px-2 ${g.pct >= 85 ? 'bg-emerald-500' : g.pct >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${Math.max(8, g.pct)}%` }}>
                      <span className="text-[10px] font-bold text-white">{g.pct}%</span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-[11px] text-navy-400">{g.total} yozuv</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
