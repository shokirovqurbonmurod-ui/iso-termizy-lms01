import { X, Inbox } from 'lucide-react';

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap animate-fade">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid place-items-center w-12 h-12 rounded-[18px] bg-gradient-to-br from-gold-400/20 to-gold-100/10 text-gold-600 shadow-sm">
            <Icon size={24} />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl text-navy-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'gold' }) {
  const tones = {
    gold: 'from-gold-400/20 to-gold-100/10 text-gold-600',
    navy: 'from-navy-200 to-navy-100 text-navy-600',
    green: 'from-emerald-400/20 to-emerald-100/10 text-emerald-600',
    blue: 'from-blue-400/20 to-blue-100/10 text-blue-600',
    rose: 'from-rose-400/20 to-rose-100/10 text-rose-600',
  };
  return (
    <div className="card stat-glow group p-5 hover:-translate-y-1 transition-transform duration-200 ease-ios">
      <div className="flex items-center justify-between">
        <div className={`grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br ${tones[tone]} group-hover:scale-110 transition-transform duration-200 ease-ios`}>
          {Icon && <Icon size={22} />}
        </div>
        {hint && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{hint}</span>}
      </div>
      <div className="mt-3 font-display text-2xl text-navy-800">{value}</div>
      <div className="text-sm text-navy-400">{label}</div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-900/40 backdrop-blur-md animate-fade" onClick={onClose}>
      <div className="card animate-sheet w-full max-w-lg max-h-[90vh] overflow-y-auto !rounded-[28px] !shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
          <h3 className="font-display text-xl text-navy-800">{title}</h3>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-100 bg-navy-50/30">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="card grid place-items-center text-center py-16 px-6 animate-fade">
      {Icon && <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gold-400/15 to-gold-100/5 text-gold-500 mb-4 shadow-sm"><Icon size={30} /></div>}
      <h3 className="font-display text-xl text-navy-700">{title}</h3>
      {hint && <p className="text-sm text-navy-400 mt-2 max-w-md">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="grid place-items-center py-20 text-navy-400 animate-fade">
      <div className="w-10 h-10 border-[3px] border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
