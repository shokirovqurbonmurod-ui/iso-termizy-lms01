import { useEffect, useState } from 'react';
import { Coins, Sparkles, Trophy, Medal } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

const MAX = 5000;
const QUICK = [10, 25, 50, 100];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function TeacherCoins() {
  const [teachers, setTeachers] = useState(null);
  const [board, setBoard] = useState([]);
  const [log, setLog] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [amount, setAmount] = useState(20);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  async function loadAll() {
    const [t, b, l] = await Promise.all([
      api.get('/teachers').catch(() => []),
      api.get('/teacher-coins/leaderboard').catch(() => []),
      api.get('/teacher-coins/log').catch(() => []),
    ]);
    setTeachers(t); setBoard(b); setLog(l);
  }
  useEffect(() => { loadAll(); }, []);

  async function give() {
    setErr(''); setMsg(null);
    const amt = Number(amount) || 0;
    if (!teacherId) { setErr("O'qituvchini tanlang"); return; }
    if (amt <= 0) { setErr('Coin miqdorini kiriting'); return; }
    if (amt > MAX) { setErr(`Bir martada ko'pi bilan ${MAX} coin!`); return; }
    try {
      const res = await api.post('/teacher-coins/give', { teacher_id: Number(teacherId), amount: amt, reason });
      setMsg(`✅ ${res.teacher.full_name} ga ${amt} coin berildi (jami: ${res.teacher.coins} 🪙)`);
      setReason('');
      await loadAll();
    } catch (e) { setErr(e.message); }
  }

  if (teachers === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Coins} title="Ustoz coinlari" subtitle="O'qituvchilarni mukofotlang — reyting va yutuqlar bilan gamifikatsiya" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-gold-600">
            <Sparkles size={18} />
            <span className="font-display text-lg text-navy-800">Yangi mukofot</span>
          </div>

          {err && <div className="mb-4 rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</div>}
          {msg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{msg}</div>}

          <label className="label">O'qituvchi</label>
          <select className="input mb-4" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— tanlang —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} (🪙 {t.coins || 0})</option>)}
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
          <input className="input mb-5" placeholder="Masalan: eng yuqori reyting, ekstra dars, olimpiada tayyorgarligi..." value={reason} onChange={(e) => setReason(e.target.value)} />

          <button className="btn-gold w-full py-2.5" onClick={give}><Coins size={16} /> {amount} coin berish</button>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Trophy size={18} className="text-gold" /> Lidersbord</h3>
          {board.length === 0 ? <p className="text-sm text-navy-400">Hozircha ma'lumot yo'q</p> : (
            <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
              {board.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i < 3 ? 'bg-gold/[.06] border border-gold/20' : 'bg-navy-50/60'}`}>
                  <div className="w-7 text-center font-display text-lg">{MEDALS[i] || i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{t.full_name}</div>
                    <div className="text-[10px] text-navy-400">{t.level || ''} {t.rating ? `· ⭐ ${t.rating}` : ''}</div>
                  </div>
                  <div className="font-display text-gold-600 shrink-0">{t.coins} 🪙</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Medal size={18} className="text-gold" /> So'nggi mukofotlar</h3>
          {log.length === 0 ? <p className="text-sm text-navy-400">Hozircha coin berilmagan.</p> : (
            <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
              {log.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
                  <div className="grid place-items-center w-9 h-9 rounded-full bg-gold/15 text-gold-600 font-bold text-sm shrink-0">+{c.amount}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{c.teacher}</div>
                    <div className="text-xs text-navy-400 truncate">{c.reason || '—'} · {c.given_by}</div>
                  </div>
                  <div className="text-[11px] text-navy-400 whitespace-nowrap shrink-0">{(c.at || '').slice(5, 16)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
