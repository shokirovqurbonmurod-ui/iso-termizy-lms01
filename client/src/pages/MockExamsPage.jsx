import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Plus, Users, TrendingUp, ArrowLeft, Coins, Save } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const emptyForm = { title: '', subject: '', group_name: '', date: new Date().toISOString().slice(0, 10), coin_reward: 30 };
const PASS_SCORE = 60;

function computeGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
const GRADE_STYLE = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', F: 'bg-red-100 text-red-600' };

export default function MockExamsPage() {
  const [rows, setRows] = useState(null);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [drafts, setDrafts] = useState({}); // { studentName: score string being edited }
  const [savingStudent, setSavingStudent] = useState(null);

  async function load() {
    const [r, g, s, e] = await Promise.all([
      api.get('/mock_exams?limit=500').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/exam_results?limit=2000').catch(() => []),
    ]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setGroups(g || []); setStudents(s || []);
    setResults((e || []).filter((x) => x.mock_exam_id));
  }
  useEffect(() => { load(); }, []);

  function roster(groupName) { return students.filter((s) => s.group_name === groupName); }
  function resultsFor(examId) { return results.filter((r) => String(r.mock_exam_id) === String(examId)); }
  function resultFor(examId, studentName) { return resultsFor(examId).find((r) => r.student === studentName); }

  function openAdd() {
    setForm({ ...emptyForm, group_name: groups[0]?.name || '' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/mock_exams', { ...form, coin_reward: Math.min(200, Number(form.coin_reward) || 0), participants: 0, avg_score: 0, status: 'planned' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function saveScore(exam, studentName) {
    const raw = drafts[studentName];
    const score = Math.max(0, Math.min(100, Number(raw)));
    if (raw === undefined || raw === '' || Number.isNaN(score)) return;
    setSavingStudent(studentName);
    try {
      const grade = computeGrade(score);
      const existing = resultFor(exam.id, studentName);
      if (existing) {
        await api.put(`/exam_results/${existing.id}`, { score, grade, status: 'graded' });
      } else {
        await api.post('/exam_results', {
          student: studentName, exam: exam.title, mock_exam_id: exam.id, score, grade,
          date: new Date().toISOString().slice(0, 10), status: 'graded',
        });
        if (score >= PASS_SCORE && Number(exam.coin_reward) > 0) {
          const student = students.find((s) => s.full_name === studentName && s.group_name === exam.group_name) || students.find((s) => s.full_name === studentName);
          if (student) await api.post('/coins/give', { student_id: student.id, amount: Number(exam.coin_reward), reason: `Mock imtihon: ${exam.title}` }).catch(() => {});
        }
      }
      // mock_exams'dagi participants/avg_score'ni haqiqiy natijalarga moslab yangilaymiz
      const [e2] = await Promise.all([api.get('/exam_results?limit=2000').catch(() => [])]);
      const forExam = (e2 || []).filter((r) => String(r.mock_exam_id) === String(exam.id));
      const avg = forExam.length ? Math.round(forExam.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / forExam.length) : 0;
      await api.put(`/mock_exams/${exam.id}`, { participants: forExam.length, avg_score: avg }).catch(() => {});
      setDrafts((d) => { const n = { ...d }; delete n[studentName]; return n; });
      await load();
    } catch (e) { alert(e.message); }
    setSavingStudent(null);
  }

  if (rows === null) return <Spinner />;

  // ── Ekran: roster (guruh bo'yicha ball kiritish) ──
  if (detail) {
    const group = roster(detail.group_name);
    const forExam = resultsFor(detail.id);
    const avg = forExam.length ? Math.round(forExam.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / forExam.length) : 0;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <PageHeader icon={FileCheck2} title={detail.title} subtitle={`${detail.subject || 'Umumiy'} · ${detail.group_name || 'Umumiy'} · ${detail.date}`}
          actions={<div className="flex items-center gap-3 text-xs text-navy-500">
            <span className="flex items-center gap-1"><Users size={13} /> {forExam.length}/{group.length || 0}</span>
            <span className="flex items-center gap-1"><TrendingUp size={13} /> {avg}% o'rtacha</span>
            {Number(detail.coin_reward) > 0 && <span className="chip bg-gold/10 text-gold-700 flex items-center gap-1"><Coins size={12} /> +{detail.coin_reward} ({'>='}{PASS_SCORE}%)</span>}
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
                  <input type="number" min={0} max={100} placeholder="Ball"
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

  // ── Ekran: mock imtihonlar ro'yxati ──
  return (
    <div>
      <PageHeader icon={FileCheck2} title="Mock imtihonlar" subtitle="Sinov imtihonlari — har bir o'quvchining haqiqiy natijasi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi mock</button>} />

      {rows.length === 0 ? <Empty icon={FileCheck2} title="Mock imtihon yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const forExam = resultsFor(r.id);
            const size = roster(r.group_name).length || 0;
            const avg = forExam.length ? Math.round(forExam.reduce((sum, x) => sum + (Number(x.score) || 0), 0) / forExam.length) : 0;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="chip text-[9px] bg-gold/10 text-gold-700">{r.subject || 'Umumiy'}</span>
                  {Number(r.coin_reward) > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600"><Coins size={12} /> +{r.coin_reward}</span>}
                </div>
                <div className="text-sm font-bold text-navy-800 mb-0.5">{r.title}</div>
                <div className="text-xs text-navy-400 mb-3">{r.group_name || 'Umumiy'} · {r.date}</div>
                <div className="flex items-center gap-4 text-[11px] text-navy-500 mb-3">
                  <span className="flex items-center gap-1"><Users size={11} /> {forExam.length}{size ? `/${size}` : ''} nafar</span>
                  <span className="flex items-center gap-1"><TrendingUp size={11} /> {avg}% o'rtacha</span>
                </div>
                <button onClick={() => setDetail(r)} className="btn-ghost w-full !py-1.5 text-xs">Ballarni kiritish</button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi mock imtihon" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Imtihon nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Fan</label>
            <input className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
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
            <label className="label">Coin mukofoti ({'>='}{PASS_SCORE}% ballga)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.coin_reward} onChange={(e) => setForm({ ...form, coin_reward: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
