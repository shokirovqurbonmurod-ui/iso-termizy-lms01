import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Plus, Calendar, ArrowLeft, Users, TrendingUp, Coins, Save } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const TYPES = ['Progress', 'Placement', 'Mock', 'Final', 'Practice'];
const TYPE_COLOR = { Progress: 'bg-blue-100 text-blue-700', Placement: 'bg-violet-100 text-violet-700', Mock: 'bg-amber-100 text-amber-700', Final: 'bg-red-100 text-red-600', Practice: 'bg-emerald-100 text-emerald-700' };
const emptyForm = { title: '', group_name: '', date: new Date().toISOString().slice(0, 10), type: 'Progress', max_score: 100, coin_reward: 30 };
const PASS_PCT = 60;

function isPast(e) { return e.date && new Date(e.date) < new Date(new Date().toDateString()); }
function computeGrade(pct) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}
const GRADE_STYLE = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-600' };

export default function ExamsPage() {
  const [exams, setExams] = useState(null);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingStudent, setSavingStudent] = useState(null);

  async function load() {
    const [e, g, s, r] = await Promise.all([
      api.get('/exams?limit=500').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/exam_results?limit=2000').catch(() => []),
    ]);
    setExams((e || []).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setGroups(g || []); setStudents(s || []);
    setResults((r || []).filter((x) => x.exam_id));
  }
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => (exams || []).filter((e) => !isPast(e)), [exams]);
  const past = useMemo(() => (exams || []).filter(isPast).reverse(), [exams]);

  function roster(groupName) { return students.filter((s) => s.group_name === groupName); }
  function resultsFor(examId) { return results.filter((r) => String(r.exam_id) === String(examId)); }
  function resultFor(examId, studentName) { return resultsFor(examId).find((r) => r.student === studentName); }

  function openAdd() {
    setForm({ ...emptyForm, group_name: groups[0]?.name || '' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/exams', { ...form, max_score: Number(form.max_score) || 100, coin_reward: Math.min(200, Number(form.coin_reward) || 0), status: 'planned' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function saveScore(exam, studentName) {
    const raw = drafts[studentName];
    const maxScore = Number(exam.max_score) || 100;
    const score = Math.max(0, Math.min(maxScore, Number(raw)));
    if (raw === undefined || raw === '' || Number.isNaN(score)) return;
    setSavingStudent(studentName);
    try {
      const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const grade = computeGrade(pct);
      const existing = resultFor(exam.id, studentName);
      if (existing) {
        await api.put(`/exam_results/${existing.id}`, { score, grade, status: 'graded' });
      } else {
        await api.post('/exam_results', {
          student: studentName, exam: exam.title, exam_id: exam.id, score, grade,
          date: new Date().toISOString().slice(0, 10), status: 'graded',
        });
        if (pct >= PASS_PCT && Number(exam.coin_reward) > 0) {
          const student = students.find((s) => s.full_name === studentName && s.group_name === exam.group_name) || students.find((s) => s.full_name === studentName);
          if (student) await api.post('/coins/give', { student_id: student.id, amount: Number(exam.coin_reward), reason: `Imtihon: ${exam.title}` }).catch(() => {});
        }
      }
      setDrafts((d) => { const n = { ...d }; delete n[studentName]; return n; });
      await load();
    } catch (e) { alert(e.message); }
    setSavingStudent(null);
  }

  function Row({ e }) {
    const forExam = resultsFor(e.id);
    const size = roster(e.group_name).length || 0;
    return (
      <button onClick={() => setDetail(e)} className="w-full flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3 hover:bg-navy-100/60 transition text-left">
        <div className="flex items-center gap-1.5 text-xs font-bold text-navy-800 w-24 shrink-0"><Calendar size={12} /> {e.date}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-navy-800 truncate">{e.title}</div>
          <div className="text-[11px] text-navy-400">{e.group_name || 'Umumiy'} · maks {e.max_score} ball {forExam.length > 0 && `· ${forExam.length}${size ? `/${size}` : ''} natija`}</div>
        </div>
        {Number(e.coin_reward) > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600 shrink-0"><Coins size={12} /> +{e.coin_reward}</span>}
        <span className={`chip text-[9px] shrink-0 ${TYPE_COLOR[e.type] || ''}`}>{e.type}</span>
      </button>
    );
  }

  if (exams === null) return <Spinner />;

  // ── Ekran: roster (ball kiritish) ──
  if (detail) {
    const group = roster(detail.group_name);
    const forExam = resultsFor(detail.id);
    const maxScore = Number(detail.max_score) || 100;
    const avgPct = forExam.length ? Math.round(forExam.reduce((sum, r) => sum + (Number(r.score) || 0) / maxScore * 100, 0) / forExam.length) : 0;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <PageHeader icon={FileCheck2} title={detail.title} subtitle={`${detail.type} · ${detail.group_name || 'Umumiy'} · ${detail.date} · maks ${maxScore} ball`}
          actions={<div className="flex items-center gap-3 text-xs text-navy-500">
            <span className="flex items-center gap-1"><Users size={13} /> {forExam.length}/{group.length || 0}</span>
            <span className="flex items-center gap-1"><TrendingUp size={13} /> {avgPct}% o'rtacha</span>
            {Number(detail.coin_reward) > 0 && <span className="chip bg-gold/10 text-gold-700 flex items-center gap-1"><Coins size={12} /> +{detail.coin_reward} ({'>='}{PASS_PCT}%)</span>}
          </div>} />
        {group.length === 0 ? <Empty icon={Users} title="Guruhda o'quvchi yo'q" /> : (
          <div className="space-y-1.5">
            {group.map((s) => {
              const r = resultFor(detail.id, s.full_name);
              const draft = drafts[s.full_name] ?? (r ? String(r.score) : '');
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{s.full_name[0]}</div>
                  <span className="flex-1 text-sm font-semibold text-navy-800 truncate">{s.full_name}</span>
                  {r?.grade && <span className={`chip text-[10px] shrink-0 ${GRADE_STYLE[r.grade]}`}>{r.grade}</span>}
                  <input type="number" min={0} max={maxScore} placeholder={`/${maxScore}`}
                    className="input !py-1.5 !w-20 text-center text-sm shrink-0"
                    value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [s.full_name]: e.target.value }))} />
                  <button onClick={() => saveScore(detail, s.full_name)} disabled={savingStudent === s.full_name}
                    className="btn-gold !py-1.5 !px-3 text-[11px] shrink-0">
                    <Save size={12} /> {savingStudent === s.full_name ? '...' : 'Saqlash'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: imtihonlar kalendari ──
  return (
    <div>
      <PageHeader icon={FileCheck2} title="Imtihonlar" subtitle="Rejalashtirilgan imtihonlar va natijalar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi imtihon</button>} />

      <div className="mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-3">Yaqinlashayotgan</h3>
        {upcoming.length === 0 ? <Empty icon={FileCheck2} title="Rejalashtirilgan imtihon yo'q" /> : (
          <div className="space-y-2">{upcoming.map((e) => <Row key={e.id} e={e} />)}</div>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">O'tgan imtihonlar</h3>
          <div className="space-y-2">{past.slice(0, 15).map((e) => <Row key={e.id} e={e} />)}</div>
        </div>
      )}

      <Modal open={modal} title="Yangi imtihon" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Imtihon nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              <option value="">Umumiy</option>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Maksimal ball</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Coin mukofoti ({'>='}{PASS_PCT}% ballga)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.coin_reward} onChange={(e) => setForm({ ...form, coin_reward: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
