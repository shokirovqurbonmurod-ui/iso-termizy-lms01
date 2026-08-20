import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sparkles, MessageCircle, Menu, Settings } from 'lucide-react';

const TABS = [
  { key: 'command-center', label: 'Bosh sahifa', icon: LayoutDashboard },
  { key: 'ai-assistant', label: 'AI', icon: Sparkles },
  { key: 'group-chat', label: 'Chat', icon: MessageCircle },
  { key: 'settings', label: 'Profil', icon: Settings },
];

// iOS uslubidagi pastki tab-bar — faqat mobil ekranda (lg dan kichik) ko'rinadi.
export default function BottomTabBar({ onOpenMenu }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-navy-100/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 h-[58px]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink key={t.key} to={`/app/${t.key}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-gold-600' : 'text-navy-400'}`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-0.5 text-navy-400 active:text-gold-600 transition-colors">
          <Menu size={22} />
          <span className="text-[10px] font-medium">Menyu</span>
        </button>
      </div>
    </nav>
  );
}
