import { useEffect, useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

const MAX = 10000;
const QUICK = [5, 10, 20, 40];

export default function CoinGive() {
  const [students, setStudents] = useState(null);
  const [log, setLog] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  async function loadLog() { setLog(await api.get('/coins/log').catch(() => [])); }
  useEffect(() => {
    api.get('/students').then((s) => { setStudents(s); }).catch(() => setStudents([]));
    loadLog();
  }, []);

  async function give() {
    setErr(''); setMsg(null);
    const amt = Number(amount) || 0;
    if (!studentId) { setErr("O'quvchini tanlang"); return; }
    if (amt <= 0) { setErr('Coin miqdorini kiriting'); return; }
    if (amt > MAX) { setErr(`Bir martada ko'pi bilan ${MAX} coin!`); return; }
    try {
      const res = await api.post('/coins/give', { student_id: Number(studentId), amount: amt, reason });
      setMsg(`✅ ${res.student.full_name} ga ${amt} coin berildi (jami: ${res.student.coins} 🪙)`);
      setReason(''); loadLog();
      setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
    } catch (e) { setErr(e.message); }
  }

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Coins} title="Coin berish" subtitle={`Coin va Pont bering — cheksiz — bir martada eng ko'pi ${MAX} coin`} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Give form */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-gold-600">
            <Sparkles size={18} />
            <span className="font-display text-lg text-navy-800">Yangi mukofot</span>
          </div>

          {err && <div className="mb-4 rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</div>}
          {msg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{msg}</div>}

          <label className="label">O'quvchi</label>
          <select className="input mb-4" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">— tanlang —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.group_name} (🪙 {s.coins})</option>)}
          </select>

          <label className="label">Coin miqdori (maks {MAX})</label>
          <div className="flex items-center gap-2 mb-3">
            <input type="range" min="1" max={MAX} value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 accent-[#C6A15B]" />
            <div className="w-16 text-center font-display text-2xl text-gold-600">{amount}</div>
          </div>
          <div className="flex gap-2 mb-4">
            {QUICK.map((q) => (
              <button key={q} onClick={() => setAmount(q)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold transition ${Number(amount) === q ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-600 hover:border-gold'}`}>
                {q} 🪙
              </button>
            ))}
          </div>

          <label className="label">Sabab (ixtiyoriy)</label>
          <input className="input mb-5" placeholder="Masalan: a'lo topshiriq, davomat, olimpiada..." value={reason} onChange={(e) => setReason(e.target.value)} />

          <button className="btn-gold w-full py-2.5" onClick={give}><Coins size={16} /> {amount} coin berish</button>
        </div>

        {/* Recent log */}
        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">So'nggi mukofotlar</h3>
          {log.length === 0 ? (
            <p className="text-sm text-navy-400">Hozircha coin berilmagan.</p>
          ) : (
            <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
              {log.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
                  <div className="grid place-items-center w-9 h-9 rounded-full bg-gold/15 text-gold-600 font-bold text-sm">+{c.amount}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{c.student}</div>
                    <div className="text-xs text-navy-400 truncate">{c.reason || '—'} · {c.given_by}</div>
                  </div>
                  <div className="text-[11px] text-navy-400 whitespace-nowrap">{(c.at || '').slice(5, 16)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
