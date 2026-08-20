import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, X, ChevronDown } from 'lucide-react';
import { menuForRole } from '../config/menu.js';
import { emojiForItem } from '../config/menuEmojis.js';
import { useAuth } from '../auth/AuthContext.jsx';

const COLLAPSE_KEY = 'iso_sidebar_collapsed';

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();
  const [q, setQ] = useState('');
  const groups = menuForRole(user.role);

  const currentKey = location.pathname.split('/')[2];
  const activeGroup = groups.find((g) => g.items.some((it) => it.key === currentKey))?.group || null;

  // Birinchi marta kirganda: menyu juda ko'p bo'lgani uchun barcha guruhlar yopiq holatda boshlanadi,
  // faqat joriy sahifa turgan guruh ochiq. Foydalanuvchi keyin qaysi guruhni ochib/yopganini
  // localStorage'da eslab qoladi.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
      if (Object.keys(saved).length) return saved;
    } catch { /* ignore */ }
    const initial = {};
    for (const g of groups) initial[g.group] = g.group !== activeGroup;
    return initial;
  });

  // Faol sahifa turgan guruh doim ochiq bo'lsin — foydalanuvchi qayerdaligini yo'qotib qo'ymasin.
  useEffect(() => {
    if (activeGroup && collapsed[activeGroup]) {
      setCollapsed((prev) => { const next = { ...prev, [activeGroup]: false }; persist(next); return next; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  function persist(next) {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function toggleGroup(name) {
    setCollapsed((prev) => { const next = { ...prev, [name]: !prev[name] }; persist(next); return next; });
  }

  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const searching = q.trim().length > 0;

  return (
    <aside className="w-[272px] shrink-0 h-full bg-gradient-to-b from-navy-800 via-navy-900 to-[#0A1020] text-navy-100 flex flex-col border-r border-white/5">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-[68px] border-b border-white/8">
        <img src="/logo.png" alt="ISO Termizy" className="w-10 h-10 rounded-xl object-cover bg-white/90 p-0.5 shadow-md" />
        <div className="leading-tight">
          <div className="font-display text-lg text-white">
            <span className="text-gold-300">ISO</span> Termizy
          </div>
          <div className="text-[10px] text-navy-300/70 font-medium tracking-wider -mt-0.5">XORIJIY TILLAR · LMS</div>
        </div>
      </div>

      {/* Menu qidiruvi */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Menyu bo'yicha qidirish..."
            className="w-full rounded-full bg-white/[.06] border border-white/[.06] pl-9 pr-8 py-2 text-[13px] text-navy-100 placeholder:text-navy-300/50 outline-none transition-all duration-200 ease-ios focus:bg-white/[.1] focus:border-gold/30"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-5 h-5 rounded-full hover:bg-white/10 text-navy-300">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {filteredGroups.length === 0 && (
          <div className="px-3 py-6 text-center text-[13px] text-navy-300/50">Hech narsa topilmadi</div>
        )}
        {filteredGroups.map((g) => {
          const isOpen = searching || !collapsed[g.group];
          return (
            <div key={g.group}>
              <button onClick={() => toggleGroup(g.group)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/[.05] transition group/head">
                <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-gold-400/60 group-hover/head:text-gold-400/90 transition flex items-center gap-1.5">
                  <span className="text-xs">{emojiForItem({ key: '', label: '' }, g.group)}</span>
                  {g.group}
                </span>
                <ChevronDown size={13} className={`text-navy-400/60 transition-transform duration-200 ease-ios ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className="grid transition-[grid-template-rows] duration-300 ease-ios" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                  <div className="space-y-0.5 rounded-2xl bg-white/[.03] p-1.5 mt-1">
                    {g.items.map((it) => {
                      const emoji = emojiForItem(it, g.group);
                      return (
                        <NavLink
                          key={it.key}
                          to={`/app/${it.key}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-200 ease-ios ${
                              isActive
                                ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 font-bold shadow-md shadow-gold/20'
                                : 'text-navy-200/80 hover:bg-white/[.06] hover:text-white'
                            }`
                          }
                        >
                          <span className="text-base leading-none shrink-0 opacity-90 group-hover:opacity-100">{emoji}</span>
                          <span className="truncate">{it.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-white/5 text-[10px] text-navy-400/50 font-medium">
        ISO Termizy Avlodlari © 2026
      </div>
    </aside>
  );
}
