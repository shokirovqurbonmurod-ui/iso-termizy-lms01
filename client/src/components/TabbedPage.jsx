import { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { canAccess } from '../config/menu.js';
import { emojiForItem } from '../config/menuEmojis.js';
import { renderKind } from '../App.jsx';

// Bitta sidebar elementi ichida bir nechta eski sahifani tab sifatida ko'rsatadi.
// item.tabs: [{ key, label, icon, kind, resource?, roles? }]
export default function TabbedPage({ item }) {
  const { user } = useAuth();
  const visibleTabs = useMemo(() => item.tabs.filter((t) => canAccess(user.role, t)), [item.tabs, user.role]);
  const [active, setActive] = useState(visibleTabs[0]?.key);
  const current = visibleTabs.find((t) => t.key === active) || visibleTabs[0];

  if (visibleTabs.length === 0) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="font-display text-xl text-navy-800">Ruxsat yo'q</h2>
      </div>
    );
  }

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-6 border-b border-navy-100 pb-3">
          {visibleTabs.map((t) => {
            const isActive = current?.key === t.key;
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'text-navy-500 hover:bg-navy-50'}`}>
                <span className="text-sm leading-none">{emojiForItem(t, item.group)}</span> {t.label}
              </button>
            );
          })}
        </div>
      )}
      {current && renderKind(current, current.key)}
    </div>
  );
}
