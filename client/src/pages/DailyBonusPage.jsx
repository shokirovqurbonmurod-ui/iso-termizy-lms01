import { useEffect, useMemo, useState } from 'react';
import { Coins, Flame, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const REWARDS = [5, 10, 15, 20, 25, 35, 50]; // 1-kundan 7-kungacha, keyin qayta boshlanadi
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export default function DailyBonusPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [claiming, setClaiming] = useState(false);

  async function load() {
    const r = await api.get('/daily_bonus?limit=2000').catch(() => []);
    setRows((r || []).filter((x) => x.student === user.full_name).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const last = rows?.[0];
  const claimedToday = last?.date === todayStr();
  const nextStreak = useMemo(() => {
    if (!last) return 1;
    if (last.date === todayStr()) return last.streak_day || 1;
    if (last.date === yesterdayStr()) return (last.streak_day || 0) + 1;
    return 1;
  }, [last]);
  const nextReward = REWARDS[(nextStreak - 1) % REWARDS.length];

  async function claim() {
    setClaiming(true);
    try {
      await api.post('/daily-bonus/claim', {});
      await load();
    } catch (e) { alert(e.message); }
    setClaiming(false);
  }

  if (rows === null) return <Spinner />;

  const currentStreak = claimedToday ? (last.streak_day || 1) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader icon={Coins} title="Kunlik bonus" subtitle="Har kuni kirib, streakingizni davom ettiring va coin yutib oling" />

      <div className="card p-6 mb-6 text-center">
        <div className="flex items-center justify-center gap-2 text-navy-400 text-sm mb-4">
          <Flame size={16} className="text-orange-500" /> Joriy streak: <span className="font-bold text-navy-700">{currentStreak || nextStreak - 1} kun</span>
        </div>
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {REWARDS.map((coin, i) => {
            const day = i + 1;
            const done = day < nextStreak || (day === nextStreak && claimedToday);
            const isNext = day === nextStreak && !claimedToday;
            return (
              <div key={day} className={`w-16 rounded-2xl p-2.5 text-center border-2 transition ${
                done ? 'bg-emerald-50 border-emerald-300' : isNext ? 'bg-gold/10 border-gold-400 animate-pulse' : 'bg-navy-50 border-navy-100 opacity-60'
              }`}>
                <div className="text-[10px] font-bold text-navy-400 mb-1">{day}-kun</div>
                {done ? <Check size={16} className="text-emerald-600 mx-auto" /> : <div className="text-xs font-bold text-gold-600">🪙{coin}</div>}
              </div>
            );
          })}
        </div>
        {claimedToday ? (
          <div className="inline-flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 rounded-xl px-5 py-3">
            <Check size={18} /> Bugungi bonus olindi — ertaga qaytib keling!
          </div>
        ) : (
          <button onClick={claim} disabled={claiming} className="btn-gold !px-8 !py-3 text-base">
            {claiming ? 'Olinmoqda...' : `🎁 Bugungi bonusni olish (+${nextReward} coin)`}
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">Tarix</h3>
          <div className="space-y-1.5">
            {rows.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5 text-sm">
                <span className="text-navy-600">{r.date} · {r.streak_day}-kun</span>
                <span className="font-bold text-gold-600">+{r.coins_awarded} coin</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
