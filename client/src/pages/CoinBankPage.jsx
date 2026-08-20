import { useEffect, useState } from 'react';
import { PiggyBank, TrendingUp, Lock, Unlock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TIERS = [
  { days: '0–2 kun', rate: '0%', tone: 'bg-navy-100 text-navy-500' },
  { days: '3–6 kun', rate: '+5%', tone: 'bg-amber-100 text-amber-700' },
  { days: '7–29 kun', rate: '+15%', tone: 'bg-emerald-100 text-emerald-700' },
  { days: '30+ kun', rate: '+30%', tone: 'bg-gold/20 text-gold-700' },
];

function daysHeld(depositedAt) {
  return Math.floor((Date.now() - new Date(depositedAt.replace(' ', 'T')).getTime()) / (24 * 60 * 60 * 1000));
}
function tierFor(days) {
  if (days >= 30) return TIERS[3];
  if (days >= 7) return TIERS[2];
  if (days >= 3) return TIERS[1];
  return TIERS[0];
}

export default function CoinBankPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [deposits, setDeposits] = useState(null);
  const [amount, setAmount] = useState(50);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadDeposits(sid) {
    const q = sid ? `?student_id=${sid}` : '';
    setDeposits(await api.get(`/coin-bank${q}`).catch(() => []));
  }

  useEffect(() => {
    if (!isStudent) {
      api.get('/students').then((s) => setStudents(s || [])).catch(() => setStudents([]));
    } else {
      loadDeposits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!isStudent && studentId) loadDeposits(studentId); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStudent = isStudent ? null : students.find((s) => String(s.id) === String(studentId));
  const myCoins = isStudent ? null : currentStudent?.coins;

  async function deposit() {
    setErr(''); setMsg('');
    const amt = Number(amount) || 0;
    if (!isStudent && !studentId) { setErr("O'quvchini tanlang"); return; }
    if (amt <= 0) { setErr("Miqdorni kiriting"); return; }
    setBusy(true);
    try {
      const body = isStudent ? { amount: amt } : { student_id: Number(studentId), amount: amt };
      await api.post('/coin-bank/deposit', body);
      setMsg('✅ Depozit qilindi');
      await loadDeposits(studentId);
      if (!isStudent) { const s = await api.get('/students'); setStudents(s || []); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function withdraw(id) {
    setErr(''); setMsg('');
    setBusy(true);
    try {
      const r = await api.post(`/coin-bank/withdraw/${id}`, {});
      setMsg(`✅ ${r.total} coin qaytarildi (${r.days} kun, foiz: +${r.interest} 🪙)`);
      await loadDeposits(studentId);
      if (!isStudent) { const s = await api.get('/students'); setStudents(s || []); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const activeDeposits = (deposits || []).filter((d) => d.status === 'active');
  const history = (deposits || []).filter((d) => d.status !== 'active');

  return (
    <div>
      <PageHeader icon={PiggyBank} title="Coin bank" subtitle="Coinlaringizni jamg'aring — qancha uzoq saqlasangiz, shuncha ko'p foiz olasiz" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 text-gold-600">
            <TrendingUp size={18} />
            <span className="font-display text-lg text-navy-800">Foiz jadvali</span>
          </div>
          <div className="space-y-2 mb-5">
            {TIERS.map((t) => (
              <div key={t.days} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${t.tone}`}>
                <span className="text-sm font-semibold">{t.days}</span>
                <span className="font-display text-lg">{t.rate}</span>
              </div>
            ))}
          </div>

          {!isStudent && (
            <>
              <label className="label">O'quvchi</label>
              <select className="input mb-4" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— tanlang —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} (🪙 {s.coins || 0})</option>)}
              </select>
            </>
          )}

          {err && <div className="mb-3 rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</div>}
          {msg && <div className="mb-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{msg}</div>}

          <label className="label">Depozit miqdori</label>
          <input type="number" className="input mb-4" value={amount} onWheel={(e) => e.target.blur()} onChange={(e) => setAmount(e.target.value)} />
          <button className="btn-gold w-full py-2.5" disabled={busy} onClick={deposit}><PiggyBank size={16} /> Jamg'armaga qo'yish</button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Lock size={16} className="text-gold" /> Faol depozitlar</h3>
            {deposits === null ? <Spinner /> : activeDeposits.length === 0 ? (
              <Empty icon={PiggyBank} title="Faol depozit yo'q" />
            ) : (
              <div className="space-y-2">
                {activeDeposits.map((d) => {
                  const days = daysHeld(d.deposited_at);
                  const tier = tierFor(days);
                  return (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-800">{d.student_name} — {d.amount} 🪙</div>
                        <div className="text-[11px] text-navy-400">{d.deposited_at.slice(0, 10)} dan beri · {days} kun</div>
                      </div>
                      <span className={`chip text-[10px] shrink-0 ${tier.tone}`}>{tier.rate}</span>
                      <button onClick={() => withdraw(d.id)} disabled={busy} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Unlock size={13} /> Yechish</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-display text-lg text-navy-800 mb-4">Tarix</h3>
            {history.length === 0 ? <p className="text-sm text-navy-400">Hali yopilgan depozit yo'q</p> : (
              <div className="space-y-1.5">
                {history.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/40 px-3 py-2">
                    <span className="text-navy-600">{d.student_name} — {d.amount} 🪙 {d.interest_paid ? `(+${d.interest_paid} foiz)` : ''}</span>
                    <span className="text-[10px] text-navy-400">{d.withdrawn_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
