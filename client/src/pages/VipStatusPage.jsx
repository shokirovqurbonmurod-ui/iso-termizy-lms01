import { useEffect, useMemo, useState } from 'react';
import { Crown } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function VipStatusPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [board, setBoard] = useState(null);
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/vip-status/board').catch(() => []),
      api.get('/vip-status/tiers').catch(() => []),
    ]).then(([b, t]) => { setBoard(b || []); setTiers(t || []); });
  }, []);

  const me = useMemo(() => board?.find((r) => r.student === user.full_name), [board, user.full_name]);

  if (board === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Crown} title="VIP status" subtitle="Ko'p coin to'plagan o'quvchilar avtomatik yuqori darajaga o'tadi" />

      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        {tiers.map((t) => (
          <div key={t.name} className="card p-4" style={{ borderTop: `3px solid ${t.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className="font-display text-base text-navy-800">{t.name}</div>
                <div className="text-[11px] text-navy-400">{t.min}+ 🪙</div>
              </div>
            </div>
            <ul className="text-[11px] text-navy-500 space-y-0.5">
              {t.perks.map((p) => <li key={p}>• {p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {isStudent && me && (
        <div className="card p-6 mb-6 animate-fade" style={{ background: `linear-gradient(135deg, ${me.color}22, transparent)`, borderColor: me.color }}>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{me.icon}</div>
            <div className="flex-1">
              <div className="text-xs text-navy-400">Sizning darajangiz</div>
              <div className="font-display text-2xl text-navy-800">{me.tier}</div>
              <div className="text-xs text-navy-400">{me.since_date} dan beri · 🪙 {me.coins}</div>
            </div>
            {me.next_tier && (
              <div className="text-right">
                <div className="text-xs text-navy-400">Keyingi daraja — {me.next_tier.name}</div>
                <div className="font-bold text-gold-600">{me.next_tier.coins_needed} 🪙 qoldi</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100 font-display text-lg text-navy-800">Reyting</div>
        <div className="divide-y divide-navy-50">
          {board.map((r, i) => (
            <div key={r.student_id} className={`flex items-center gap-3 px-4 py-3 ${r.student === user.full_name ? 'bg-gold/5' : ''}`}>
              <span className="w-6 text-xs text-navy-400 font-bold">#{i + 1}</span>
              <span className="text-xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.student}</div>
                <div className="text-[11px] text-navy-400">{r.group_name || '—'}</div>
              </div>
              <span className="chip text-[10px]" style={{ background: r.color + '22', color: r.color }}>{r.tier}</span>
              <span className="text-sm font-bold text-navy-700 w-16 text-right">🪙 {r.coins}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
