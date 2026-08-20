import { useEffect, useMemo, useState } from 'react';
import { Star, Plus, Trophy, TrendingDown, CalendarDays } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ y: d.getFullYear(), m: d.getMonth(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }

function scoreDot(score) {
  if (score >= 4.5) return 'bg-emerald-500';
  if (score >= 3.5) return 'bg-teal-400';
  if (score >= 2.5) return 'bg-amber-400';
  if (score >= 1.5) return 'bg-orange-500';
  return 'bg-red-500';
}
function scoreColor(score) {
  if (score >= 4.5) return 'from-emerald-400 to-emerald-500';
  if (score >= 3.5) return 'from-teal-400 to-teal-500';
  if (score >= 2.5) return 'from-gold-400 to-gold-500';
  return 'from-red-400 to-red-500';
}

export default function LessonRatings() {
  const { user } = useAuth();
  const canRate = ['director', 'super_admin', 'admin', 'academic_manager', 'head_teacher'].includes(user.role);
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const today = new Date();
  const [sel, setSel] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [rows, setRows] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ teacher: '', group_name: '', date: today.toISOString().slice(0, 10), score: 5, punctuality: 90, engagement: 90, methodology: 90, comment: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, t, g] = await Promise.all([
      api.get('/lesson_ratings?limit=1000').catch(() => []),
      api.get('/teachers').catch(() => []),
      api.get('/groups').catch(() => []),
    ]);
    setRows(r || []); setTeachers(t || []); setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  const from = `${monthKey(sel.y, sel.m)}-01`;
  const to = `${monthKey(sel.y, sel.m)}-${String(daysInMonth(sel.y, sel.m)).padStart(2, '0')}`;
  const monthRows = useMemo(() => (rows || []).filter((r) => r.date >= from && r.date <= to), [rows, from, to]);

  const stats = useMemo(() => {
    if (!monthRows.length) return null;
    const avg = (monthRows.reduce((a, r) => a + (Number(r.score) || 0), 0) / monthRows.length).toFixed(1);
    const byTeacher = {};
    for (const r of monthRows) {
      if (!byTeacher[r.teacher]) byTeacher[r.teacher] = [];
      byTeacher[r.teacher].push(Number(r.score) || 0);
    }
    const teacherAvgs = Object.entries(byTeacher).map(([teacher, scores]) => ({
      teacher, avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    })).sort((a, b) => b.avg - a.avg);
    return { avg, best: teacherAvgs[0], worst: teacherAvgs[teacherAvgs.length - 1] };
  }, [monthRows]);

  const days = useMemo(() => Array.from({ length: daysInMonth(sel.y, sel.m) }, (_, i) => i + 1), [sel]);
  const dateStr = (day) => `${monthKey(sel.y, sel.m)}-${String(day).padStart(2, '0')}`;

  const byTeacherDay = useMemo(() => {
    const map = {};
    for (const r of monthRows) {
      if (!map[r.teacher]) map[r.teacher] = {};
      if (!map[r.teacher][r.date]) map[r.teacher][r.date] = [];
      map[r.teacher][r.date].push(Number(r.score) || 0);
    }
    return map;
  }, [monthRows]);

  const activeTeachers = useMemo(() => teachers.filter((t) => byTeacherDay[t.full_name]), [teachers, byTeacherDay]);

  function openRate() {
    setForm({ teacher: '', group_name: '', date: today.toISOString().slice(0, 10), score: 5, punctuality: 90, engagement: 90, methodology: 90, comment: '' });
    setErr(''); setModal(true);
  }

  async function save() {
    if (!form.teacher || !form.group_name) { setErr("O'qituvchi va guruhni tanlang"); return; }
    setSaving(true);
    try {
      await api.post('/lesson_ratings', { ...form, rated_by: user.full_name });
      setModal(false);
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  const teacherGroups = groups.filter((g) => g.teacher === form.teacher);

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Star} title="Dars baholash" subtitle="O'qituvchilarning dars sifati — oylik kalendar va reyting"
        actions={canRate && <button className="btn-gold" onClick={openRate}><Plus size={16} /> Yangi baholash</button>} />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card stat-glow p-5">
            <div className="text-2xl mb-2">⭐</div>
            <div className="font-display text-2xl text-navy-800">{stats.avg} / 5</div>
            <div className="text-sm text-navy-400">O'rtacha baho ({monthOptions.find((o) => o.y === sel.y && o.m === sel.m)?.label})</div>
          </div>
          <div className="card stat-glow p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2"><Trophy size={20} /></div>
            <div className="font-display text-lg text-navy-800 truncate">{stats.best?.teacher}</div>
            <div className="text-sm text-navy-400">Eng yuqori — {stats.best?.avg.toFixed(1)} / 5</div>
          </div>
          <div className="card stat-glow p-5">
            <div className="flex items-center gap-2 text-red-500 mb-2"><TrendingDown size={20} /></div>
            <div className="font-display text-lg text-navy-800 truncate">{stats.worst?.teacher}</div>
            <div className="text-sm text-navy-400">E'tibor talab — {stats.worst?.avg.toFixed(1)} / 5</div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <CalendarDays size={16} className="text-gold shrink-0" />
          {monthOptions.map((o) => {
            const active = o.y === sel.y && o.m === sel.m;
            return (
              <button key={`${o.y}-${o.m}`} onClick={() => setSel({ y: o.y, m: o.m })}
                className={`shrink-0 chip text-xs transition ${active ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>
                {o.label}
              </button>
            );
          })}
        </div>

        {activeTeachers.length === 0 ? (
          <Empty icon={Star} title="Bu oyda baholash yo'q" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-navy-100">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-navy-50/70">
                  <th className="sticky left-0 bg-navy-50/70 px-3 py-2.5 text-left font-bold text-navy-500 min-w-[180px] z-10">O'QITUVCHI</th>
                  {days.map((d) => <th key={d} className="px-2 py-2.5 font-bold text-navy-500 text-center min-w-[36px]">{String(d).padStart(2, '0')}</th>)}
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((t) => (
                  <tr key={t.id} className="border-b border-navy-50 hover:bg-gold/[.02]">
                    <td className="sticky left-0 bg-white px-3 py-2 whitespace-nowrap font-semibold text-navy-800">{t.full_name}</td>
                    {days.map((d) => {
                      const scores = byTeacherDay[t.full_name]?.[dateStr(d)];
                      const avg = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                      return (
                        <td key={d} className="px-2 py-2 text-center">
                          <span className={`inline-block w-4 h-4 rounded-full ${avg ? scoreDot(avg) : 'border-2 border-navy-100'}`} title={avg ? `${avg.toFixed(1)} / 5` : ''} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5 mt-6">
        <h3 className="font-display text-lg text-navy-800 mb-4">🏆 Oylik reyting</h3>
        {!stats ? <p className="text-sm text-navy-400">Bu oyda baholash yo'q</p> : (
          <div className="space-y-3">
            {Object.entries(byTeacherDay).map(([teacher]) => {
              const scores = monthRows.filter((r) => r.teacher === teacher).map((r) => Number(r.score) || 0);
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              return (
                <div key={teacher} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-sm font-semibold text-navy-700 truncate">{teacher}</div>
                  <div className="flex-1 h-6 rounded-lg bg-navy-50 overflow-hidden">
                    <div className={`h-full rounded-lg bg-gradient-to-r ${scoreColor(avg)} flex items-center justify-end px-2`} style={{ width: `${Math.max(8, avg / 5 * 100)}%` }}>
                      <span className="text-[10px] font-bold text-white">{avg.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-[11px] text-navy-400">{scores.length} baho</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modal} title="Yangi dars baholash" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">O'qituvchi</label>
            <select className="input !py-2.5" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value, group_name: '' })}>
              <option value="">— tanlang —</option>
              {teachers.map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} disabled={!form.teacher}>
              <option value="">— tanlang —</option>
              {teacherGroups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Umumiy baho</label>
            <div className="flex items-center gap-1 pt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, score: n })}>
                  <Star size={22} className={n <= form.score ? 'fill-gold-500 text-gold-500' : 'text-navy-200'} />
                </button>
              ))}
            </div>
          </div>
        </div>
        {['punctuality', 'engagement', 'methodology'].map((k) => (
          <div key={k} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">{k === 'punctuality' ? 'Punktuallik' : k === 'engagement' ? 'Faollik/qiziqarli' : 'Metodika'}</label>
              <span className="text-xs font-bold text-gold-600">{form[k]}%</span>
            </div>
            <input type="range" min="0" max="100" value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} className="w-full accent-[#C6A15B]" />
          </div>
        ))}
        <label className="label">Izoh (ixtiyoriy)</label>
        <textarea className="input !py-2.5" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
      </Modal>
    </div>
  );
}
