import { useEffect, useRef, useState } from 'react';
import { Bell, Check, ShieldAlert, Info, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';
import { isAdmin } from '../config/roles.js';

const TYPE_ICON = { security: ShieldAlert, warning: AlertTriangle, info: Info };

export default function NotificationBell({ role }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const boxRef = useRef(null);

  async function load() {
    try {
      const all = await api.get('/notifications?limit=50');
      const mine = (all || []).filter((n) => !n.target_role || n.target_role === 'all' || n.target_role === role || isAdmin(role));
      setRows(mine);
    } catch { setRows([]); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markRead(n) {
    if (n.read) return;
    setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, read: 1 } : r)));
    await api.put(`/notifications/${n.id}`, { read: 1 }).catch(() => {});
  }

  async function markAllRead() {
    const unread = rows.filter((r) => !r.read);
    setRows((prev) => prev.map((r) => ({ ...r, read: 1 })));
    await Promise.all(unread.map((r) => api.put(`/notifications/${r.id}`, { read: 1 }).catch(() => {})));
  }

  const unreadCount = rows.filter((r) => !r.read).length;

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} className="relative grid place-items-center w-9 h-9 rounded-full hover:bg-navy-50 text-navy-500 transition">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-gradient-to-r from-gold-400 to-gold-500 border-2 border-white text-white text-[9px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[90vw] card !shadow-2xl overflow-hidden z-20 animate-fade">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
            <span className="font-display text-sm text-navy-800">Bildirishnomalar</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-gold-600 hover:underline font-semibold">Barchasini o'qilgan deb belgilash</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-navy-400">Hozircha bildirishnoma yo'q</div>
            ) : (
              rows.map((n) => {
                const Icon = TYPE_ICON[n.type] || Info;
                return (
                  <div key={n.id} onClick={() => markRead(n)}
                    className={`flex items-start gap-2.5 px-4 py-3 border-b border-navy-50 last:border-0 cursor-pointer transition ${n.read ? 'opacity-60' : 'bg-gold/[.03] hover:bg-gold/[.06]'}`}>
                    <Icon size={15} className={`shrink-0 mt-0.5 ${n.type === 'security' ? 'text-red-500' : n.type === 'warning' ? 'text-amber-500' : 'text-navy-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800 truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-navy-500 mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-navy-400 mt-1">{n.date}</div>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1.5" />}
                    {n.read ? <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" /> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
