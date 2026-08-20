import { useEffect, useState } from 'react';
import { Gift, Heart } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const MAX = 1000;
const QUICK = [5, 10, 25, 50];

export default function CoinGiftPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [students, setStudents] = useState(null);
  const [log, setLog] = useState([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function loadAll() {
    const [s, l] = await Promise.all([
      api.get('/students').catch(() => []),
      api.get('/coin-gifts/log').catch(() => []),
    ]);
    setStudents(s || []); setLog(l || []);
  }
  useEffect(() => { loadAll(); }, []);

  const me = isStudent ? students?.find((s) => s.full_name === user.full_name) : null;

  async function send() {
    setErr(''); setMsg('');
    const amt = Number(amount) || 0;
    if (!isStudent && !fromId) { setErr("Yuboruvchini tanlang"); return; }
    if (!toId) { setErr("Qabul qiluvchini tanlang"); return; }
    if (amt <= 0) { setErr("Miqdorni kiriting"); return; }
    if (amt > MAX) { setErr(`Bir martada ko'pi bilan ${MAX} coin!`); return; }
    try {
      const body = isStudent ? { to_student_id: Number(toId), amount: amt, message } : { from_student_id: Number(fromId), to_student_id: Number(toId), amount: amt, message };
      const res = await api.post('/coin-gifts/send', body);
      setMsg(`🎁 ${res.gift.from_name} → ${res.gift.to_name}: ${amt} coin yuborildi!`);
      setMessage('');
      await loadAll();
    } catch (e) { setErr(e.message); }
  }

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gift} title="Coin hadya" subtitle="O'quvchilar bir-biriga coin hadya qilishi mumkin — do'stlik va yordamni rag'batlantiring" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-gold-600">
            <Gift size={18} />
            <span className="font-display text-lg text-navy-800">Hadya yuborish</span>
          </div>

          {err && <div className="mb-4 rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</div>}
          {msg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{msg}</div>}

          {isStudent ? (
            <div className="mb-4 rounded-xl bg-gold/10 border border-gold/20 px-4 py-3 text-sm text-navy-700">
              Sizning balansingiz: <b className="text-gold-700">{me?.coins ?? 0} 🪙</b>
            </div>
          ) : (
            <>
              <label className="label">Kimdan</label>
              <select className="input mb-4" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">— tanlang —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} (🪙 {s.coins || 0})</option>)}
              </select>
            </>
          )}

          <label className="label">Kimga</label>
          <select className="input mb-4" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">— tanlang —</option>
            {students.filter((s) => String(s.id) !== String(isStudent ? me?.id : fromId)).map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} · {s.group_name}</option>
            ))}
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

          <label className="label">Xabar (ixtiyoriy)</label>
          <input className="input mb-5" placeholder="Masalan: yordam berganing uchun rahmat!" value={message} onChange={(e) => setMessage(e.target.value)} />

          <button className="btn-gold w-full py-2.5" onClick={send}><Gift size={16} /> {amount} coin hadya qilish</button>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Heart size={16} className="text-rose-400" /> So'nggi hadyalar</h3>
          {log.length === 0 ? (
            <p className="text-sm text-navy-400">Hozircha hadya yuborilmagan.</p>
          ) : (
            <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
              {log.map((g) => (
                <div key={g.id} className="rounded-xl bg-navy-50/60 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                    {g.from_name} <span className="text-gold-500">→</span> {g.to_name}
                    <span className="ml-auto font-display text-gold-600 shrink-0">{g.amount} 🪙</span>
                  </div>
                  {g.message && <div className="text-xs text-navy-500 mt-0.5">"{g.message}"</div>}
                  <div className="text-[10px] text-navy-400 mt-1">{(g.at || '').slice(0, 16)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
