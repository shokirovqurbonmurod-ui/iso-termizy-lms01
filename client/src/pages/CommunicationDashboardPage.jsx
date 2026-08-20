import { useEffect, useState } from 'react';
import { MessagesSquare, Bell, Radio, Headphones, Clock, Megaphone, TrendingUp } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, StatCard, Spinner } from '../components/ui.jsx';

export default function CommunicationDashboardPage() {
  const [stats, setStats] = useState(null);

  async function load() { setStats(await api.get('/communication/stats').catch(() => null)); }
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  if (!stats) return <Spinner />;

  const maxChannel = Math.max(1, ...stats.topChannels.map((c) => c.count));

  return (
    <div>
      <PageHeader icon={MessagesSquare} title="Aloqa paneli" subtitle="Chat, e'lon va support markazining umumiy ko'rinishi" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessagesSquare} label="Faol suhbatlar" value={stats.totalChannels} tone="gold" />
        <StatCard icon={TrendingUp} label="Bugungi xabarlar" value={stats.messagesToday} hint={`${stats.messagesLastHour} so'nggi soatda`} tone="blue" />
        <StatCard icon={Radio} label="So'nggi 15 daqiqada faol" value={stats.activeNow} tone="green" />
        <StatCard icon={Bell} label="O'qilmagan e'lonlar" value={stats.announcements.unreadForMe} hint={`${stats.announcements.total} jami`} tone="rose" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Headphones size={16} className="text-gold-600" />
            <h3 className="font-bold text-navy-800">Support markazi</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              ['📥', 'Ochiq', stats.tickets.open],
              ['⚙️', 'Jarayonda', stats.tickets.inProgress],
              ['✅', 'Hal qilindi', stats.tickets.resolved],
              ['🔥', 'Shoshilinch', stats.tickets.urgent],
            ].map(([ic, label, val]) => (
              <div key={label} className="rounded-xl bg-navy-50/60 px-3 py-2.5">
                <div className="text-lg">{ic}</div>
                <div className="font-display text-lg text-navy-800">{val}</div>
                <div className="text-[11px] text-navy-400">{label}</div>
              </div>
            ))}
          </div>
          {stats.avgResponseHours !== null && (
            <div className="flex items-center gap-2 text-xs text-navy-500 px-1">
              <Clock size={13} />
              O'rtacha birinchi javob vaqti: <span className="font-bold text-navy-700">{stats.avgResponseHours} soat</span>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={16} className="text-gold-600" />
            <h3 className="font-bold text-navy-800">Eng faol kanallar (7 kun)</h3>
          </div>
          {stats.topChannels.length === 0 ? (
            <p className="text-sm text-navy-300 text-center py-8">Hali xabar yo'q</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topChannels.map((c) => (
                <div key={c.channel}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-navy-700 truncate">{c.channel.replace('DM:', '').replace(/:/g, ' ↔ ')}</span>
                    <span className="text-navy-400 shrink-0 ml-2">{c.count} ta</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-navy-50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full" style={{ width: `${(c.count / maxChannel) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
