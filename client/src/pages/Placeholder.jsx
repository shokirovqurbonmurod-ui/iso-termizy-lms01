import { Hammer } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';
import { findItem } from '../config/menu.js';
import { useLang } from '../i18n/LangContext.jsx';

// Honest stub for modules whose data model isn't wired yet.
export default function Placeholder({ menuKey }) {
  const item = findItem(menuKey);
  const { tm, tg } = useLang();
  const Icon = item?.icon || Hammer;

  return (
    <div>
      <PageHeader icon={Icon} title={tm(menuKey, item?.label || 'Modul')} subtitle={item ? `${tg(item.group)}` : ''} />
      <div className="card p-10 text-center max-w-2xl mx-auto">
        <div className="grid place-items-center w-20 h-20 rounded-3xl bg-gold/10 text-gold-500 mx-auto mb-5">
          <Icon size={38} />
        </div>
        <h2 className="font-display text-2xl text-navy-800 mb-2">{tm(menuKey, item?.label)}</h2>
        <p className="text-navy-500 max-w-md mx-auto">
          Bu modul strukturasi tayyor — menyu, marshrut va rollar bo'yicha ruxsatlar ishlaydi.
          Modulga xos ma'lumotlar va amallar shu yerga qo'shiladi.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy-50 px-4 py-2 text-sm text-navy-500">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          Kengaytirishga tayyor
        </div>
        <p className="text-xs text-navy-400 mt-6">
          Kengaytirish: <code>server/src/index.js</code> ga yangi jadval + <code>crudRouter</code> qo'shing,
          so'ng <code>client/src/config/resources.js</code> ga konfiguratsiya yozing — bu modul ham
          to'liq CRUD jadvalga aylanadi.
        </p>
      </div>
    </div>
  );
}
