import { useEffect, useMemo, useState } from 'react';
import { Contact, Search, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

export default function StaffDirectoryPage() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { api.get('/staff').then((r) => setRows(r || [])).catch(() => setRows([])); }, []);

  const roles = useMemo(() => [...new Set((rows || []).map((r) => r.role_label).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => (rows || [])
    .filter((r) => !roleFilter || r.role_label === roleFilter)
    .filter((r) => !q.trim() || r.full_name.toLowerCase().includes(q.toLowerCase()) || (r.phone || '').includes(q))
    .sort((a, b) => a.full_name.localeCompare(b.full_name)), [rows, q, roleFilter]);

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Contact} title="Xodimlar katalogi" subtitle={`${rows.length} ta xodim · telefon katalog`} />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Ism yoki telefon..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !py-2 !w-auto text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Barcha lavozimlar</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty icon={Contact} title="Xodim topilmadi" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className={`card p-4 flex items-center gap-3 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-white text-sm font-bold shrink-0">{s.full_name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                <div className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2 py-0.5 inline-block mt-0.5">{s.role_label}</div>
                {s.phone && <div className="flex items-center gap-1 text-xs text-navy-500 mt-1"><Phone size={11} /> {s.phone}</div>}
                {s.branch && <div className="text-[10px] text-navy-400 mt-0.5 truncate">{s.branch}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
