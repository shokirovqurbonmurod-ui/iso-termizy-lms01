import { useEffect, useState } from 'react';
import { ShieldCheck, Download, FileText, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all'); // all, today, week
  const [q, setQ] = useState('');

  useEffect(() => { api.get('/audit').then(setRows).catch(() => setRows([])); }, []);

  if (rows === null) return <Spinner />;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);

  let filtered = rows;
  if (filter === 'today') filtered = rows.filter((r) => (r.at || '').slice(0, 10) === today);
  if (filter === 'week') filtered = rows.filter((r) => (r.at || '').slice(0, 10) >= weekAgo);
  if (q.trim()) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(needle)));
  }

  function exportCSV() {
    const header = 'ID,Foydalanuvchi,Amal,Obyekt,Vaqt\n';
    const body = filtered.map((r) => `${r.id},"${r.actor}","${r.action}","${r.entity}","${r.at}"`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportText() {
    const lines = ['ISO Termizy Avlodlari — Audit Log', `Sana: ${today}`, `Jami: ${filtered.length} ta yozuv`, '', 'ID | Foydalanuvchi | Amal | Obyekt | Vaqt', '---|---|---|---|---'];
    filtered.forEach((r) => lines.push(`${r.id} | ${r.actor} | ${r.action} | ${r.entity} | ${r.at}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit_${today}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  const FILTERS = [
    { key: 'all', label: 'Hammasi' },
    { key: 'today', label: 'Bugun' },
    { key: 'week', label: 'Hafta' },
  ];

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Audit & Xavfsizlik" subtitle={`Tizimda bajarilgan amallar jurnali — ${filtered.length} ta yozuv`}
        actions={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost text-xs"><Download size={14} /> CSV</button>
            <button onClick={exportText} className="btn-ghost text-xs"><FileText size={14} /> TXT</button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-navy-50 rounded-xl p-1">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f.key ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className="input pl-9 !py-2 text-xs" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="text-xs text-navy-400 ml-auto">{filtered.length} ta ko'rsatilmoqda</span>
        </div>

        {filtered.length === 0 ? (
          <Empty icon={ShieldCheck} title="Jurnal bo'sh" hint="Tizimda amallar bajarilgach, ular shu yerda qayd etiladi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">#</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Foydalanuvchi</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Amal</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Obyekt</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const actionColor = r.action?.includes('login') ? 'bg-blue-100 text-blue-700' :
                    r.action?.includes('create') ? 'bg-emerald-100 text-emerald-700' :
                    r.action?.includes('update') ? 'bg-amber-100 text-amber-700' :
                    r.action?.includes('delete') ? 'bg-red-100 text-red-600' :
                    r.action?.includes('give') ? 'bg-gold-100 text-gold-700' :
                    'bg-navy-100 text-navy-600';
                  return (
                    <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition animate-fade" style={{ animationDelay: `${i * 15}ms` }}>
                      <td className="px-4 py-3 text-navy-300 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold">{(r.actor || '?')[0]}</div>
                          <span className="font-semibold text-navy-800">{r.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`chip shadow-sm ${actionColor}`}>{r.action}</span></td>
                      <td className="px-4 py-3 text-navy-500">{r.entity}</td>
                      <td className="px-4 py-3 text-navy-400 tabular-nums font-mono text-xs">{r.at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
