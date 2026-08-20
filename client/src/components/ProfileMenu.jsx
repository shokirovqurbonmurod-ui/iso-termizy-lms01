import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { roleLabel, roleColor } from '../config/roles.js';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(path) { setOpen(false); navigate(path); }
  function doLogout() { setOpen(false); logout(); navigate('/login'); }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 ml-1 rounded-full pl-1 pr-2 py-1 hover:bg-navy-50 transition">
        <div className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-white font-bold text-sm shadow-md shrink-0">
          {user.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-navy-800 leading-tight">{user.full_name}</div>
          <span className={`chip ${roleColor(user.role)} shadow-sm`}>{roleLabel(user.role)}</span>
        </div>
        <ChevronDown size={14} className={`hidden sm:block text-navy-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-14 w-64 card !shadow-2xl overflow-hidden z-20 animate-fade">
          <div className="px-4 py-3.5 border-b border-navy-100 bg-navy-50/50">
            <div className="text-sm font-bold text-navy-800 truncate">{user.full_name}</div>
            <span className={`chip ${roleColor(user.role)} shadow-sm mt-1 inline-block`}>{roleLabel(user.role)}</span>
          </div>
          <div className="py-1.5">
            <button onClick={() => go('/app/settings')} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 hover:bg-gold/[.06] transition text-left">
              <User size={15} className="text-navy-400" /> Profilim
            </button>
            <button onClick={() => go('/app/settings')} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 hover:bg-gold/[.06] transition text-left">
              <Settings size={15} className="text-navy-400" /> Sozlamalar
            </button>
          </div>
          <div className="border-t border-navy-100 py-1.5">
            <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left">
              <LogOut size={15} /> Chiqish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
