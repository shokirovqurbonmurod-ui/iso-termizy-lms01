import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Boxes, Wallet, CreditCard, UserSearch, TrendingUp, LayoutDashboard, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { compactMoney, money, statusStyle } from '../lib/format.js';

const TONES = [
  ['from-gold-400/20 to-gold-100/10', 'text-gold-600', 'bg-gold-400/15'],
  ['from-blue-400/20 to-blue-100/10', 'text-blue-600', 'bg-blue-400/15'],
  ['from-emerald-400/20 to-emerald-100/10', 'text-emerald-600', 'bg-emerald-400/15'],
  ['from-violet-400/20 to-violet-100/10', 'text-violet-600', 'bg-violet-400/15'],
  ['from-rose-400/20 to-rose-100/10', 'text-rose-600', 'bg-rose-400/15'],
  ['from-cyan-400/20 to-cyan-100/10', 'text-cyan-600', 'bg-cyan-400/15'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [board, setBoard] = useState([]);
  const [ann, setAnn] = useState([]);
  const [pay, setPay] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/stats').catch(() => null),
      api.get('/leaderboard').catch(() => []),
      api.get('/announcements').catch(() => []),
      api.get('/payments').catch(() => []),
    ]).then(([s, b, a, p]) => { setD(s); setBoard(b||[]); setAnn(a||[]); setPay(p||[]); });
  }, []);

  if (!d) return <Spinner />;

  const cards = [
    { icon: Users, label: "O'quvchilar", value: d.students, hint: `${d.activeStudents} faol` },
    { icon: GraduationCap, label: "O'qituvchilar", value: d.teachers },
    { icon: Boxes, label: 'Guruhlar', value: d.groups },
    { icon: Wallet, label: 'Daromad', value: compactMoney(d.revenue) },
    { icon: CreditCard, label: "Kutilayotgan", value: d.pendingPayments },
    { icon: UserSearch, label: 'Lidlar', value: d.leads },
  ];

  // Student o'z paneli
  if (user.role === 'student') return <StudentPanel user={user} />;

  const firstName = user.full_name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

  return (
    <div>
      {/* Hero greeting */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-900 border-0 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -left-8 bottom-0 w-40 h-40 rounded-full bg-gold/5 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gold/20 text-3xl">
              <Sparkles size={28} className="text-gold-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white">{greeting}, {firstName}!</h1>
              <p className="text-navy-200 text-sm mt-0.5 max-w-lg">ISO Termizy platformangizga xush kelibsiz. Yangi AI yordamchi, CRM va LMS funksiyalari bilan ishlashingizni soddalashtiraylik.</p>
            </div>
          </div>
          <button onClick={() => navigate('/app/ai-assistant')} className="btn bg-white/95 text-navy-800 hover:bg-white shrink-0">
            <Sparkles size={16} className="text-gold-500" /> AI yordamchiga o'tish
          </button>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
          {[
            ['HOZIRGI BO\'LIM', 'Command Center'],
            ['SO\'NGGI YANGILIK', 'AI yordamchi va CRM'],
            ['DAVOM ETISH', 'Monitoring va analytics'],
            ['YORDAM', 'Tezkor chat'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/[.07] border border-white/10 px-3.5 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-navy-300/70">{k}</div>
              <div className="text-sm font-semibold text-white mt-0.5 truncate">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
        {cards.map((c, i) => {
          const [gradient, textColor, iconBg] = TONES[i % TONES.length];
          return (
            <div key={c.label} className="card stat-glow p-5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br ${gradient}`}>
                  <c.icon size={20} className={textColor} />
                </div>
                {c.hint && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{c.hint}</span>}
              </div>
              <div className="font-display text-2xl text-navy-800">{c.value}</div>
              <div className="text-sm text-navy-400 mt-0.5">{c.label}</div>
            </div>
          );
        })}
        <button onClick={() => navigate('/app/ai-assistant')}
          className="text-left rounded-[28px] shadow-ios p-5 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 text-white relative overflow-hidden group transition-transform duration-200 ease-ios hover:-translate-y-0.5">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between mb-3">
            <div className="grid place-items-center w-11 h-11 rounded-xl bg-white/15"><Sparkles size={20} /></div>
            <ArrowRight size={16} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="relative text-[10px] font-bold uppercase tracking-wider text-white/70">AI Yordamchi</div>
          <div className="relative font-display text-lg leading-tight mt-0.5">ISO Termizy AI</div>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-navy-800">🏆 TOP o'quvchilar</h3>
            <span className="chip bg-gold/10 text-gold-700">Ball bo'yicha</span>
          </div>
          <div className="space-y-1">
            {board.slice(0, 7).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-navy-50 transition animate-slide" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`grid place-items-center w-8 h-8 rounded-lg text-sm font-bold ${i < 3 ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-white shadow-sm' : 'bg-navy-100 text-navy-500'}`}>{i + 1}</div>
                <div className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-white text-sm font-bold shadow-sm">{s.full_name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                  <div className="text-xs text-navy-400">{s.group_name}</div>
                </div>
                <span className="chip bg-gold/10 text-gold-700">{s.level}</span>
                <div className="text-sm font-bold text-navy-700 w-16 text-right tabular-nums">⚡ {s.points}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📢 E'lonlar</h3>
          <div className="space-y-3">
            {ann.slice(0, 4).map((a, i) => (
              <div key={a.id} className={`rounded-xl px-4 py-3 border animate-fade ${a.type === 'warn' ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50' : 'border-navy-100 bg-gradient-to-r from-navy-50/50 to-white'}`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="text-sm font-semibold text-navy-800">{a.title}</div>
                <div className="text-xs text-navy-500 mt-0.5 line-clamp-2">{a.body}</div>
                <div className="text-[11px] text-navy-400 mt-1.5">{a.author} · {a.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-navy-800">💳 So'nggi to'lovlar</h3>
          <span className="text-xs text-navy-400">{pay.length} ta yozuv</span>
        </div>
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                <th className="px-4 py-3 font-semibold text-navy-400">O'quvchi</th>
                <th className="font-semibold text-navy-400">Guruh</th>
                <th className="font-semibold text-navy-400">Summa</th>
                <th className="font-semibold text-navy-400">Usul</th>
                <th className="font-semibold text-navy-400">Holat</th>
              </tr>
            </thead>
            <tbody>
              {pay.slice(0, 8).map((p) => (
                <tr key={p.id} className="border-b border-navy-50">
                  <td className="px-4 py-3 font-medium text-navy-700">{p.student}</td>
                  <td className="text-navy-500">{p.group_name}</td>
                  <td className="font-bold text-navy-800">{money(p.amount)}</td>
                  <td><span className="chip bg-navy-50 text-navy-600">{p.method || '—'}</span></td>
                  <td><span className={`chip ${statusStyle(p.status)}`}>{p.status === 'paid' ? "✓ To'langan" : '⏳ Kutilmoqda'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function StudentPanel({ user }) {
  const [st, setSt] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/students').catch(() => []),
      api.get('/student_timeline').catch(() => []),
      api.get('/lessons').catch(() => []),
    ]).then(([students, tl, ls]) => {
      const me = (students || []).find((s) => s.full_name === user.full_name);
      setSt(me || { full_name: user.full_name, coins: 0, points: 0, progress: 0, streak: 0, level: '—', group_name: '—' });
      setTimeline((tl || []).filter((t) => t.student === user.full_name).slice(-10).reverse());
      setLessons((ls || []).filter((l) => me && l.group_name === me.group_name).slice(0, 5));
    });
  }, [user]);

  if (!st) return <Spinner />;

  return (
    <div>
      {/* Hero */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-900 border-0 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-2xl font-bold shadow-lg">
            {st.full_name[0]}
          </div>
          <div>
            <h1 className="font-display text-2xl text-white">Salom, {st.full_name.split(' ')[0]}!</h1>
            <p className="text-navy-200 text-sm mt-0.5">{st.group_name} · {st.level}</p>
          </div>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card stat-glow p-5 text-center">
          <div className="text-3xl mb-1">🪙</div>
          <div className="font-display text-3xl text-gold-600">{(st.coins || 0).toLocaleString()}</div>
          <div className="text-sm text-navy-400">Coinlar</div>
        </div>
        <div className="card stat-glow p-5 text-center">
          <div className="text-3xl mb-1">⚡</div>
          <div className="font-display text-3xl text-navy-800">{(st.points || 0).toLocaleString()}</div>
          <div className="text-sm text-navy-400">Ballar</div>
        </div>
        <div className="card stat-glow p-5 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="font-display text-3xl text-orange-600">{st.streak || 0}</div>
          <div className="text-sm text-navy-400">Streak (kun)</div>
        </div>
        <div className="card stat-glow p-5 text-center">
          <div className="text-3xl mb-1">📈</div>
          <div className="font-display text-3xl text-emerald-600">{st.progress || 0}%</div>
          <div className="text-sm text-navy-400">Progress</div>
          <div className="mt-2 h-2 rounded-full bg-navy-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: (st.progress || 0) + '%' }} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Darslar */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📚 Keyingi darslar</h3>
          {lessons.length === 0 ? (
            <p className="text-sm text-navy-400">Hozircha darslar yo'q</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                  <span className="chip bg-blue-100 text-blue-700">{l.subject}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{l.title}</div>
                    <div className="text-xs text-navy-400">{l.date} · {l.teacher}</div>
                  </div>
                  {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer" className="chip bg-violet-100 text-violet-700">📹 Video</a>}
                  {l.coin_reward > 0 && <span className="chip bg-gold/10 text-gold-700">🪙 +{l.coin_reward}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📜 Mening tarixim</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-navy-400">Hozircha tarix yo'q</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((t) => {
                const typeColor = {
                  enrollment: 'bg-blue-100 text-blue-700',
                  exam: 'bg-violet-100 text-violet-700',
                  coin: 'bg-gold/10 text-gold-700',
                  level_up: 'bg-emerald-100 text-emerald-700',
                  certificate: 'bg-amber-100 text-amber-700',
                  achievement: 'bg-rose-100 text-rose-700',
                };
                return (
                  <div key={t.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-navy-800">{t.event}</div>
                      <div className="text-xs text-navy-500">{t.detail}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`chip text-[10px] ${typeColor[t.type] || 'bg-navy-100 text-navy-600'}`}>{t.type}</span>
                        <span className="text-[11px] text-navy-400">{t.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
