import { useEffect, useState, useMemo } from 'react';
import { Coins, Trophy, TrendingUp, Flame, Gift, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { money } from '../lib/format.js';

// Oddiy bar chart
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 justify-between" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[10px] font-bold text-navy-600">{d.value}</div>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-gold-400 to-gold-300 transition-all" 
            style={{ height: `${(d.value / max) * 100}%`, minHeight: 4, animationDelay: `${i * 50}ms` }} />
          <div className="text-[9px] text-navy-400 truncate w-full text-center">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Pie chart (CSS)
function PieChart({ segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let cumulative = 0;
  const gradientParts = segments.map(s => {
    const start = (cumulative / total) * 360;
    cumulative += s.value;
    const end = (cumulative / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return (
    <div className="flex items-center gap-4">
      <div className="w-28 h-28 rounded-full shadow-inner" 
        style={{ background: `conic-gradient(${gradientParts.join(', ')})` }} />
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-navy-600">{s.label}: <b>{s.value}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoinDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [coinLog, setCoinLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/students').catch(() => []),
      api.get('/coin_log').catch(() => []),
    ]).then(([s, c]) => {
      setStudents(s || []); setCoinLog(c || []); setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const totalCoins = students.reduce((a, s) => a + (Number(s.coins) || 0), 0);
    const totalPoints = students.reduce((a, s) => a + (Number(s.points) || 0), 0);
    const avgStreak = Math.round(students.reduce((a, s) => a + (Number(s.streak) || 0), 0) / (students.length || 1));
    const topStreak = Math.max(...students.map(s => s.streak || 0), 0);
    
    // Coin taqsimoti (pie chart)
    const earned = coinLog.filter(l => (l.amount || 0) > 0).reduce((a, l) => a + l.amount, 0);
    const spent = Math.abs(coinLog.filter(l => (l.amount || 0) < 0).reduce((a, l) => a + l.amount, 0));
    
    // Top 7 o'quvchi (bar chart)
    const top7 = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 7);
    
    // Oxirgi 7 kun coin faolligi
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(5, 10);
      const dayCoins = coinLog.filter(l => (l.at || '').slice(5, 10) === ds).reduce((a, l) => a + Math.abs(l.amount || 0), 0);
      last7.push({ label: ds, value: dayCoins });
    }
    
    // Bugun eng faol o'quvchilar — kim eng ko'p coin harakati (berilgan yoki sarflangan) qilgani.
    const today = new Date().toISOString().slice(0, 10);
    const byStudentToday = {};
    for (const l of coinLog) {
      if ((l.at || '').slice(0, 10) !== today) continue;
      byStudentToday[l.student] = (byStudentToday[l.student] || 0) + Math.abs(l.amount || 0);
    }
    const activeToday = Object.entries(byStudentToday).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const activeStudentsPct = students.length ? Math.round((students.filter((s) => (s.coins || 0) > 0).length / students.length) * 100) : 0;

    // Eng ko'p sotib olingan Coin Shop sovg'alari — /coins/spend har doim "Coin Shop: <nomi>" deb
    // coin_log'ga yozadi, shundan haqiqiy talab qilinishini hisoblaymiz.
    const shopCounts = {};
    for (const l of coinLog) {
      if (!l.reason?.startsWith('Coin Shop: ')) continue;
      const item = l.reason.slice('Coin Shop: '.length);
      shopCounts[item] = (shopCounts[item] || 0) + 1;
    }
    const topShopItems = Object.entries(shopCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { totalCoins, totalPoints, avgStreak, topStreak, earned, spent, top7, last7, activeToday, activeStudentsPct, topShopItems };
  }, [students, coinLog]);

  const MEDALS = ['🥇', '🥈', '🥉'];

  if (loading) return <Spinner />;

  const STAT_CARDS = [
    { icon: Coins, label: 'Jami coinlar', value: stats.totalCoins.toLocaleString(), color: 'from-gold-400/20 to-gold-100/10 text-gold-600' },
    { icon: Star, label: 'Jami pointlar', value: stats.totalPoints.toLocaleString(), color: 'from-blue-400/20 to-blue-100/10 text-blue-600' },
    { icon: Flame, label: "O'rtacha streak", value: stats.avgStreak + ' kun', color: 'from-orange-400/20 to-orange-100/10 text-orange-600' },
    { icon: Trophy, label: 'Eng uzun streak', value: stats.topStreak + ' kun', color: 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' },
    { icon: TrendingUp, label: 'Berilgan coin', value: stats.earned.toLocaleString(), color: 'from-violet-400/20 to-violet-100/10 text-violet-600' },
    { icon: Gift, label: 'Sarflangan coin', value: stats.spent.toLocaleString(), color: 'from-rose-400/20 to-rose-100/10 text-rose-600' },
  ];

  return (
    <div>
      <PageHeader icon={Coins} title="Coin & Points Dashboard" subtitle="Gamifikatsiya statistikasi va boshqaruvi" />

      {/* Stat kartalar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {STAT_CARDS.map((c, i) => (
          <div key={c.label} className="card stat-glow p-4 animate-fade" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} mb-2`}>
              <c.icon size={20} />
            </div>
            <div className="font-display text-xl text-navy-800">{c.value}</div>
            <div className="text-xs text-navy-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Coin taqsimoti */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">🪙 Coin taqsimoti</h3>
          <PieChart segments={[
            { label: 'Berilgan', value: stats.earned, color: '#C6A15B' },
            { label: 'Sarflangan', value: stats.spent, color: '#E74C3C' },
            { label: 'Qolgan', value: stats.totalCoins, color: '#3498DB' },
          ]} />
        </div>

        {/* Kunlik faollik */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📈 Haftalik coin faolligi</h3>
          <BarChart data={stats.last7} height={160} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* TOP o'quvchilar (bar) */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">🏆 TOP 7 — Coin bo'yicha</h3>
          <BarChart data={stats.top7.map(s => ({ label: s.full_name.split(' ')[0], value: s.coins || 0 }))} height={140} />
        </div>

        {/* Bugun eng faol o'quvchilar — haqiqiy coin_log ma'lumotidan */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-navy-800">🎯 Bugun eng faol o'quvchilar</h3>
            <span className="chip bg-gold/10 text-gold-700 text-[10px]">{stats.activeStudentsPct}% faol (jami)</span>
          </div>
          {stats.activeToday.length === 0 ? (
            <p className="text-sm text-navy-300 text-center py-6">Bugun hali coin harakati bo'lmagan</p>
          ) : (
            <div className="space-y-2">
              {stats.activeToday.map(([name, amount], i) => (
                <div key={name} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition ${i === 0 ? 'bg-gradient-to-r from-gold-100/60 to-gold-50/30' : 'bg-navy-50/60'}`}>
                  <span className={`grid place-items-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < 3 ? 'text-base' : 'bg-gold/15 text-gold-700'}`}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-navy-800 truncate">{name}</span>
                  <span className="chip bg-gold/10 text-gold-700 text-[11px] shrink-0">🪙 {amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eng ko'p sotib olingan Coin Shop sovg'alari — haqiqiy talab, statik ro'yxat emas */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">🎁 Eng ko'p so'ralgan sovg'alar</h3>
          {stats.topShopItems.length === 0 ? (
            <p className="text-sm text-navy-300 text-center py-6">Hali sovg'a sotib olinmagan</p>
          ) : (
            <div className="space-y-2">
              {stats.topShopItems.map(([item, count], i) => (
                <div key={item} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition ${i === 0 ? 'bg-gradient-to-r from-gold-100/60 to-gold-50/30' : 'bg-navy-50/60'}`}>
                  <span className={`grid place-items-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${i < 3 ? 'text-base' : 'bg-gold/15 text-gold-700'}`}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-navy-800 truncate">{item}</span>
                  <span className="chip bg-navy-100 text-navy-600 text-[11px] shrink-0">{count} marta</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coin tarixi */}
      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4">📜 Coin tarixi (oxirgi 20 ta)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">#</th>
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">O'quvchi</th>
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">Miqdor</th>
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">Sabab</th>
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">Kim berdi</th>
                <th className="px-4 py-2.5 text-xs font-bold text-navy-500 uppercase">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {coinLog.slice(-20).reverse().map((l, i) => (
                <tr key={l.id || i} className="border-b border-navy-50 hover:bg-gold/[.02]">
                  <td className="px-4 py-2.5 text-navy-300 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-navy-800">{l.student}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-bold ${(l.amount || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {(l.amount || 0) >= 0 ? '+' : ''}{l.amount} 🪙
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-navy-500">{l.reason}</td>
                  <td className="px-4 py-2.5 text-navy-400">{l.given_by}</td>
                  <td className="px-4 py-2.5 text-navy-400 text-xs font-mono">{l.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
