import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Brain, TrendingUp, TrendingDown, Minus, Download, Pencil, CalendarDays, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { money, compactMoney } from '../lib/format.js';
import { RESOURCES } from '../config/resources.js';
import GroupAttendanceCalendar from './GroupAttendanceCalendar.jsx';

const scheduleCfg = RESOURCES.teacher_schedule;

const SHIFTS = [
  { key: 'morning', label: '🌅 Ertalabki', range: [8, 12], bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'day', label: '☀️ Kunduzgi', range: [12, 16], bg: 'bg-amber-50 border-amber-200' },
  { key: 'evening', label: '🌙 Kechki', range: [16, 22], bg: 'bg-indigo-50 border-indigo-200' },
];

function shiftOf(time) {
  const h = parseInt((time || '').split(':')[0]) || 0;
  return SHIFTS.find((s) => h >= s.range[0] && h < s.range[1])?.key || 'day';
}

// ── O'qituvchi jadvali (grid ko'rinish, 3 smena) ──
export function TeacherGrid() {
  const [data, setData] = useState(null);
  const [shift, setShift] = useState('all');
  const [editModal, setEditModal] = useState(null); // schedule row being edited
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [calendarGroup, setCalendarGroup] = useState(null);

  async function load() {
    const [sch, st] = await Promise.all([
      api.get('/teacher_schedule').catch(() => []),
      api.get('/students').catch(() => []),
    ]);
    setData({ sch: sch || [], st: st || [] });
  }
  useEffect(() => { load(); }, []);

  function openEdit(row) {
    const init = {};
    scheduleCfg.fields.forEach((f) => { init[f.key] = row[f.key] ?? ''; });
    setForm({ ...init, id: row.id }); setErr(''); setEditModal(row);
  }

  async function saveEdit() {
    if (saving) return;
    const required = scheduleCfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      await api.put(`/teacher_schedule/${form.id}`, form);
      setEditModal(null); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (!data) return <Spinner />;

  const teachers = [...new Set(data.sch.map((r) => r.teacher))];
  const rows = shift === 'all' ? data.sch : data.sch.filter((r) => shiftOf(r.time_start) === shift);

  // Har bir o'qituvchi uchun statistika
  function statsFor(teacher) {
    const groups = [...new Set(data.sch.filter((r) => r.teacher === teacher).map((r) => r.group_name))];
    const studs = data.st.filter((s) => groups.includes(s.group_name));
    const active = studs.filter((s) => s.status === 'active' && (s.progress || 0) >= 50).length;
    const passive = studs.filter((s) => s.status === 'active' && (s.progress || 0) < 50).length;
    const inactive = studs.filter((s) => s.status !== 'active').length;
    const total = studs.length || 1;
    return { total: studs.length, active, passive, inactive,
      aPct: Math.round(active / total * 100), pPct: Math.round(passive / total * 100), iPct: Math.round(inactive / total * 100) };
  }

  return (
    <div>
      <PageHeader icon={CalendarClock} title="O'qituvchi jadvali"
        subtitle="Ustozlar va guruhlar jadvali · 3 smena · Aktiv / Passiv / Noaktiv" />

      {/* Smena filtri */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setShift('all')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${shift === 'all' ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'bg-white border border-navy-100 text-navy-600'}`}>
          Barcha smena
        </button>
        {SHIFTS.map((s) => (
          <button key={s.key} onClick={() => setShift(s.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${shift === s.key ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'bg-white border border-navy-100 text-navy-600'}`}>
            {s.label} <span className="opacity-70 font-normal">{s.range[0]}:00–{s.range[1]}:00</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-4">
        {teachers.map((t, ti) => {
          const st = statsFor(t);
          const mine = rows.filter((r) => r.teacher === t);
          if (!mine.length) return null;
          return (
            <div key={t} className="card p-4 animate-fade" style={{ animationDelay: `${ti * 40}ms` }}>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-navy-100">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold">{t[0]}</div>
                <div>
                  <div className="font-bold text-navy-800">{t}</div>
                  <div className="text-xs text-navy-400">{st.total} o'quvchi · {mine.length} dars</div>
                </div>
                {/* Statistika chiplari */}
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  <span className="chip bg-emerald-500 text-white">Aktiv: {st.aPct}% ({st.active})</span>
                  <span className="chip bg-amber-400 text-white">Passiv: {st.pPct}% ({st.passive})</span>
                  <span className="chip bg-red-500 text-white">Noaktiv: {st.iPct}% ({st.inactive})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {mine.map((r) => {
                  const sh = SHIFTS.find((x) => x.key === shiftOf(r.time_start));
                  return (
                    <div key={r.id} onClick={() => openEdit(r)}
                      className={`group relative rounded-xl border px-3 py-2 min-w-[150px] cursor-pointer hover:shadow-md transition ${sh?.bg}`}>
                      <button onClick={(e) => { e.stopPropagation(); setCalendarGroup({ name: r.group_name }); }}
                        className="absolute top-1.5 right-1.5 grid place-items-center w-6 h-6 rounded-lg bg-white/70 text-navy-400 hover:text-gold-600 hover:bg-white opacity-0 group-hover:opacity-100 transition" title="Davomat kalendari">
                        <CalendarDays size={12} />
                      </button>
                      <Pencil size={10} className="absolute top-2 left-2 text-navy-300 opacity-0 group-hover:opacity-100 transition" />
                      <div className="text-[11px] font-bold text-navy-500">{r.day}</div>
                      <div className="text-sm font-bold text-navy-800">{r.time_start}–{r.time_end}</div>
                      <div className="text-xs text-navy-600 truncate">{r.group_name}</div>
                      <div className="text-[11px] text-navy-400">{r.room}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editModal} title={`Jadvalni tahrirlash: ${editModal?.teacher || ''}`} onClose={() => setEditModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setEditModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveEdit} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          {scheduleCfg.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
              {f.type === 'select' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </Modal>

      {calendarGroup && (
        <GroupAttendanceCalendar
          group={calendarGroup}
          students={data.st.filter((s) => s.group_name === calendarGroup.name)}
          onClose={() => setCalendarGroup(null)}
        />
      )}
    </div>
  );
}

// ── AI Analitika (tahlil bilan) ──
export function AiAnalytics() {
  const [d, setD] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/students').catch(() => []),
      api.get('/stats').catch(() => null),
      api.get('/payments').catch(() => []),
      api.get('/attendance_analytics').catch(() => []),
    ]).then(([st, s, p, aa]) => setD({ st: st || [], s, p: p || [], aa: aa || [] }));
  }, []);

  const insights = useMemo(() => {
    if (!d) return null;
    const st = d.st;
    const sorted = [...st].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    const rising = sorted.filter((x) => (x.streak || 0) >= 7 && (x.progress || 0) >= 60).slice(0, 5);
    const falling = [...st].filter((x) => (x.streak || 0) <= 3 || (x.progress || 0) < 40).slice(0, 5);
    const risk = st.filter((x) => !x.paid || x.status !== 'active');
    const avgProgress = Math.round(st.reduce((a, x) => a + (x.progress || 0), 0) / (st.length || 1));
    return { top: sorted.slice(0, 5), rising, falling, risk, avgProgress };
  }, [d]);

  const progressBuckets = useMemo(() => {
    if (!d) return [];
    const buckets = [
      { label: '0-25%', min: 0, max: 25, count: 0 },
      { label: '26-50%', min: 26, max: 50, count: 0 },
      { label: '51-75%', min: 51, max: 75, count: 0 },
      { label: '76-100%', min: 76, max: 100, count: 0 },
    ];
    for (const s of d.st) {
      const p = s.progress || 0;
      const b = buckets.find((b) => p >= b.min && p <= b.max);
      if (b) b.count++;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({ ...b, pct: Math.round((b.count / max) * 100) }));
  }, [d]);

  async function generateAiSummary() {
    if (!insights) return;
    setAiLoading(true); setAiSummary('');
    const prompt = `Quyidagi ma'lumotlar asosida menejment uchun 3-4 gapli, aniq va amaliy xulosa/tavsiya yoz (o'zbek tilida, sarlavhasiz, ro'yxatsiz, oddiy matn sifatida):
O'quvchilar: ${d.s?.students || 0} ta, faol: ${d.s?.activeStudents || 0} ta.
O'rtacha progress: ${insights.avgProgress}%.
Daromad: ${money(d.s?.revenue || 0)}.
Xavf guruhida (to'lov qarzi yoki nofaol): ${insights.risk.length} ta o'quvchi.
O'sishda: ${insights.rising.length} ta o'quvchi (yuqori streak va progress).
E'tibor talab qiladi: ${insights.falling.length} ta o'quvchi (past streak yoki progress).`;
    try {
      await api.aiChatStream({ message: prompt, history: [], session: 'analytics-summary-' + Date.now() }, (full) => setAiSummary(full));
    } catch (e) { setAiSummary('❌ ' + e.message); }
    setAiLoading(false);
  }

  useEffect(() => { if (insights && !aiSummary && !aiLoading) generateAiSummary(); }, [insights]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d || !insights) return <Spinner />;

  function exportMonthly() {
    const now = new Date();
    const L = [
      'ISO TERMIZY AVLODLARI — OYLIK HISOBOT',
      `Sana: ${now.toISOString().slice(0, 10)}`,
      '='.repeat(50), '',
      `O'quvchilar: ${d.s?.students || 0} (faol: ${d.s?.activeStudents || 0})`,
      `O'qituvchilar: ${d.s?.teachers || 0}`,
      `Guruhlar: ${d.s?.groups || 0}`,
      `Daromad: ${money(d.s?.revenue || 0)}`,
      `O'rtacha progress: ${insights.avgProgress}%`, '',
      '--- ENG YAXSHI O\'QUVCHILAR ---',
      ...insights.top.map((x, i) => `${i + 1}. ${x.full_name} — ${x.progress}% · ${x.points} ball · ${x.group_name}`), '',
      '--- O\'SISHDAGI O\'QUVCHILAR ---',
      ...insights.rising.map((x) => `+ ${x.full_name} — streak ${x.streak} kun, progress ${x.progress}%`), '',
      '--- E\'TIBOR TALAB QILADI ---',
      ...insights.falling.map((x) => `! ${x.full_name} — streak ${x.streak}, progress ${x.progress}%`), '',
      '--- QARZDORLAR / NOFAOL ---',
      ...insights.risk.map((x) => `- ${x.full_name} (${x.group_name}) — ${x.paid ? 'to\'langan' : 'QARZDOR'}, ${x.status}`),
    ];
    const blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `oylik_hisobot_${now.toISOString().slice(0, 7)}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader icon={Brain} title="AI Analitika" subtitle="Aqlli tahlil — kim o'sadi, kim e'tibor talab qiladi"
        actions={<button className="btn-gold" onClick={exportMonthly}><Download size={16} /> Oylik hisobot</button>} />

      {/* AI xulosasi */}
      <div className="card p-5 mb-6 bg-gradient-to-br from-gold-50 to-white border-gold/30">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-navy-800 font-display text-lg">
            <Sparkles size={18} className="text-gold-500" /> AI xulosasi
          </div>
          <button onClick={generateAiSummary} disabled={aiLoading} className="text-navy-400 hover:text-gold-600 transition" title="Qayta yaratish">
            <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm text-navy-600 leading-relaxed whitespace-pre-line">
          {aiSummary || (aiLoading ? 'AI tahlil qilmoqda...' : "Hozircha xulosa yo'q")}
          {aiLoading && <span className="inline-block w-1.5 h-4 bg-gold-400 ml-0.5 align-middle animate-pulse" />}
        </p>
      </div>

      {/* Progress taqsimoti */}
      <div className="card p-5 mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-4">O'quvchilar progress taqsimoti</h3>
        <div className="space-y-2.5">
          {progressBuckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-xs font-semibold text-navy-500">{b.label}</div>
              <div className="flex-1 h-5 rounded-lg bg-navy-50 overflow-hidden">
                <div className="h-full rounded-lg bg-gold-500 flex items-center justify-end px-2 transition-all" style={{ width: `${Math.max(b.count ? 6 : 0, b.pct)}%` }}>
                  {b.count > 0 && <span className="text-[10px] font-bold text-white">{b.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Umumiy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['👥', "O'quvchilar", d.s?.students || 0, ''],
          ['📈', "O'rtacha progress", insights.avgProgress + '%', ''],
          ['💰', 'Daromad', compactMoney(d.s?.revenue || 0), ''],
          ['⚠️', 'Xavf guruhi', insights.risk.length, 'text-red-600'],
        ].map(([ic, label, val, cls], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-2xl mb-2">{ic}</div>
            <div className={`font-display text-2xl text-navy-800 ${cls}`}>{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* O'sishda */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-emerald-500" />
            <h3 className="font-display text-lg text-navy-800">O'sishda</h3>
          </div>
          {insights.rising.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-2">
              {insights.rising.map((x) => (
                <div key={x.id} className="flex items-center gap-3 rounded-xl bg-emerald-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500 text-white text-xs font-bold">{x.full_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{x.full_name}</div>
                    <div className="text-xs text-emerald-600">🔥 {x.streak} kun · {x.progress}%</div>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">↑</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* E'tibor talab */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-red-500" />
            <h3 className="font-display text-lg text-navy-800">E'tibor talab qiladi</h3>
          </div>
          {insights.falling.length === 0 ? <p className="text-sm text-navy-400">Hammasi yaxshi 👍</p> : (
            <div className="space-y-2">
              {insights.falling.map((x) => (
                <div key={x.id} className="flex items-center gap-3 rounded-xl bg-red-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-red-500 text-white text-xs font-bold">{x.full_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{x.full_name}</div>
                    <div className="text-xs text-red-500">streak {x.streak} · {x.progress}%</div>
                  </div>
                  <span className="text-red-500 font-bold text-sm">↓</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eng yaxshilar */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Minus size={18} className="text-gold" />
            <h3 className="font-display text-lg text-navy-800">Eng yaxshi 5</h3>
          </div>
          <div className="space-y-2">
            {insights.top.map((x, i) => (
              <div key={x.id} className="flex items-center gap-3 rounded-xl bg-gold/5 px-3 py-2.5">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800 truncate">{x.full_name}</div>
                  <div className="text-xs text-navy-400">{x.group_name}</div>
                </div>
                <span className="text-sm font-bold text-gold-600">{x.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Guruh davomat */}
      {d.aa.length > 0 && (
        <div className="card p-5 mt-6">
          <h3 className="font-display text-lg text-navy-800 mb-4">📊 Guruhlar davomati</h3>
          <div className="space-y-3">
            {d.aa.map((g) => (
              <div key={g.id} className="flex items-center gap-3">
                <div className="w-44 text-sm text-navy-600 truncate">{g.group_name}</div>
                <div className="flex-1 h-6 rounded-lg bg-navy-50 overflow-hidden">
                  <div className={`h-full rounded-lg ${g.rate >= 90 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : g.rate >= 80 ? 'bg-gradient-to-r from-gold-400 to-gold-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                    style={{ width: `${g.rate}%` }} />
                </div>
                <div className="w-16 text-right text-sm font-bold text-navy-700">{g.rate}%</div>
                <span className={`chip text-xs ${g.trend === 'yuqori' || g.trend === "o'sish" ? 'bg-emerald-100 text-emerald-700' : g.trend === 'pasayish' ? 'bg-red-100 text-red-600' : 'bg-navy-100 text-navy-600'}`}>{g.trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
