import { useEffect, useState } from 'react';
import { Map as MapIcon, Layers, MapPin } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

// Filiallar xaritasi — offline, tashqi kutubxonasiz stilizatsiya qilingan xarita
export function BranchesMap() {
  const [branches, setBranches] = useState(null);
  useEffect(() => { api.get('/branches').then(setBranches).catch(() => setBranches([])); }, []);
  if (branches === null) return <Spinner />;

  // Surxondaryo shaharlari uchun taxminiy nisbiy koordinatalar (dekorativ)
  const pins = { 'Sherobod': { x: 35, y: 62 }, 'Termiz': { x: 55, y: 82 }, 'Denov': { x: 60, y: 28 } };
  const pinFor = (name) => {
    const city = Object.keys(pins).find((c) => name.includes(c));
    return city ? pins[city] : { x: 50, y: 50 };
  };

  return (
    <div>
      <PageHeader icon={MapIcon} title="Filiallar xaritasi" subtitle="Surxondaryo viloyati bo'yicha filiallar" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-4">
          <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg,#E8EEF6,#DCE7DA)' }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path d="M20,20 Q45,10 70,22 T90,45 Q85,70 65,88 T30,85 Q12,60 20,20 Z" fill="#C9D8C4" stroke="#A9C0A2" strokeWidth="0.6" />
              <path d="M25,40 Q50,55 80,50" fill="none" stroke="#9CC0E0" strokeWidth="1.2" opacity="0.7" />
            </svg>
            {branches.map((b) => {
              const p = pinFor(b.name);
              const active = b.status === 'active';
              return (
                <div key={b.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <div className={`flex flex-col items-center ${active ? 'text-gold-600' : 'text-navy-400'}`}>
                    <div className="px-2 py-0.5 rounded-full bg-white shadow-card text-[11px] font-semibold whitespace-nowrap mb-0.5">{b.name.split('—')[0].trim()}</div>
                    <MapPin size={active ? 30 : 24} className="drop-shadow" fill={active ? '#C6A15B' : '#93A2BE'} stroke="#fff" />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-navy-400 mt-3">* Sxematik xarita. Haqiqiy interaktiv xarita uchun Leaflet/Google Maps ulash mumkin.</p>
        </div>
        <div className="space-y-3">
          {branches.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-navy-800">{b.name}</div>
                <span className={`chip ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{b.status === 'active' ? 'Faol' : 'Rejada'}</span>
              </div>
              <div className="text-sm text-navy-500 mt-1">{b.address}</div>
              <div className="text-sm text-navy-400 mt-2">👥 {b.students_count} o'quvchi</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CEFR darajalari — ma'lumot sahifasi
const CEFR = [
  { code: 'A1', name: 'Beginner', color: 'bg-emerald-100 text-emerald-700', desc: 'Boshlang\'ich. Oddiy iboralar va kundalik so\'zlar.' },
  { code: 'A2', name: 'Elementary', color: 'bg-teal-100 text-teal-700', desc: 'Oddiy suhbat, tanish mavzular.' },
  { code: 'B1', name: 'Intermediate', color: 'bg-blue-100 text-blue-700', desc: 'Kundalik vaziyatlarda erkin muloqot.' },
  { code: 'B2', name: 'Upper-Intermediate', color: 'bg-indigo-100 text-indigo-700', desc: 'Murakkab matnlar, ravon nutq.' },
  { code: 'C1', name: 'Advanced', color: 'bg-violet-100 text-violet-700', desc: 'Professional va akademik daraja.' },
  { code: 'C2', name: 'Proficiency', color: 'bg-rose-100 text-rose-700', desc: 'Ona tili darajasiga yaqin.' },
];

export function Levels() {
  const [groups, setGroups] = useState([]);
  useEffect(() => { api.get('/groups').then(setGroups).catch(() => setGroups([])); }, []);
  const countFor = (code) => groups.filter((g) => (g.level || '').toUpperCase().startsWith(code)).length;

  return (
    <div>
      <PageHeader icon={Layers} title="Darajalar (CEFR)" subtitle="Umumevropa til darajalari tizimi" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CEFR.map((l) => (
          <div key={l.code} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className={`chip ${l.color} text-base px-3 py-1`}>{l.code}</span>
              <span className="text-xs text-navy-400">{countFor(l.code)} guruh</span>
            </div>
            <div className="font-display text-lg text-navy-800">{l.name}</div>
            <p className="text-sm text-navy-500 mt-1">{l.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
