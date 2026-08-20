import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';

export default function DebtorsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { api.get('/students').then((s) => setStudents(s || [])).catch(() => setStudents([])); }, []);

  const debtors = useMemo(() => (students || [])
    .filter((s) => (s.balance ?? 0) < 0)
    .filter((s) => !q.trim() || s.full_name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0)), [students, q]);

  const totalDebt = useMemo(() => debtors.reduce((a, s) => a + Math.abs(s.balance ?? 0), 0), [debtors]);

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={AlertTriangle} title="Qarzdorlar" subtitle="Balansi manfiy bo'lgan o'quvchilar ro'yxati" />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-red-600">{debtors.length}</div>
          <div className="text-sm text-navy-400">Qarzdor o'quvchi</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-red-600">{money(totalDebt)}</div>
          <div className="text-sm text-navy-400">Jami qarz</div>
        </div>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {debtors.length === 0 ? <Empty icon={AlertTriangle} title="Qarzdor yo'q 🎉" /> : (
        <div className="space-y-1.5">
          {debtors.map((s) => (
            <div key={s.id} onClick={() => navigate(`/app/students/${s.id}`)}
              className="flex items-center gap-3 rounded-xl bg-red-50/60 border border-red-100 px-4 py-3 cursor-pointer hover:bg-red-50 transition">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-red-500 text-white text-xs font-bold shrink-0">{s.full_name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                <div className="text-[11px] text-navy-400">{s.group_name}</div>
              </div>
              <span className="font-bold text-red-600 shrink-0">{money(s.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
