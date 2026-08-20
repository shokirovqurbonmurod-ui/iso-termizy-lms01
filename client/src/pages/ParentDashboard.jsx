import { useEffect, useState } from 'react';
import { Users2, Wallet, Award, TrendingUp, TrendingDown, GraduationCap } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';
import { DOTS } from './AttendanceMark.jsx';

const DOT_MAP = Object.fromEntries(DOTS.map((d) => [d.key, d]));

export default function ParentDashboard() {
  const [children, setChildren] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/parent-dashboard/me').then((r) => setChildren(r || [])).catch((e) => { setErr(e.message); setChildren([]); });
  }, []);

  return (
    <div>
      <PageHeader icon={Users2} title="Ota-ona paneli" subtitle="Farzandingiz haqida davomat, to'lov va natijalar" />

      {children === null ? <Spinner /> : err ? (
        <Empty icon={Users2} title="Ko'rsatib bo'lmadi" hint={err} />
      ) : children.length === 0 ? (
        <Empty icon={Users2} title="Farzand topilmadi" hint="Agar bu xato bo'lsa, markaz bilan bog'laning — telefon raqamingiz o'quvchi profiliga bog'lanmagan bo'lishi mumkin." />
      ) : (
        <div className="space-y-6">
          {children.map((c) => <ChildCard key={c.id} child={c} />)}
        </div>
      )}
    </div>
  );
}

function ChildCard({ child: c }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-navy-100">
        <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold text-lg shrink-0">{(c.full_name || '?')[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg text-navy-800 truncate">{c.full_name}</div>
          <div className="text-xs text-navy-400">{c.group_name || 'Guruhsiz'} · {c.teacher || '—'} · {c.level || ''}</div>
        </div>
        <span className={`chip text-[9px] shrink-0 ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'}`}>{c.status || '—'}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
          <div className={`font-display text-xl ${(c.balance ?? 0) < 0 ? 'text-red-600' : 'text-navy-800'}`}>{money(c.balance)}</div>
          <div className="text-[10px] text-navy-400">Balans</div>
        </div>
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
          <div className="font-display text-xl text-navy-800">{c.tariff_price ? money(c.tariff_price) : '—'}</div>
          <div className="text-[10px] text-navy-400">Oylik tarif</div>
        </div>
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
          <div className="font-display text-xl text-navy-800">{c.progress || 0}%</div>
          <div className="text-[10px] text-navy-400">Progress</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div>
          <div className="label mb-2 flex items-center gap-1.5"><GraduationCap size={13} /> So'nggi davomat</div>
          {c.attendance.length === 0 ? <p className="text-xs text-navy-400">Yozuv yo'q</p> : (
            <div className="flex flex-wrap gap-1.5">
              {c.attendance.map((a) => {
                const dot = DOT_MAP[a.status];
                return <span key={a.id} className={`inline-block w-4 h-4 rounded-full ${dot ? dot.color : 'border-2 border-navy-100'}`} title={`${a.date} — ${dot?.label || a.status}`} />;
              })}
            </div>
          )}
        </div>

        <div>
          <div className="label mb-2 flex items-center gap-1.5"><Wallet size={13} /> So'nggi to'lovlar</div>
          {c.ledger.length === 0 ? <p className="text-xs text-navy-400">Yozuv yo'q</p> : (
            <div className="space-y-1.5">
              {c.ledger.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-xs">
                  {l.type === 'credit' ? <TrendingUp size={12} className="text-emerald-500 shrink-0" /> : <TrendingDown size={12} className="text-red-500 shrink-0" />}
                  <span className="text-navy-500 flex-1 truncate">{l.reason}</span>
                  <span className={`font-bold shrink-0 ${l.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>{l.type === 'credit' ? '+' : '−'}{money(l.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="label mb-2 flex items-center gap-1.5"><Award size={13} /> So'nggi natijalar</div>
          {c.results.length === 0 ? <p className="text-xs text-navy-400">Yozuv yo'q</p> : (
            <div className="space-y-1.5">
              {c.results.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span className="text-navy-500 flex-1 truncate">{r.exam}</span>
                  <span className="font-bold text-navy-800 shrink-0">{r.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
