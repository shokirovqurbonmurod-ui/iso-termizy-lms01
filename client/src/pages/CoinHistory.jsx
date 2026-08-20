import { useEffect, useMemo, useState } from 'react';
import { Clock, Zap, Plus, Minus } from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';

const RANGE_TABS = [
  { key: 'all', label: 'Barchasi' },
  { key: 'month', label: 'Shu oy' },
  { key: 'week', label: 'Shu hafta' },
];
const TYPE_TABS = [
  { key: 'all', label: 'Barchasi' },
  { key: 'in', label: 'Kirim' },
  { key: 'out', label: 'Chiqim' },
];

export default function CoinHistory() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState(null);
  const [range, setRange] = useState('all');
  const [type, setType] = useState('all');

  useEffect(() => {
    api.get('/students').then((rows) => setProfile((rows || []).find((s) => s.full_name === user.full_name) || null)).catch(() => {});
    api.get('/coins/log').then((rows) => setLog((rows || []).filter((r) => r.student === user.full_name))).catch(() => setLog([]));
  }, [user.full_name]);

  const filtered = useMemo(() => {
    if (!log) return [];
    const now = new Date();
    return log.filter((r) => {
      if (type === 'in' && Number(r.amount) < 0) return false;
      if (type === 'out' && Number(r.amount) >= 0) return false;
      if (range !== 'all') {
        const d = new Date((r.at || '').replace(' ', 'T'));
        if (isNaN(d)) return true;
        if (range === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
        if (range === 'week') {
          const diffDays = (now - d) / (1000 * 60 * 60 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        }
      }
      return true;
    }).sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [log, range, type]);

  if (log === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Clock} title="Coinlar tarixi" subtitle="Topgan coinlaringiz va erishgan natijalaringizni kuzating" />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
        <div className="card p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center gap-1.5 text-indigo-500 mb-2"><Zap size={14} /> <span className="text-xs font-bold uppercase tracking-wide">Pointlar</span></div>
          <div className="font-display text-3xl text-indigo-700">{(profile?.points ?? 0).toLocaleString()}</div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-gold-50 to-white border-gold-100">
          <div className="flex items-center gap-1.5 text-gold-600 mb-2"><span>🪙</span> <span className="text-xs font-bold uppercase tracking-wide">Coins</span></div>
          <div className="font-display text-3xl text-gold-700">{(profile?.coins ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-navy-800">Coinlar tarixi</h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-navy-50 p-1">
              {RANGE_TABS.map((t) => (
                <button key={t.key} onClick={() => setRange(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${range === t.key ? 'bg-white shadow text-navy-800' : 'text-navy-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-navy-50 p-1">
              {TYPE_TABS.map((t) => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${type === t.key ? 'bg-white shadow text-navy-800' : 'text-navy-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-navy-400 text-sm">Hozircha yozuvlar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                  <th className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">Coinlar va pointlar miqdori</th>
                  <th className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">Sabab</th>
                  <th className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">Sana</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const amt = Number(r.amount) || 0;
                  const isIn = amt >= 0;
                  return (
                    <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                      <td className="px-4 py-3.5">
                        <div className={`grid place-items-center w-8 h-8 rounded-full ${isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                          {isIn ? <Plus size={15} /> : <Minus size={15} />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="chip bg-indigo-100 text-indigo-700"><Zap size={11} className="inline -mt-0.5 mr-0.5" />{isIn ? '+' : ''}{amt}</span>
                          <span className="chip bg-gold/15 text-gold-700">🪙 {isIn ? '+' : ''}{amt}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-navy-700 font-semibold">{r.reason || '—'}</td>
                      <td className="px-4 py-3.5 text-navy-400 text-xs whitespace-nowrap">{r.at || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
