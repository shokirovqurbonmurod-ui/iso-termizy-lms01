import { useEffect, useMemo, useState } from 'react';
import { Trophy, Crown, Medal, Coins, Star, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { isAdmin } from '../config/roles.js';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MEDALS = ['🥇', '🥈', '🥉'];

function monthLabel(m) {
  const [y, mo] = m.split('-');
  return `${MONTHS[Number(mo) - 1]} ${y}`;
}
function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i >= -6; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}

export default function EmployeeOfMonth() {
  const { user } = useAuth();
  const canAnnounce = isAdmin(user.role);
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(monthOptions[0]);
  const [ranking, setRanking] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function load() {
    const [r, h] = await Promise.all([
      api.get(`/employee-of-month/ranking?month=${month}`).catch(() => ({ ranking: [] })),
      api.get('/employee-of-month/history').catch(() => []),
    ]);
    setRanking(r.ranking || []);
    setHistory((h || []).sort((a, b) => b.month.localeCompare(a.month)));
  }
  useEffect(() => { load(); setNote(''); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentWinner = history.find((h) => h.month === month);

  async function announce(staff, score) {
    setBusy(true);
    try {
      await api.post('/employee-of-month/announce', { month, staff, note, score });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <PageHeader icon={Trophy} title="Xodim oyi" subtitle="Coin, dars bahosi va ish soatlariga asoslangan avtomatik reyting" />

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {monthOptions.map((m) => (
          <button key={m} onClick={() => setMonth(m)}
            className={`shrink-0 chip text-xs transition ${month === m ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {currentWinner && (
        <div className="card p-6 mb-6 bg-gradient-to-br from-gold-50 to-white border-gold/30 text-center">
          <div className="text-4xl mb-2">👑</div>
          <div className="font-display text-2xl text-navy-800">{currentWinner.staff}</div>
          <div className="text-sm text-navy-400">{monthLabel(month)} oyining xodimi</div>
          {currentWinner.note && <p className="text-sm text-navy-500 mt-2 italic">"{currentWinner.note}"</p>}
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Crown size={18} className="text-gold" /> {monthLabel(month)} reytingi</h3>
        {ranking === null ? <Spinner /> : ranking.length === 0 ? (
          <Empty icon={Trophy} title="Ma'lumot yo'q" />
        ) : (
          <div className="space-y-2">
            {ranking.slice(0, 15).map((r, i) => (
              <div key={r.teacher} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${i < 3 ? 'bg-gold/[.06] border border-gold/20' : 'bg-navy-50/60'}`}>
                <div className="w-8 text-center font-display text-lg shrink-0">{MEDALS[i] || i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800 truncate">{r.teacher}</div>
                  <div className="flex items-center gap-3 text-[11px] text-navy-400 mt-0.5">
                    <span className="flex items-center gap-1"><Coins size={11} className="text-gold-500" /> {r.coins}</span>
                    <span className="flex items-center gap-1"><Star size={11} className="text-amber-500" /> {r.avgRating || '—'}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {r.hours} soat</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg text-navy-800">{r.score}</div>
                  <div className="text-[9px] text-navy-400">ball</div>
                </div>
                {canAnnounce && (
                  <button onClick={() => announce(r.teacher, r.score)} disabled={busy || currentWinner?.staff === r.teacher}
                    className="btn-gold !py-1.5 !px-3 text-xs shrink-0">
                    {currentWinner?.staff === r.teacher ? "✅ E'lon qilingan" : "E'lon qilish"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canAnnounce && (
          <input className="input !py-2.5 mt-4 text-sm" placeholder="E'lon uchun izoh (ixtiyoriy)..." value={note} onChange={(e) => setNote(e.target.value)} />
        )}
      </div>

      {history.length > 0 && (
        <div className="card p-5 mt-6">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Medal size={18} className="text-gold" /> Zal — o'tgan g'oliblar</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((h) => (
              <div key={h.month} className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-sm font-bold text-navy-800">{h.staff}</div>
                <div className="text-[11px] text-navy-400">{monthLabel(h.month)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
