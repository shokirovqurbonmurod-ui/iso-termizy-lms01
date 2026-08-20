import { useEffect, useMemo, useState } from 'react';
import { Gift, Cake, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const DEFAULT_BONUS = 50;

function monthDay(dateStr) { return dateStr ? dateStr.slice(5, 10) : null; } // "MM-DD"
function daysUntilBirthday(birthDate) {
  if (!birthDate) return 999;
  const today = new Date(new Date().toDateString());
  const [, m, d] = birthDate.split('-').map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next - today) / 86400000);
}

export default function BirthdayBonusPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [students, setStudents] = useState(null);
  const [given, setGiven] = useState([]);
  const [giving, setGiving] = useState(null);

  async function load() {
    const [s, g] = await Promise.all([
      api.get('/students').catch(() => []),
      api.get('/birthday_bonus?limit=2000').catch(() => []),
    ]);
    setStudents(s || []); setGiven(g || []);
  }
  useEffect(() => { load(); }, []);

  const todayMD = monthDay(new Date().toISOString().slice(0, 10));
  const thisYear = new Date().getFullYear();

  const todayList = useMemo(() => (students || []).filter((s) => s.birth_date && monthDay(s.birth_date) === todayMD), [students, todayMD]);
  const upcoming = useMemo(() => (students || [])
    .filter((s) => s.birth_date && monthDay(s.birth_date) !== todayMD)
    .map((s) => ({ ...s, daysLeft: daysUntilBirthday(s.birth_date) }))
    .filter((s) => s.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft), [students, todayMD]);

  function alreadyGiven(student) {
    return given.some((g) => g.student === student.full_name && (g.date || '').startsWith(String(thisYear)));
  }

  async function giveBonus(student) {
    setGiving(student.id);
    try {
      await api.post('/birthday_bonus', {
        student: student.full_name, birth_date: student.birth_date, bonus_coins: DEFAULT_BONUS,
        status: 'given', date: new Date().toISOString().slice(0, 10),
      });
      await api.post('/coins/give', { student_id: student.id, amount: DEFAULT_BONUS, reason: "Tug'ilgan kun sovg'asi" }).catch(() => {});
      await load();
    } catch (e) { alert(e.message); }
    setGiving(null);
  }

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gift} title="Tug'ilgan kun" subtitle="Bugungi va yaqinlashayotgan tug'ilgan kunlar" />

      <div className="mb-8">
        <h3 className="font-display text-lg text-navy-800 mb-3 flex items-center gap-2"><Cake size={18} className="text-rose-500" /> Bugun ({todayList.length})</h3>
        {todayList.length === 0 ? <Empty icon={Cake} title="Bugun tug'ilgan kun yo'q" /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayList.map((s) => {
              const done = alreadyGiven(s);
              return (
                <div key={s.id} className="card p-4 text-center">
                  <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-gold-400 text-white text-xl font-bold mx-auto mb-2">{s.full_name[0]}</div>
                  <div className="text-sm font-bold text-navy-800 mb-0.5">{s.full_name}</div>
                  <div className="text-xs text-navy-400 mb-3">{s.group_name}</div>
                  {canManage ? (
                    done ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Sovg'a berildi</div>
                    ) : (
                      <button onClick={() => giveBonus(s)} disabled={giving === s.id} className="btn-gold w-full !py-1.5 text-xs">
                        {giving === s.id ? '...' : `🎂 Sovg'a berish (+${DEFAULT_BONUS} coin)`}
                      </button>
                    )
                  ) : (
                    <div className="text-xs text-navy-400">{done ? "🎉 Sovg'a berildi!" : "Tabriklaymiz!"}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-lg text-navy-800 mb-3">Yaqinlashayotgan (30 kun ichida)</h3>
        {upcoming.length === 0 ? <Empty icon={Gift} title="Yaqin kunlarda tug'ilgan kun yo'q" /> : (
          <div className="space-y-1.5">
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{s.full_name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                  <div className="text-[11px] text-navy-400">{s.group_name}</div>
                </div>
                <span className="text-xs font-bold text-navy-500 shrink-0">{s.daysLeft === 0 ? 'Bugun' : `${s.daysLeft} kundan keyin`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
