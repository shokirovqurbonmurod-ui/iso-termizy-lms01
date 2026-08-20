import { useEffect, useMemo, useState } from 'react';
import { Repeat, Coins, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const DIRECTIONS = [
  { value: 'coins_to_points', label: 'Coin → Pont', description: 'Coinlaringizni pontga aylantiring' },
  { value: 'points_to_coins', label: 'Pont → Coin', description: 'Pontlaringizni coinlarga aylantiring' },
  { value: 'to_general', label: "Student → Umumiy", description: "O'quvchidan umumiy hisobga coin ko'chirish" },
  { value: 'from_general', label: "Umumiy → Student", description: "Umumiy hisobdan o'quvchiga coin ko'chirish" },
];

export default function CoinExchange() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [general, setGeneral] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [direction, setDirection] = useState('coins_to_points');
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/students').catch(() => []), api.get('/general_coins').catch(() => [])])
      .then(([rows, gen]) => {
        setStudents(rows || []);
        setGeneral((Array.isArray(gen) && gen[0]) || null);
        setLoading(false);
      })
      .catch(() => {
        setStudents([]);
        setGeneral(null);
        setLoading(false);
      });
  }, []);

  const current = useMemo(() => {
    if (!students) return null;
    if (user.role === 'student') {
      return students.find((s) => s.full_name === user.full_name) || null;
    }
    return students.find((s) => String(s.id) === String(studentId)) || null;
  }, [students, studentId, user]);

  const maxAmount = useMemo(() => {
    if (!current) return 100;
    if (direction === 'coins_to_points' || direction === 'to_general') {
      return Math.max(1, Number(current.coins) || 0);
    }
    if (direction === 'points_to_coins') {
      return Math.max(1, Number(current.points) || 0);
    }
    if (direction === 'from_general') {
      return Math.max(1, Number(general?.coins) || 0);
    }
    return 100;
  }, [current, direction]);

  const valueLabel = direction === 'coins_to_points' ? 'Coin miqdori' : 'Pont miqdori';
  const preview = useMemo(() => {
    if (!current) return '';
    if (direction === 'coins_to_points') {
      return `${amount} coin → ${ (Number(amount) / 10).toFixed(2) } point`;
    }
    if (direction === 'points_to_coins') {
      return `${amount} point → ${ (Number(amount) * 10).toLocaleString() } coin`;
    }
    if (direction === 'to_general') {
      return `${amount} coin → umumiy hisobga ko'chiriladi`;
    }
    if (direction === 'from_general') {
      return `Umumiydan ${amount} coin → ${current.full_name}`;
    }
    return '';
  }, [direction, amount, current]);

  async function exchange() {
    setErr('');
    setMsg('');
    if (!current) { setErr("O'quvchini tanlang"); return; }
    const amt = Number(amount) || 0;
    if (amt <= 0) { setErr('Miqdor 0 dan katta bo‘lishi kerak'); return; }
    if (amt > maxAmount) { setErr(`Mavjud miqdor yetarli emas (${maxAmount})`); return; }
    try {
      const res = await api.post('/coins/exchange', {
        student_id: Number(current.id),
        direction,
        amount: amt,
      });
      setMsg(`✅ ${current.full_name} uchun almashuv bajarildi.`);
      if (res.student) {
        setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
      }
      if (res.general) setGeneral(res.general);
    } catch (error) {
      setErr(error.message);
    }
  }

  if (loading || students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Repeat} title="Coin almashuvi" subtitle="Coin va pontlarni osonlik bilan almashtiring" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-gold-600">
            <Repeat size={18} />
            <span className="font-display text-lg text-navy-800">Almashuv</span>
          </div>

          {err && <div className="mb-4 rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</div>}
          {msg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{msg}</div>}

          {user.role !== 'student' && (
            <>
              <label className="label">O'quvchini tanlang</label>
              <select className="input mb-4" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— tanlang —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} · {s.group_name} (🪙 {s.coins} · ⭐ {s.points})</option>
                ))}
              </select>
            </>
          )}

          {current ? (
            <div className="grid gap-3 mb-5">
              <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4">
                <div className="text-sm text-navy-500">O'quvchi</div>
                <div className="font-bold text-navy-800">{current.full_name}</div>
                <div className="text-xs text-navy-400">{current.group_name}</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-navy-100 bg-white p-4">
                  <div className="text-xs text-navy-400">Coin</div>
                  <div className="text-3xl font-display text-gold-600">🪙 {Number(current.coins || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-navy-100 bg-white p-4">
                  <div className="text-xs text-navy-400">Pont</div>
                  <div className="text-3xl font-display text-blue-600">⭐ {Number(current.points || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-dashed border-navy-200 bg-navy-50 p-4 text-sm text-navy-500">
              O'quvchi tanlanmagan. Tanlang yoki o'zingizning balansingiz ko'rsatilishini kuting.
            </div>
          )}

          <div className="mb-4">
            <label className="label">Yo'nalish</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIRECTIONS.map((dir) => (
                <button key={dir.value} onClick={() => setDirection(dir.value)} type="button"
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${direction === dir.value ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 bg-white text-navy-700 hover:border-gold'}`}>
                  <div className="font-semibold">{dir.label}</div>
                  <div className="text-xs text-navy-400">{dir.description}</div>
                </button>
              ))}
            </div>
          </div>

          {preview && <div className="mb-4 text-sm text-navy-500">Preview: {preview}</div>}

          <label className="label">{valueLabel}</label>
          <div className="flex items-center gap-3 mb-4">
            <input className="flex-1 accent-[#C6A15B]" type="range" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <div className="w-20 text-right font-display text-2xl text-gold-600">{amount}</div>
          </div>
          <div className="text-xs text-navy-400 mb-5">Maksimal: {maxAmount.toLocaleString()}</div>

          <button onClick={exchange} className="btn-gold w-full py-3 flex items-center justify-center gap-2">
            <Repeat size={18} /> Almashuvni bajarish
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-blue-600">
            <Star size={18} />
            <span className="font-display text-lg text-navy-800">Nima uchun almashuv?</span>
          </div>
          <div className="space-y-4 text-sm text-navy-500">
            <p>Coin va pont balansi o'rtasida tez almashuv. Bir coin = bir pont hisobda saqlanadi.</p>
            <p>O'quvchilar coinlarni rag'batlantirish uchun to'playdi, keyin ulardan bonuslar yoki boshqa sovrinlar uchun foydalanishi mumkin.</p>
            <p>Direktorlar va ma'muriyat hozircha faqat O'quvchilarning balansini tahrir qilishi mumkin.</p>
            {general && (
              <div className="mt-3 rounded-2xl border border-navy-100 bg-white p-3 text-sm">
                <div className="text-xs text-navy-400">Umumiy hisob</div>
                <div className="font-bold text-navy-800">{general.name} · 🪙 {Number(general.coins || 0).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
