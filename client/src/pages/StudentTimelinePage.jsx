import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTree, Search, GraduationCap, FileCheck2, Coins, TrendingUp, Award, Sparkles, Phone, Info, Repeat } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

const TYPE_META = {
  enrollment: { icon: GraduationCap, color: 'bg-emerald-500', label: "Ro'yxatga olindi" },
  exam: { icon: FileCheck2, color: 'bg-blue-500', label: 'Imtihon' },
  coin: { icon: Coins, color: 'bg-gold-500', label: 'Coin' },
  level_up: { icon: TrendingUp, color: 'bg-purple-500', label: 'Daraja oshdi' },
  certificate: { icon: Award, color: 'bg-amber-500', label: 'Sertifikat' },
  achievement: { icon: Sparkles, color: 'bg-pink-500', label: 'Yutuq' },
  group_change: { icon: Repeat, color: 'bg-sky-500', label: 'Guruh o\'zgardi' },
  call: { icon: Phone, color: 'bg-teal-500', label: "Qo'ng'iroq" },
  izoh: { icon: Info, color: 'bg-navy-400', label: 'Izoh' },
  system: { icon: Info, color: 'bg-navy-400', label: 'Tizim' },
};
function metaFor(type) { return TYPE_META[type] || { icon: ListTree, color: 'bg-navy-400', label: type || 'Voqea' }; }

export default function StudentTimelinePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    Promise.all([api.get('/student_timeline?limit=500').catch(() => []), api.get('/students').catch(() => [])])
      .then(([r, s]) => { setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []); });
  }, []);

  const filtered = useMemo(() => (rows || [])
    .filter((r) => !typeFilter || r.type === typeFilter)
    .filter((r) => !q.trim() || r.student.toLowerCase().includes(q.toLowerCase()) || (r.event || '').toLowerCase().includes(q.toLowerCase())),
    [rows, q, typeFilter]);

  const grouped = useMemo(() => {
    const m = {};
    for (const r of filtered) { const d = r.date || "Noma'lum"; (m[d] ||= []).push(r); }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function goStudent(name) {
    const s = students.find((s) => s.full_name === name);
    if (s) navigate(`/app/students/${s.id}`);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ListTree} title="O'quvchi tarixchasi" subtitle="Barcha o'quvchilar bo'yicha voqealar lentasi" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="O'quvchi yoki voqea..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !py-2 !w-auto text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Barcha turlar</option>
          {Object.entries(TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
      </div>

      {grouped.length === 0 ? <Empty icon={ListTree} title="Voqealar topilmadi" /> : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="text-xs font-bold text-navy-400 mb-2.5 sticky top-0">{date}</div>
              <div className="space-y-1.5 border-l-2 border-navy-100 ml-3 pl-4">
                {items.map((r) => {
                  const meta = metaFor(r.type);
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="relative flex items-start gap-3 rounded-xl bg-navy-50/60 px-3.5 py-2.5 -ml-[1.85rem]">
                      <div className={`grid place-items-center w-7 h-7 rounded-lg ${meta.color} text-white shrink-0 mt-0.5`}><Icon size={13} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => goStudent(r.student)} className="text-sm font-bold text-navy-800 hover:text-gold-600 transition">{r.student}</button>
                          <span className="text-xs text-navy-400">— {r.event}</span>
                        </div>
                        {r.detail && <div className="text-xs text-navy-500 mt-0.5">{r.detail}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
