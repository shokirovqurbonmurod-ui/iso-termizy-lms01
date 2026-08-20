import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Plus, HelpCircle, Clock, Check, X, Trash2, Play, ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Matematika', 'Tarix', 'Huquq', 'IT'];
const emptyQuestion = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: '' };

export default function QuizzesPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [quizzes, setQuizzes] = useState(null);
  const [groups, setGroups] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', subject: SUBJECTS[0], group_name: '', duration: 15 });
  const [saving, setSaving] = useState(false);

  const [manageQuiz, setManageQuiz] = useState(null);
  const [qModal, setQModal] = useState(false);
  const [qForm, setQForm] = useState(emptyQuestion);

  const [takeQuiz, setTakeQuiz] = useState(null);
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(null);

  async function load() {
    const [q, g, qs] = await Promise.all([
      api.get('/quizzes?limit=500').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/quiz_questions?limit=2000').catch(() => []),
    ]);
    setQuizzes(q || []); setGroups(g || []); setQuestions(qs || []);
  }
  useEffect(() => { load(); }, []);

  function questionsFor(quizId) { return questions.filter((q) => String(q.quiz_id) === String(quizId) && q.status !== 'archived'); }

  const active = useMemo(() => (quizzes || []).filter((q) => q.status !== 'archived'), [quizzes]);

  function openAdd() {
    setForm({ title: '', subject: SUBJECTS[0], group_name: groups[0]?.name || '', duration: 15 });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/quizzes', { ...form, questions: 0, duration: Number(form.duration) || 0, avg_score: 0, status: 'active' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  // ── Admin: savollarni boshqarish ──
  function openManage(quiz) { setManageQuiz(quiz); }

  function openAddQuestion() { setQForm(emptyQuestion); setQModal(true); }

  async function saveQuestion() {
    if (!qForm.question.trim() || !qForm.answer.trim()) { alert("Savol va to'g'ri javobni kiriting"); return; }
    try {
      await api.post('/quiz_questions', { ...qForm, subject: manageQuiz.subject, quiz_id: manageQuiz.id, status: 'active' });
      const list = await api.get('/quiz_questions?limit=2000').catch(() => []);
      setQuestions(list || []);
      await api.put(`/quizzes/${manageQuiz.id}`, { questions: questionsFor(manageQuiz.id).length + 1 }).catch(() => {});
      await load();
      setQModal(false);
    } catch (e) { alert(e.message); }
  }

  async function removeQuestion(q) {
    if (!confirm("Savol o'chirilsinmi?")) return;
    await api.del(`/quiz_questions/${q.id}`).catch(() => {});
    const list = await api.get('/quiz_questions?limit=2000').catch(() => []);
    setQuestions(list || []);
    await api.put(`/quizzes/${manageQuiz.id}`, { questions: Math.max(0, questionsFor(manageQuiz.id).length - 1) }).catch(() => {});
    await load();
  }

  // ── O'quvchi: testni yechish ──
  function startQuiz(quiz) {
    const qs = questionsFor(quiz.id);
    if (qs.length === 0) return;
    const shuffled = [...qs].sort(() => Math.random() - 0.5);
    setTakeQuiz(quiz); setOrder(shuffled); setIdx(0); setPicked(null); setCorrectCount(0); setFinished(null);
  }

  function pick(option) {
    if (picked) return;
    const q = order[idx];
    const isCorrect = option === q.answer;
    setPicked({ option, isCorrect });
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  async function next() {
    if (idx + 1 >= order.length) {
      const total = order.length;
      const correct = correctCount;
      const pct = Math.round((correct / total) * 100);
      setFinished({ correct, total, pct });
      try {
        await api.post('/quiz_attempts', {
          quiz_id: takeQuiz.id, quiz_title: takeQuiz.title, student: user.full_name,
          correct_count: correct, total_count: total, score_pct: pct, date: new Date().toISOString().slice(0, 10),
        });
        const attempts = await api.get('/quiz_attempts?limit=2000').catch(() => []);
        const mine = (attempts || []).filter((a) => String(a.quiz_id) === String(takeQuiz.id));
        const avg = mine.length ? Math.round(mine.reduce((a, r) => a + (r.score_pct || 0), 0) / mine.length) : pct;
        await api.put(`/quizzes/${takeQuiz.id}`, { avg_score: avg }).catch(() => {});
      } catch { /* natija saqlanmasa ham interfeys ishlayveradi */ }
      return;
    }
    setIdx((i) => i + 1); setPicked(null);
  }

  function exitQuiz() { setTakeQuiz(null); setFinished(null); load(); }

  if (quizzes === null) return <Spinner />;

  // ── Ekran: test yechish ──
  if (takeQuiz && !finished) {
    const q = order[idx];
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={exitQuiz} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Chiqish</button>
        <div className="flex gap-1 mb-5">
          {order.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < idx ? 'bg-gold-500' : i === idx ? 'bg-gold-300' : 'bg-navy-100'}`} />
          ))}
        </div>
        <div className="text-xs text-navy-400 mb-1">{takeQuiz.title} · Savol {idx + 1}/{order.length}</div>
        <h2 className="font-display text-xl text-navy-800 mb-6">{q.question}</h2>
        <div className="space-y-2.5 mb-5">
          {opts.map((opt) => {
            const isPicked = picked?.option === opt;
            const isAnswer = picked && opt === q.answer;
            let cls = 'border-navy-100 hover:border-gold/50';
            if (picked) {
              if (isAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
              else if (isPicked) cls = 'border-red-400 bg-red-50 text-red-600';
              else cls = 'border-navy-100 opacity-50';
            }
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={!!picked}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${cls}`}>
                {opt}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className={`rounded-2xl p-4 flex items-center justify-between animate-fade ${picked.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`flex items-center gap-2 font-bold ${picked.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
              {picked.isCorrect ? <Check size={18} /> : <X size={18} />}
              {picked.isCorrect ? "To'g'ri javob" : "Noto'g'ri javob"}
            </div>
            <button onClick={next} className={`btn-gold !rounded-xl ${picked.isCorrect ? '' : '!bg-gradient-to-r !from-red-500 !to-red-600'}`}>Keyingisi</button>
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: natija ──
  if (takeQuiz && finished) {
    return (
      <div className="max-w-md mx-auto text-center card p-8">
        <Trophy size={40} className="text-gold-500 mx-auto mb-3" />
        <div className="font-display text-3xl text-navy-800 mb-1">{finished.pct}%</div>
        <div className="text-sm text-navy-400 mb-6">{finished.correct}/{finished.total} to'g'ri javob</div>
        <div className="flex gap-2">
          <button onClick={exitQuiz} className="btn-ghost flex-1"><ArrowLeft size={16} /> Testlarga qaytish</button>
          <button onClick={() => startQuiz(takeQuiz)} className="btn-gold flex-1"><RotateCcw size={16} /> Qaytadan</button>
        </div>
      </div>
    );
  }

  // ── Ekran: admin savol boshqaruvi ──
  if (manageQuiz) {
    const list = questionsFor(manageQuiz.id);
    return (
      <div>
        <button onClick={() => setManageQuiz(null)} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <PageHeader icon={ListChecks} title={manageQuiz.title} subtitle={`${manageQuiz.subject} · ${manageQuiz.group_name}`}
          actions={<button className="btn-gold" onClick={openAddQuestion}><Plus size={16} /> Savol qo'shish</button>} />
        {list.length === 0 ? <Empty icon={HelpCircle} title="Hali savol qo'shilmagan" /> : (
          <div className="space-y-2">
            {list.map((q, i) => (
              <div key={q.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-bold text-navy-800">{i + 1}. {q.question}</div>
                  <button onClick={() => removeQuestion(q)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean).map((opt) => (
                    <span key={opt} className={`text-[11px] rounded-full px-2.5 py-1 ${opt === q.answer ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-navy-50 text-navy-500'}`}>{opt}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={qModal} title="Savol qo'shish" onClose={() => setQModal(false)}
          footer={<>
            <button className="btn-ghost" onClick={() => setQModal(false)}>Bekor qilish</button>
            <button className="btn-gold" onClick={saveQuestion}>Saqlash</button>
          </>}
        >
          <label className="label">Savol matni</label>
          <input className="input !py-2.5 mb-4" value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input className="input !py-2.5" placeholder="1-variant" value={qForm.option_a} onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })} />
            <input className="input !py-2.5" placeholder="2-variant" value={qForm.option_b} onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })} />
            <input className="input !py-2.5" placeholder="3-variant" value={qForm.option_c} onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })} />
            <input className="input !py-2.5" placeholder="4-variant" value={qForm.option_d} onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })} />
          </div>
          <label className="label">To'g'ri javob (variantlardan biriga aynan mos yozing)</label>
          <input className="input !py-2.5" value={qForm.answer} onChange={(e) => setQForm({ ...qForm, answer: e.target.value })} />
        </Modal>
      </div>
    );
  }

  // ── Ekran: testlar ro'yxati ──
  return (
    <div>
      <PageHeader icon={ListChecks} title="Testlar (Quiz)" subtitle="Guruhlar uchun testlar va o'rtacha natijalar"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi test</button>} />

      {active.length === 0 ? <Empty icon={ListChecks} title="Test yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((q) => {
            const qCount = questionsFor(q.id).length;
            return (
              <div key={q.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="chip text-[9px] bg-gold/10 text-gold-700">{q.subject}</span>
                  <span className="text-[11px] font-bold text-navy-600">{q.avg_score || 0}%</span>
                </div>
                <div className="text-sm font-bold text-navy-800 mb-0.5">{q.title}</div>
                <div className="text-xs text-navy-400 mb-3">{q.group_name}</div>
                <div className="flex items-center gap-4 text-[11px] text-navy-400 mb-3">
                  <span className="flex items-center gap-1"><HelpCircle size={11} /> {qCount} savol</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {q.duration} daq</span>
                </div>
                <div className="flex gap-2">
                  {canManage && <button onClick={() => openManage(q)} className="btn-ghost flex-1 !py-1.5 text-xs">Savollarni boshqarish</button>}
                  <button onClick={() => startQuiz(q)} disabled={qCount === 0}
                    className="btn-gold flex-1 !py-1.5 text-xs disabled:opacity-40" title={qCount === 0 ? "Hali savol qo'shilmagan" : ''}>
                    <Play size={12} /> Boshlash
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi test" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Test nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fan</label>
            <select className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Vaqt (daqiqa)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
