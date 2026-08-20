import { useEffect, useState } from 'react';
import { Bot, Search, Download, Hash, Wallet } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { roleColor, roleLabel } from '../config/roles.js';
import { money, compactMoney } from '../lib/format.js';

export default function AiAudit() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { api.get('/ai/log').then(setRows).catch(() => setRows([])); }, []);

  if (rows === null) return <Spinner />;

  const filtered = q.trim()
    ? rows.filter((r) => `${r.user} ${r.message} ${r.reply}`.toLowerCase().includes(q.toLowerCase()))
    : rows;

  const users = new Set(rows.map((r) => r.user));
  const totalTokens = rows.reduce((a, r) => a + (r.total_tokens || 0), 0);
  const totalCostUzs = rows.reduce((a, r) => a + (r.cost_uzs || 0), 0);

  function exportCsv() {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['Foydalanuvchi,Rol,Savol,Javob,Model,Token,Narx (som),Vaqt'];
    for (const r of filtered) lines.push([r.user, r.role, r.message, r.reply, r.model || '', r.total_tokens || 0, r.cost_uzs || 0, r.at].map(escape).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ai-auditi.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader icon={Bot} title="ISO Termizy AI Auditi" subtitle={`Kim, qachon AI'dan foydalangani — ${rows.length} ta murojaat, ${users.size} ta foydalanuvchi`}
        actions={rows.length > 0 && (
          <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> Yuklab olish</button>
        )} />

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            ['💬', 'Jami murojaat', rows.length, ''],
            ['👥', 'Foydalanuvchilar', users.size, ''],
            ['🔢', 'Jami token', compactMoney(totalTokens), ''],
            ['💸', 'Jami xarajat', totalCostUzs > 0 ? money(totalCostUzs) : 'Bepul', 'text-emerald-600'],
          ].map(([ic, label, val, cls], i) => (
            <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="text-2xl mb-2">{ic}</div>
              <div className={`font-display text-2xl text-navy-800 ${cls}`}>{val}</div>
              <div className="text-sm text-navy-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className="input pl-9 !py-2 text-xs" placeholder="Qidirish (ism, savol, javob)..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty icon={Bot} title="Hozircha yozuvlar yo'q" hint="Foydalanuvchilar ISO Termizy AI bilan suhbatlashgach, bu yerda qayd etiladi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Foydalanuvchi</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Savol</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Javob</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider"><Hash size={11} className="inline -mt-0.5" /> Token</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider"><Wallet size={11} className="inline -mt-0.5" /> Narx</th>
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(r.user || '?')[0]}</div>
                        <div>
                          <div className="font-semibold text-navy-800 whitespace-nowrap">{r.user}</div>
                          <span className={`chip ${roleColor(r.role)} text-[9px]`}>{roleLabel(r.role)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-700 max-w-xs truncate" title={r.message}>{r.message}</td>
                    <td className="px-4 py-3 text-navy-500 max-w-sm truncate" title={r.reply}>{r.reply}</td>
                    <td className="px-4 py-3 text-navy-500 tabular-nums text-xs whitespace-nowrap" title={r.model || ''}>{r.total_tokens ? r.total_tokens.toLocaleString('en-US').replace(/,/g, ' ') : '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.cost_uzs > 0 ? <span className="text-navy-700 font-semibold">{money(r.cost_uzs)}</span> : <span className="chip bg-emerald-100 text-emerald-700 text-[9px]">Bepul</span>}
                    </td>
                    <td className="px-4 py-3 text-navy-400 tabular-nums font-mono text-xs whitespace-nowrap">{r.at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
