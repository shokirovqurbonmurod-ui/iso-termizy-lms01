import { useEffect, useState } from 'react';
import { BarChart3, Download, FileText, Calendar } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const REPORT_TYPES = [
  { key: 'monthly', label: 'Oylik hisobot', icon: '📅' },
  { key: 'yearly', label: 'Yillik hisobot', icon: '📊' },
  { key: 'students', label: "O'quvchilar hisoboti", icon: '👥' },
  { key: 'teachers', label: "O'qituvchilar hisoboti", icon: '👨‍🏫' },
  { key: 'finance', label: 'Moliyaviy hisobot', icon: '💰' },
  { key: 'attendance', label: 'Davomat hisoboti', icon: '✅' },
];

export default function Reports({ menuKey }) {
  const [d, setD] = useState(null);
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(2026);
  const [repType, setRepType] = useState('monthly');

  useEffect(() => {
    Promise.all([
      api.get('/stats').catch(() => null),
      api.get('/students').catch(() => []),
      api.get('/teachers').catch(() => []),
      api.get('/payments').catch(() => []),
      api.get('/attendance_analytics').catch(() => []),
    ]).then(([stats, st, tc, py, aa]) => setD({ stats, students: st||[], teachers: tc||[], payments: py||[], attendance: aa||[] }));
  }, []);

  if (!d) return <Spinner />;

  function buildReport(type) {
    const now = new Date();
    const header = [
      '████████████████████████████████████████████████████████',
      '     ISO TERMIZY AVLODLARI — HISOBOT',
      '████████████████████████████████████████████████████████',
      `Sana: ${now.toLocaleDateString('uz-UZ')}`,
      `Hisobot turi: ${REPORT_TYPES.find(r=>r.key===type)?.label}`,
      type === 'monthly' ? `Davr: ${MONTHS[selMonth]} ${selYear}` : `Yil: ${selYear}`,
      '',
    ];

    const statsBlock = [
      '━━━ UMUMIY KO\'RSATKICHLAR ━━━',
      `O'quvchilar jami:    ${d.stats?.students || 0}`,
      `  ↳ Faol:           ${d.stats?.activeStudents || 0}`,
      `O'qituvchilar:       ${d.stats?.teachers || 0}`,
      `Guruhlar:            ${d.stats?.groups || 0}`,
      `Daromad:             ${money(d.stats?.revenue || 0)}`,
      `Kutilayotgan:        ${d.stats?.pendingPayments || 0} ta`,
      '',
    ];

    const studBlock = [
      "━━━ O'QUVCHILAR ━━━",
      ...d.students.slice(0, 20).map((s, i) =>
        `${String(i+1).padStart(2,'0')}. ${s.full_name.padEnd(22)} ${s.group_name.padEnd(28)} ${s.progress}% | 🔥${s.streak} | 🪙${s.coins}`
      ),
      d.students.length > 20 ? `   ... va yana ${d.students.length-20} ta o'quvchi` : '',
      '',
    ];

    const tcBlock = [
      "━━━ O'QITUVCHILAR ━━━",
      ...d.teachers.map((t, i) =>
        `${String(i+1).padStart(2,'0')}. ${t.full_name.padEnd(22)} ${t.langs.padEnd(18)} ⭐${t.rating}`
      ),
      '',
    ];

    const payBlock = [
      "━━━ TO'LOVLAR ━━━",
      ...d.payments.slice(0, 15).map((p, i) =>
        `${String(i+1).padStart(2,'0')}. ${p.student.padEnd(22)} ${money(p.amount).padEnd(14)} ${p.method || '—'}  ${p.date || ''}`
      ),
      '',
    ];

    const attBlock = [
      '━━━ DAVOMAT ANALITIKA ━━━',
      ...d.attendance.map((a) =>
        `${a.group_name.padEnd(32)} ${String(a.rate)+'%'} (${a.trend})`
      ),
      '',
    ];

    const footer = [
      '────────────────────────────────────────────────────────',
      `Tuzilgan: ${now.toLocaleString('uz-UZ')}`,
      `Tuzuvchi: ISO Termizy Avlodlari · Tizim`,
      '████████████████████████████████████████████████████████',
    ];

    let lines = [...header, ...statsBlock];
    if (type === 'students' || type === 'monthly' || type === 'yearly') lines = [...lines, ...studBlock];
    if (type === 'teachers' || type === 'yearly') lines = [...lines, ...tcBlock];
    if (type === 'finance' || type === 'monthly' || type === 'yearly') lines = [...lines, ...payBlock];
    if (type === 'attendance' || type === 'yearly') lines = [...lines, ...attBlock];
    lines = [...lines, ...footer];

    const fileName = type === 'monthly'
      ? `hisobot_${MONTHS[selMonth].toLowerCase()}_${selYear}.txt`
      : `hisobot_yillik_${selYear}.txt`;

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader icon={BarChart3} title="Hisobotlar" subtitle="Oylik, yillik va maxsus hisobotlarni yuklab oling" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hisobot tanlash */}
        <div className="lg:col-span-1">
          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">📋 Hisobot turi</h3>
            <div className="space-y-2">
              {REPORT_TYPES.map((r) => (
                <button key={r.key} onClick={() => setRepType(r.key)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition text-left ${
                    repType === r.key ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'}`}>
                  <span className="text-lg">{r.icon}</span> {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sozlamalar + preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">⚙️ Sozlamalar</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Yil</label>
                <select className="input !py-2.5" value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}>
                  {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {(repType === 'monthly' || repType === 'finance') && (
                <div>
                  <label className="label">Oy</label>
                  <select className="input !py-2.5" value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button className="btn-gold mt-5 w-full" onClick={() => buildReport(repType)}>
              <Download size={18} /> {REPORT_TYPES.find(r=>r.key===repType)?.label} — TXT yuklab olish
            </button>
          </div>

          {/* Statistika preview */}
          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4">📊 Tezkor ma'lumot</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                [`👥 O'quvchilar`, d.stats?.students || 0],
                ['🎓 O\'qituvchilar', d.stats?.teachers || 0],
                ['👥 Guruhlar', d.stats?.groups || 0],
                ['💰 Daromad', money(d.stats?.revenue || 0)],
                ['✅ Faol', d.stats?.activeStudents || 0],
                ['⏳ Kutilmoqda', d.stats?.pendingPayments || 0],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl bg-navy-50/60 px-4 py-3">
                  <div className="text-xs text-navy-400">{label}</div>
                  <div className="font-bold text-navy-800 text-lg">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* O'quvchilar hisobot tablosi */}
          {(repType === 'students' || repType === 'monthly') && (
            <div className="card p-5">
              <h3 className="font-display text-lg text-navy-800 mb-4">👥 O'quvchilar (top 10)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-navy-100">
                    {["#","Ism","Guruh","Progress","Streak","Coins"].map(h=><th key={h} className="px-2 py-2 text-left font-bold text-navy-400">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {d.students.slice(0,10).map((s,i)=>(
                      <tr key={s.id} className="border-b border-navy-50 hover:bg-gold/[.02]">
                        <td className="px-2 py-2 text-navy-400">{i+1}</td>
                        <td className="px-2 py-2 font-semibold text-navy-800">{s.full_name}</td>
                        <td className="px-2 py-2 text-navy-500">{s.group_name}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full" style={{width:`${s.progress||0}%`}} />
                            </div>
                            <span className="text-navy-600 font-bold">{s.progress||0}%</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-orange-600">🔥{s.streak}</td>
                        <td className="px-2 py-2 text-gold-600">🪙{s.coins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
