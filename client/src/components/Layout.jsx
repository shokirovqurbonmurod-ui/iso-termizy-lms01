import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Languages } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import NotificationBell from './NotificationBell.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useLang, LANGS } from '../i18n/LangContext.jsx';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { lang, setLang } = useLang();

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('iso_theme', next ? 'dark' : 'light'); } catch (e) {}
  }

  function cycleLang() {
    const codes = LANGS.map(l => l.code);
    const idx = (codes.indexOf(lang) + 1) % codes.length;
    setLang(codes[idx]);
  }

  const currentLang = LANGS.find(l => l.code === lang);

  const WD = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const MN = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
  const now = new Date();
  const todayStr = `${WD[now.getDay()]}, ${now.getDate()}-${MN[now.getMonth()]}`;

  return (
    <div className="h-full flex">
      <div className="hidden lg:block"><Sidebar /></div>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full animate-slide"><Sidebar onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[68px] shrink-0 bg-white/80 backdrop-blur-xl border-b border-navy-100/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-navy-500 hover:text-navy-700 transition" onClick={() => setDrawer(true)}><Menu size={22} /></button>
            <div className="hidden sm:block">
              <div className="font-display text-lg text-navy-800">ISO Termizy Avlodlari</div>
              <div className="text-[11px] text-navy-400 -mt-1">Xorijiy tillar o'quv markazi · Sherobod</div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-gold/10 border border-gold/20 px-3 py-1.5 ml-2">
              <span className="text-[11px] font-bold text-gold-700">📅 {todayStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language */}
            <button onClick={cycleLang} className="flex items-center gap-1.5 h-9 rounded-full px-3 hover:bg-navy-50 text-navy-500 text-sm font-semibold transition" title="Til almashtirish">
              <Languages size={16} />
              <span className="hidden sm:inline">{currentLang?.flag} {lang.toUpperCase()}</span>
            </button>
            {/* Theme */}
            <button onClick={toggleTheme} className="grid place-items-center w-9 h-9 rounded-full hover:bg-navy-50 text-navy-500 transition" title={dark ? 'Kunduzgi rejim' : 'Tungi rejim'}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* Bell */}
            <NotificationBell role={user.role} />
            {/* Profil menyu */}
            <ProfileMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 bg-navy-50/40">
          <Outlet />
        </main>
      </div>

      <BottomTabBar onOpenMenu={() => setDrawer(true)} />
    </div>
  );
}
