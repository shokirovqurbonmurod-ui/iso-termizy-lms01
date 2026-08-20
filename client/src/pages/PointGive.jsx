import { useEffect, useState } from 'react';
import { TrendingUp, Star, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const QUICK = [10, 25, 50, 100, 250, 500];
const REASONS = ['📚 Darsga qatnashish', '✅ Uy vazifasi', '🏆 Test natijasi', '🎯 Olimpiada', '👥 Do\'st taklifi', '🔥 Streak bonus', '⭐ Maxsus mukofot'];

export default function PointGive() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [log, setLog] = useState([]);

  async function load() {
    const [s, l] = await Promise.all([
      api.get('/students').catch(() => []),
      api.get('/coin_log').catch(() => []),
    ]);
    setStudents(s || []);
    setLog((l || []).slice(-15).reverse());
  }
  useEffect(() => { load(); }, []);

  async function give() {
    setErr(''); setMsg('');
    if (!selected) { setErr("O'quvchini tanlang"); return; }
    if (amount < 1) { setErr('Miqdor 1 dan kam bo\'lmasin'); return; }
    try {
      await api.post('/coins/give', {
        student_id: Number(selected), amount: Number(amount),
        reason: reason || 'Pont mukofoti',
      });
      setMsg(`✅ ${amount} pont berildi!`);
      setAmount(10); setReason('');
      await load();
    } catch (e) { setErr(e.message); }
  }

  const current = students.find(s => s.id === Number(selected));

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Pont berish" subtitle="O'quvchilarga pont (va coin) bering — cheksiz" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Berish formasi */}
        <div className="card p-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">⭐ Yangi pont mukofoti</h3>

          <label className="label">O'quvchi</label>
          <select className="input !py-3 mb-4" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— O'quvchini tanlang —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name} · {s.group_name} (⭐ {s.points || 0})</option>
            ))}
          </select>

          {current && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-50/60 mb-4">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold">{current.full_name[0]}</div>
              <div className="flex-1">
                <div className="font-bold text-navy-800">{current.full_name}</div>
                <div className="text-xs text-navy-400">{current.group_name} · {current.level}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gold-600">🪙 {(current.coins || 0).toLocaleString()}</div>
                <div className="text-sm font-bold text-blue-600">⭐ {(current.points || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          <label className="label">PONT MIQDORI</label>
          <div className="flex items-center gap-3 mb-2">
            <input type="range" min="1" max="1000" value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="flex-1 accent-[#3498DB]" />
            <div className="font-display text-3xl text-blue-600 w-20 text-right">{amount}</div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK.map(q => (
              <button key={q} onClick={() => setAmount(q)}
                className={`rounded-xl border px-3 py-1.5 text-sm font-bold transition ${
                  amount === q ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-navy-100 text-navy-500 hover:border-blue-300'}`}>
                {q} ⭐
              </button>
            ))}
          </div>

          <label className="label">SABAB</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  reason === r ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-navy-50 text-navy-500 hover:bg-blue-50'}`}>
                {r}
              </button>
            ))}
          </div>
          <input className="input !py-2.5 mb-4" placeholder="Yoki o'zingiz yozing..." value={reason} onChange={e => setReason(e.target.value)} />

          {err && <div className="mb-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
          {msg && <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3">{msg}</div>}

          <button onClick={give} className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2">
            <Star size={18} /> {amount} pont berish
          </button>
        </div>

        {/* Tarix */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4">📜 So'nggi mukofotlar</h3>
          <div className="space-y-2">
            {log.length === 0 ? (
              <div className="text-center text-navy-400 text-sm py-10">Hali mukofot berilmagan</div>
            ) : log.map((l, i) => (
              <div key={l.id || i} className="flex items-center gap-3 rounded-xl bg-navy-50/40 px-4 py-3 hover:bg-navy-50 transition">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm shadow">
                  +{l.amount}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">{l.student}</div>
                  <div className="text-xs text-navy-400">{l.reason} · {l.given_by}</div>
                </div>
                <div className="text-xs text-navy-300">{(l.at || '').slice(5, 16)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
