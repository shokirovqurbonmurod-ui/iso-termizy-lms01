import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { findItem } from '../config/menu.js';

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_BG = [
  'bg-gradient-to-br from-amber-100 via-gold-100 to-amber-50 ring-2 ring-gold shadow-glow',
  'bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200',
  'bg-gradient-to-br from-orange-100 to-orange-50 ring-1 ring-orange-200',
];

export default function Leaderboard({ menuKey }) {
  const item = findItem(menuKey);
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/leaderboard').then(setRows).catch(() => setRows([])); }, []);

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={item?.icon || Trophy} title={item?.label || 'Reyting'} subtitle="Eng faol o'quvchilar — ball bo'yicha" />
      {rows.length === 0 ? <Empty icon={Trophy} title="Reyting bo'sh" /> : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {rows.slice(0, 3).map((s, i) => (
              <div key={s.id} className={`card p-6 text-center ${PODIUM_BG[i]}`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="text-4xl mb-2">{MEDAL[i]}</div>
                <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-white text-2xl font-bold mx-auto mb-3 shadow-lg">{s.full_name[0]}</div>
                <div className="font-bold text-navy-800 truncate text-lg">{s.full_name}</div>
                <div className="text-xs text-navy-400 mb-3">{s.group_name}</div>
                <div className="font-display text-3xl text-gold-600">⚡ {s.points}</div>
                <div className="flex items-center justify-center gap-3 text-xs text-navy-400 mt-2">
                  <span>🔥 {s.streak} kun</span>
                  <span>🪙 {s.coins}</span>
                </div>
                <div className="mt-3 w-full h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full" style={{ width: `${Math.min(100, s.progress || 0)}%` }} />
                </div>
                <div className="text-[11px] text-navy-400 mt-1">{s.progress || 0}% progress</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">O'rin</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">O'quvchi</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Guruh</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Daraja</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Progress</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider text-right">Ball</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider text-right">Streak</th>
                    <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider text-right">Coins</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => (
                    <tr key={s.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition animate-fade" style={{ animationDelay: `${i * 25}ms` }}>
                      <td className="px-4 py-3.5">
                        <div className={`grid place-items-center w-8 h-8 rounded-lg text-sm font-bold ${i < 3 ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-white shadow' : 'bg-navy-100 text-navy-500'}`}>{i + 1}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shadow-sm">{s.full_name[0]}</div>
                          <span className="font-semibold text-navy-800">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-navy-500">{s.group_name}</td>
                      <td className="px-4 py-3.5"><span className="chip bg-gradient-to-r from-gold-100 to-gold-50 text-gold-700 shadow-sm">{s.level}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 w-28">
                          <div className="flex-1 h-2 rounded-full bg-navy-100 overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full" style={{ width: `${Math.min(100, s.progress || 0)}%` }} />
                          </div>
                          <span className="text-xs text-navy-500 font-semibold tabular-nums w-8">{s.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-navy-700 tabular-nums">⚡ {s.points}</td>
                      <td className="px-4 py-3.5 text-right text-navy-500 tabular-nums">🔥 {s.streak}</td>
                      <td className="px-4 py-3.5 text-right text-navy-500 tabular-nums">🪙 {s.coins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
