import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Coins, Wallet, Flame } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

export default function ActiveStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState(null);
  const [q, setQ] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  useEffect(() => { api.get('/students').then((s) => setStudents(s || [])).catch(() => setStudents([])); }, []);

  const groups = useMemo(() => [...new Set((students || []).map((s) => s.group_name).filter(Boolean))].sort(), [students]);
  const active = useMemo(() => (students || [])
    .filter((s) => s.status === 'active')
    .filter((s) => !groupFilter || s.group_name === groupFilter)
    .filter((s) => !q.trim() || s.full_name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.progress || 0) - (a.progress || 0)), [students, q, groupFilter]);

  if (students === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Faol o'quvchilar" subtitle={`${active.length} ta faol o'quvchi`} />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !py-2 !w-auto text-sm" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {active.length === 0 ? <Empty icon={Users} title="Faol o'quvchi topilmadi" /> : (
        <div className="space-y-1.5">
          {active.map((s) => (
            <div key={s.id} onClick={() => navigate(`/app/students/${s.id}`)}
              className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5 cursor-pointer hover:bg-gold/5 transition">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{s.full_name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                <div className="text-[10px] text-navy-400">{s.group_name} · {s.progress || 0}% progress</div>
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-bold shrink-0 ${(s.balance ?? 0) < 0 ? 'text-red-500' : 'text-navy-500'}`}><Wallet size={11} /> {(s.balance ?? 0).toLocaleString('en-US').replace(/,/g, ' ')}</span>
              <span className="flex items-center gap-1 text-[10px] text-gold-600 font-bold shrink-0"><Coins size={11} /> {s.coins ?? 0}</span>
              <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold shrink-0"><Flame size={11} /> {s.streak ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
