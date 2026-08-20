import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Plus, Users, Trophy, XCircle, Target } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

const STAGES = [
  { key: 'new', label: 'Yangi', color: 'from-blue-400 to-blue-500' },
  { key: 'contacted', label: 'Bog\'lanildi', color: 'from-violet-400 to-violet-500' },
  { key: 'trial', label: 'Sinov darsda', color: 'from-amber-400 to-amber-500' },
  { key: 'won', label: "G'olib (mijoz bo'ldi)", color: 'from-emerald-400 to-emerald-500' },
];

export default function Konversiya() {
  const [leads, setLeads] = useState(null);

  useEffect(() => { api.get('/leads').then((l) => setLeads(l || [])).catch(() => setLeads([])); }, []);

  const stats = useMemo(() => {
    if (!leads) return null;
    const counts = { new: 0, contacted: 0, trial: 0, won: 0, lost: 0 };
    for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
    const decided = counts.won + counts.lost;
    const conversion = decided ? Math.round((counts.won / decided) * 100) : 0;
    const maxCount = Math.max(1, ...STAGES.map((s) => counts[s.key]));
    return { counts, conversion, maxCount };
  }, [leads]);

  const bySource = useMemo(() => {
    if (!leads) return [];
    const groups = {};
    for (const l of leads) {
      if (!groups[l.source]) groups[l.source] = { source: l.source, total: 0, won: 0, lost: 0 };
      groups[l.source].total++;
      if (l.status === 'won') groups[l.source].won++;
      if (l.status === 'lost') groups[l.source].lost++;
    }
    return Object.values(groups).map((g) => ({ ...g, rate: (g.won + g.lost) ? Math.round((g.won / (g.won + g.lost)) * 100) : null }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const byAssignee = useMemo(() => {
    if (!leads) return [];
    const groups = {};
    for (const l of leads) {
      const key = l.assigned_to || "Belgilanmagan";
      if (!groups[key]) groups[key] = { assignee: key, total: 0, won: 0, lost: 0 };
      groups[key].total++;
      if (l.status === 'won') groups[key].won++;
      if (l.status === 'lost') groups[key].lost++;
    }
    return Object.values(groups).map((g) => ({ ...g, rate: (g.won + g.lost) ? Math.round((g.won / (g.won + g.lost)) * 100) : null }))
      .sort((a, b) => b.won - a.won);
  }, [leads]);

  if (!stats) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Konversiya" subtitle="Lidlarning joriy bosqichlar bo'yicha taqsimoti va g'olib chiqish foizi"
        actions={<Link to="/app/leads" className="btn-gold"><Plus size={16} /> Lidlar bazasi</Link>} />

      {leads.length === 0 ? (
        <Empty icon={BarChart3} title="Lid yo'q" hint="Marketing CRM orqali yangi lid qo'shing." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              [Users, 'Jami lidlar', leads.length, 'gold'],
              [Trophy, "G'olib", stats.counts.won, 'green'],
              [XCircle, "Yo'qotilgan", stats.counts.lost, 'rose'],
              [Target, 'Konversiya', stats.conversion + '%', 'blue'],
            ].map(([Icon, label, val, tone], i) => (
              <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
                  tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
                  tone === 'blue' ? 'from-blue-400/20 to-blue-100/10 text-blue-600' :
                  tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
                  'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
                  <Icon size={20} />
                </div>
                <div className="font-display text-2xl text-navy-800">{val}</div>
                <div className="text-sm text-navy-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Funnel */}
          <div className="card p-5 mb-6">
            <h3 className="font-display text-lg text-navy-800 mb-4">🔻 Bosqichlar bo'yicha taqsimot</h3>
            <div className="space-y-3">
              {STAGES.map((s) => {
                const count = stats.counts[s.key];
                const widthPct = Math.max(8, Math.round((count / stats.maxCount) * 100));
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-sm font-semibold text-navy-700">{s.label}</div>
                    <div className="flex-1 h-7 rounded-lg bg-navy-50 overflow-hidden">
                      <div className={`h-full rounded-lg bg-gradient-to-r ${s.color} flex items-center px-2.5 transition-all`} style={{ width: `${widthPct}%` }}>
                        <span className="text-xs font-bold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.counts.lost > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-navy-50">
                  <div className="w-32 shrink-0 text-sm font-semibold text-red-500">Yo'qotilgan</div>
                  <div className="flex-1 h-7 rounded-lg bg-navy-50 overflow-hidden">
                    <div className="h-full rounded-lg bg-gradient-to-r from-red-400 to-red-500 flex items-center px-2.5" style={{ width: `${Math.max(8, Math.round((stats.counts.lost / stats.maxCount) * 100))}%` }}>
                      <span className="text-xs font-bold text-white">{stats.counts.lost}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Manba bo'yicha konversiya */}
            <div className="card p-5">
              <h3 className="font-display text-lg text-navy-800 mb-4">📊 Manba bo'yicha konversiya</h3>
              <div className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.source} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800">{s.source}</div>
                      <div className="text-[11px] text-navy-400">{s.total} ta lid · {s.won} g'olib</div>
                    </div>
                    <span className={`font-bold text-sm ${s.rate === null ? 'text-navy-300' : s.rate >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {s.rate === null ? '—' : `${s.rate}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Xodim bo'yicha konversiya */}
            <div className="card p-5">
              <h3 className="font-display text-lg text-navy-800 mb-4">🧑‍💼 Mas'ul xodim bo'yicha</h3>
              <div className="space-y-2">
                {byAssignee.map((a) => (
                  <div key={a.assignee} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800">{a.assignee}</div>
                      <div className="text-[11px] text-navy-400">{a.total} ta lid · {a.won} g'olib</div>
                    </div>
                    <span className={`font-bold text-sm ${a.rate === null ? 'text-navy-300' : a.rate >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {a.rate === null ? '—' : `${a.rate}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
