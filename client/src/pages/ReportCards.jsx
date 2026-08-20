import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { downloadReportCardPdf } from '../lib/reportCard.js';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const PRESENT = ['active', 'passive'];

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i >= -6; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}
function daysInMonth(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); }

export default function ReportCards() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(monthOptions[0].key);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { api.get('/students').then((s) => setStudents(s || [])).catch(() => setStudents([])); }, []);

  const filtered = search.trim() ? students.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase())) : students;

  async function loadCard(student) {
    setSelected(student);
    setData(null);
    const from = `${month}-01`;
    const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
    const [attendance, exams, timeline] = await Promise.all([
      api.get(`/attendance-daily?student_id=${student.id}&from=${from}&to=${to}`).catch(() => []),
      api.get(`/exam_results?q=${encodeURIComponent(student.full_name)}`).catch(() => []),
      api.get(`/student_timeline?q=${encodeURIComponent(student.full_name)}`).catch(() => []),
    ]);
    const present = (attendance || []).filter((a) => PRESENT.includes(a.status)).length;
    const attendancePct = attendance?.length ? Math.round((present / attendance.length) * 100) : 0;
    const examScores = (exams || []).map((e) => Number(e.score) || 0);
    const examAvg = examScores.length ? (examScores.reduce((a, b) => a + b, 0) / examScores.length).toFixed(1) : '—';
    const comments = (timeline || []).filter((t) => t.type === 'izoh').slice(0, 10);
    setData({ attendancePct, examAvg, exams: exams || [], comments, attendanceCount: attendance?.length || 0 });
  }

  useEffect(() => { if (selected) loadCard(selected); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  function downloadPdf() {
    if (!selected || !data) return;
    setGenerating(true);
    try {
      downloadReportCardPdf({
        studentName: selected.full_name, groupName: selected.group_name,
        periodLabel: monthOptions.find((o) => o.key === month)?.label,
        attendancePct: data.attendancePct, examAvg: data.examAvg, exams: data.exams, comments: data.comments,
      });
    } finally { setGenerating(false); }
  }

  return (
    <div>
      <PageHeader icon={FileText} title="Tabelnomalar" subtitle="O'quvchi bo'yicha davomat + baholar + izohlar — PDF tabelnoma yuklab oling" />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {monthOptions.map((o) => (
          <button key={o.key} onClick={() => setMonth(o.key)}
            className={`shrink-0 chip text-xs transition ${month === o.key ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className="input pl-9 !py-2 text-sm" placeholder="O'quvchi qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[28rem] overflow-y-auto">
            {filtered.map((s) => (
              <div key={s.id} onClick={() => loadCard(s)}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition ${selected?.id === s.id ? 'bg-gold/10 text-gold-700 font-bold' : 'hover:bg-navy-50 text-navy-700'}`}>
                {s.full_name} <span className="text-[10px] text-navy-400">· {s.group_name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <Empty icon={FileText} title="O'quvchi tanlang" hint="Chapdagi ro'yxatdan tabelnoma ko'rmoqchi bo'lgan o'quvchini tanlang" />
          ) : data === null ? <Spinner /> : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-display text-xl text-navy-800">{selected.full_name}</div>
                  <div className="text-xs text-navy-400">{selected.group_name} · {monthOptions.find((o) => o.key === month)?.label}</div>
                </div>
                <button onClick={downloadPdf} disabled={generating} className="btn-gold !py-2 !px-4 text-xs"><Download size={14} /> PDF yuklab olish</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
                  <div className="font-display text-2xl text-navy-800">{data.attendancePct}%</div>
                  <div className="text-[10px] text-navy-400">Davomat ({data.attendanceCount} kun)</div>
                </div>
                <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
                  <div className="font-display text-2xl text-navy-800">{data.examAvg}</div>
                  <div className="text-[10px] text-navy-400">O'rtacha ball</div>
                </div>
              </div>

              <div className="label mb-2">Imtihon natijalari</div>
              {data.exams.length === 0 ? <p className="text-sm text-navy-400 mb-5">Yozuv yo'q</p> : (
                <div className="space-y-1.5 mb-5">
                  {data.exams.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/40 px-3 py-2">
                      <span className="text-navy-600">{e.date} — {e.exam}</span>
                      <span className="font-bold text-navy-800">{e.score}{e.grade ? ` (${e.grade})` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="label mb-2">Izohlar</div>
              {data.comments.length === 0 ? <p className="text-sm text-navy-400">Izoh yo'q</p> : (
                <div className="space-y-1.5">
                  {data.comments.map((c) => (
                    <div key={c.id} className="text-sm rounded-lg bg-navy-50/40 px-3 py-2">
                      <span className="text-[10px] text-navy-400">{c.date}</span> — <span className="text-navy-600">{c.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
