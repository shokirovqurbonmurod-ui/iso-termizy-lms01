import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Minus, ClipboardCheck, CalendarClock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

const TREND_ICON = { yuqori: TrendingUp, "o'sish": TrendingUp, pasayish: TrendingDown, stabil: Minus };
const TREND_COLOR = { yuqori: 'text-emerald-600', "o'sish": 'text-emerald-600', pasayish: 'text-red-500', stabil: 'text-navy-400' };

function bucketOf(rate) {
  if (rate >= 90) return 'yaxshi';
  if (rate >= 70) return "o'rtacha";
  return 'past';
}
const BUCKET_STYLE = {
  yaxshi: { label: "Yaxshi (90%+)", bar: 'from-emerald-400 to-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  "o'rtacha": { label: "O'rtacha (70-89%)", bar: 'from-gold-400 to-gold-500', chip: 'bg-amber-100 text-amber-700' },
  past: { label: 'Past (<70%)', bar: 'from-red-400 to-red-500', chip: 'bg-red-100 text-red-600' },
};

export default function AttendanceAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [raw, setRaw] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/attendance_analytics').catch(() => []),
      api.get('/attendance').catch(() => []),
    ]).then(([aa, a]) => { setAnalytics(aa || []); setRaw(a || []); });
  }, []);

  const sorted = useMemo(() => [...(analytics || [])].sort((a, b) => a.rate - b.rate), [analytics]);

  const stats = useMemo(() => {
    if (!analytics || !analytics.length) return null;
    const avgRate = Math.round(analytics.reduce((a, g) => a + g.rate, 0) / analytics.length);
    const totalPresent = analytics.reduce((a, g) => a + (g.avg_present || 0), 0);
    const totalAbsent = analytics.reduce((a, g) => a + (g.avg_absent || 0), 0);
    const buckets = { yaxshi: 0, "o'rtacha": 0, past: 0 };
    analytics.forEach((g) => buckets[bucketOf(g.rate)]++);
    return { avgRate, totalPresent, totalAbsent, buckets, best: sorted[sorted.length - 1], worst: sorted[0] };
  }, [analytics, sorted]);

  const recentLog = useMemo(() => [...raw].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [raw]);

  if (analytics === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Davomat analitika" subtitle="Guruhlar bo'yicha davomat foizi, tendensiya va xavf darajasi"
        actions={<Link to="/app/attendance-mark" className="btn-gold"><ClipboardCheck size={16} /> Davomat belgilash</Link>} />

      {!stats ? (
        <Empty icon={BarChart3} title="Ma'lumot yo'q" hint="Davomat tahlili hali kiritilmagan." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              ['📊', "O'rtacha davomat", stats.avgRate + '%', stats.avgRate >= 85 ? 'text-emerald-600' : stats.avgRate >= 70 ? 'text-gold-600' : 'text-red-600'],
              ['✅', 'Eng yaxshi guruh', stats.best?.group_name || '—', 'text-emerald-600'],
              ['⚠️', "E'tibor talab qiladi", stats.worst?.group_name || '—', 'text-red-600'],
              ['👥', "O'rtacha kelgan/kelmagan", `${stats.totalPresent} / ${stats.totalAbsent}`, ''],
            ].map(([ic, label, val, cls], i) => (
              <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="text-2xl mb-2">{ic}</div>
                <div className={`font-display text-xl text-navy-800 truncate ${cls}`}>{val}</div>
                <div className="text-sm text-navy-400">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {Object.entries(stats.buckets).map(([key, count]) => (
              <div key={key} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`chip text-[10px] ${BUCKET_STYLE[key].chip}`}>{BUCKET_STYLE[key].label}</span>
                  <span className="font-display text-xl text-navy-800">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${BUCKET_STYLE[key].bar}`} style={{ width: `${(count / analytics.length) * 100}%` }} />
                </div>
                <div className="text-[11px] text-navy-400 mt-1.5">{analytics.length ? Math.round((count / analytics.length) * 100) : 0}% guruhlar</div>
              </div>
            ))}
          </div>

          {/* Guruhlar reytingi — eng past birinchi */}
          <div className="card p-5 mb-6">
            <h3 className="font-display text-lg text-navy-800 mb-4">📉 Guruhlar bo'yicha davomat (eng past birinchi)</h3>
            <div className="space-y-3">
              {sorted.map((g) => {
                const TrendIcon = TREND_ICON[g.trend] || Minus;
                const bucket = bucketOf(g.rate);
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="w-40 sm:w-48 shrink-0 text-sm text-navy-700 font-semibold truncate">{g.group_name}</div>
                    <div className="flex-1 h-6 rounded-lg bg-navy-50 overflow-hidden">
                      <div className={`h-full rounded-lg bg-gradient-to-r ${BUCKET_STYLE[bucket].bar} flex items-center justify-end px-2`} style={{ width: `${g.rate}%` }}>
                        <span className="text-[10px] font-bold text-white">{g.rate}%</span>
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-[11px] text-navy-400 text-right">{g.avg_present} kelgan · {g.avg_absent} kelmagan</div>
                    <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${TREND_COLOR[g.trend] || 'text-navy-400'}`}>
                      <TrendIcon size={13} /> {g.trend}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Oxirgi kunlik yozuvlar */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-navy-100">
              <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><CalendarClock size={18} className="text-gold" /> Oxirgi kunlik yozuvlar</h3>
            </div>
            {recentLog.length === 0 ? (
              <Empty icon={CalendarClock} title="Kunlik yozuv yo'q" hint="'Davomat belgilash' orqali kiritilgan yozuvlar shu yerda ko'rinadi." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                      {['Guruh', 'Sana', 'Kelgan', 'Kelmagan', 'Izoh'].map((h) => (
                        <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentLog.map((r) => (
                      <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                        <td className="px-4 py-3 font-semibold text-navy-800">{r.group_name}</td>
                        <td className="px-4 py-3 text-navy-500 font-mono text-xs">{r.date}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold tabular-nums">{r.present}</td>
                        <td className="px-4 py-3 text-red-500 font-semibold tabular-nums">{r.absent}</td>
                        <td className="px-4 py-3 text-navy-400">{r.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
