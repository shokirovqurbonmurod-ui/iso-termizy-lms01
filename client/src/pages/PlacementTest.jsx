import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Plus, Search, HelpCircle, Trash2, Play, ArrowLeft, RotateCcw, Trophy, Check, X, Settings } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const LEVELS = ['Starter', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_COLOR = {
  Starter: 'bg-slate-100 text-slate-600', A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700', B2: 'bg-indigo-100 text-indigo-700', C1: 'bg-violet-100 text-violet-700', C2: 'bg-rose-100 text-rose-700',
};
const emptyQuestion = { level: LEVELS[0], question: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: '' };

// Har bir daraja bo'yicha to'g'ri javoblar ulushiga qarab, nomzod haqiqatda erisha olgan
// eng yuqori darajani aniqlaydi: Starter'dan boshlab, birinchi "o'tolmagan" (< 50%) darajada to'xtaydi.
function determineLevel(order, answers) {
  const byLevel = {};
  for (let i = 0; i < order.length; i++) {
    const lvl = order[i].level;
    byLevel[lvl] = byLevel[lvl] || { correct: 0, total: 0 };
    byLevel[lvl].total++;
    if (answers[i]) byLevel[lvl].correct++;
  }
  let result = 'Starter';
  for (const lvl of LEVELS) {
    const b = byLevel[lvl];
    if (!b) continue;
    if (b.correct / b.total >= 0.5) result = lvl;
    else break;
  }
  return result;
}

export default function PlacementTest() {
  const [rows, setRows] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student: '' });
  const [saving, setSaving] = useState(false);

  const [managing, setManaging] = useState(false);
  const [qModal, setQModal] = useState(false);
  const [qForm, setQForm] = useState(emptyQuestion);

  const [taking, setTaking] = useState(false);
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(null);

  async function load() {
    const [r, qs] = await Promise.all([
      api.get('/placement_tests?limit=500').catch(() => []),
      api.get('/placement_questions?limit=2000').catch(() => []),
    ]);
    setRows(r || []); setQuestions((qs || []).filter((x) => x.status !== 'archived'));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || [])
    .filter((r) => !q.trim() || r.student.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')), [rows, q]);

  const levelDist = useMemo(() => {
    const c = {};
    for (const l of LEVELS) c[l] = 0;
    for (const r of rows || []) if (c[r.result_level] !== undefined) c[r.result_level]++;
    const max = Math.max(1, ...Object.values(c));
    return LEVELS.map((l) => ({ level: l, count: c[l], pct: Math.round((c[l] / max) * 100) }));
  }, [rows]);

  function questionsByLevel(level) { return questions.filter((x) => x.level === level); }

  // ── Admin: savollarni boshqarish ──
  function openAddQuestion() { setQForm(emptyQuestion); setQModal(true); }

  async function saveQuestion() {
    if (!qForm.question.trim() || !qForm.answer.trim()) { alert("Savol va to'g'ri javobni kiriting"); return; }
    try {
      await api.post('/placement_questions', { ...qForm, status: 'active' });
      setQModal(false); await load();
    } catch (e) { alert(e.message); }
  }

  async function removeQuestion(item) {
    if (!confirm("Savol o'chirilsinmi?")) return;
    await api.del(`/placement_questions/${item.id}`).catch(() => {});
    await load();
  }

  // ── Testni boshlash (nomzod nomi bilan) ──
  function openStart() {
    setForm({ student: '' });
    setModal(true);
  }

  function beginTest() {
    if (!form.student.trim()) { alert("Nomzod ismini kiriting"); return; }
    const ordered = [];
    for (const lvl of LEVELS) {
      const shuffled = [...questionsByLevel(lvl)].sort(() => Math.random() - 0.5);
      ordered.push(...shuffled);
    }
    if (ordered.length === 0) { alert("Hali savol qo'shilmagan"); return; }
    setModal(false);
    setOrder(ordered); setIdx(0); setPicked(null); setAnswers([]); setFinished(null); setTaking(true);
  }

  function pick(option) {
    if (picked) return;
    const item = order[idx];
    const isCorrect = option === item.answer;
    setPicked({ option, isCorrect });
  }

  async function next() {
    const newAnswers = [...answers, picked.isCorrect];
    if (idx + 1 >= order.length) {
      const correct = newAnswers.filter(Boolean).length;
      const total = order.length;
      const pct = Math.round((correct / total) * 100);
      const level = determineLevel(order, newAnswers);
      setFinished({ correct, total, pct, level });
      try {
        await api.post('/placement_tests', {
          student: form.student, result_level: level, score: pct,
          date: new Date().toISOString().slice(0, 10), status: 'done',
        });
        await load();
      } catch { /* natija saqlanmasa ham interfeys ishlayveradi */ }
      setAnswers(newAnswers);
      return;
    }
    setAnswers(newAnswers);
    setIdx((i) => i + 1); setPicked(null);
  }

  function exitTest() { setTaking(false); setFinished(null); }

  if (rows === null) return <Spinner />;

  // ── Ekran: testni topshirish ──
  if (taking && !finished) {
    const item = order[idx];
    const opts = [item.option_a, item.option_b, item.option_c, item.option_d].filter(Boolean);
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={exitTest} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Chiqish</button>
        <div className="flex gap-1 mb-5">
          {order.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < idx ? 'bg-gold-500' : i === idx ? 'bg-gold-300' : 'bg-navy-100'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-400 mb-1">
          <span className={`chip text-[9px] ${LEVEL_COLOR[item.level]}`}>{item.level}</span>
          {form.student} · Savol {idx + 1}/{order.length}
        </div>
        <h2 className="font-display text-xl text-navy-800 mb-6">{item.question}</h2>
        <div className="space-y-2.5 mb-5">
          {opts.map((opt) => {
            const isPicked = picked?.option === opt;
            const isAnswer = picked && opt === item.answer;
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
            <button onClick={next} className={`btn-gold !rounded-xl ${picked.isCorrect ? '' : '!bg-gradient-to-r !from-red-500 !to-red-600'}`}>
              {idx + 1 >= order.length ? 'Yakunlash' : 'Keyingisi'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: natija ──
  if (taking && finished) {
    return (
      <div className="max-w-md mx-auto text-center card p-8">
        <Trophy size={40} className="text-gold-500 mx-auto mb-3" />
        <div className="font-display text-3xl text-navy-800 mb-1">{finished.pct}%</div>
        <div className="text-sm text-navy-400 mb-2">{finished.correct}/{finished.total} to'g'ri javob</div>
        <span className={`chip text-sm font-bold ${LEVEL_COLOR[finished.level]} mb-6 inline-block`}>{form.student} — {finished.level}</span>
        <div className="flex gap-2">
          <button onClick={exitTest} className="btn-ghost flex-1"><ArrowLeft size={16} /> Ro'yxatga qaytish</button>
          <button onClick={openStart} className="btn-gold flex-1"><RotateCcw size={16} /> Yangi nomzod</button>
        </div>
      </div>
    );
  }

  // ── Ekran: savollarni boshqarish ──
  if (managing) {
    return (
      <div>
        <button onClick={() => setManaging(false)} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <PageHeader icon={HelpCircle} title="Placement Test savollari" subtitle="Har bir darajaga mos savollar banki"
          actions={<button className="btn-gold" onClick={openAddQuestion}><Plus size={16} /> Savol qo'shish</button>} />
        {questions.length === 0 ? <Empty icon={HelpCircle} title="Hali savol qo'shilmagan" /> : (
          <div className="space-y-5">
            {LEVELS.filter((lvl) => questionsByLevel(lvl).length > 0).map((lvl) => (
              <div key={lvl}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`chip text-[10px] ${LEVEL_COLOR[lvl]}`}>{lvl}</span>
                  <span className="text-xs text-navy-400">{questionsByLevel(lvl).length} ta savol</span>
                </div>
                <div className="space-y-2">
                  {questionsByLevel(lvl).map((item) => (
                    <div key={item.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-sm font-bold text-navy-800">{item.question}</div>
                        <button onClick={() => removeQuestion(item)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={14} /></button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[item.option_a, item.option_b, item.option_c, item.option_d].filter(Boolean).map((opt) => (
                          <span key={opt} className={`text-[11px] rounded-full px-2.5 py-1 ${opt === item.answer ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-navy-50 text-navy-500'}`}>{opt}</span>
                        ))}
                      </div>
                    </div>
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
          <label className="label">Daraja</label>
          <select className="input !py-2.5 mb-4" value={qForm.level} onChange={(e) => setQForm({ ...qForm, level: e.target.value })}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
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

  // ── Ekran: natijalar ro'yxati ──
  return (
    <div>
      <PageHeader icon={FileCheck2} title="Placement Test" subtitle="Yangi o'quvchilar darajasini aniqlash natijalari"
        actions={<>
          <button className="btn-ghost" onClick={() => setManaging(true)}><Settings size={16} /> Savollarni boshqarish</button>
          <button className="btn-gold" onClick={openStart} disabled={questions.length === 0} title={questions.length === 0 ? "Avval savol qo'shing" : ''}>
            <Play size={16} /> Testni boshlash
          </button>
        </>} />

      <div className="card p-5 mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-4">Darajalar taqsimoti</h3>
        <div className="space-y-2">
          {levelDist.map((l) => (
            <div key={l.level} className="flex items-center gap-3">
              <div className="w-14 shrink-0 text-xs font-bold text-navy-500">{l.level}</div>
              <div className="flex-1 h-5 rounded-lg bg-navy-50 overflow-hidden">
                <div className="h-full rounded-lg bg-gold-500 flex items-center justify-end px-2" style={{ width: `${Math.max(l.count ? 6 : 0, l.pct)}%` }}>
                  {l.count > 0 && <span className="text-[10px] font-bold text-white">{l.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="O'quvchi qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={FileCheck2} title="Natija yo'q" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{r.student[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.student}</div>
                <div className="text-[11px] text-navy-400">{r.date}</div>
              </div>
              <span className="text-sm font-bold text-navy-600 shrink-0">{r.score}%</span>
              <span className={`chip text-[10px] shrink-0 ${LEVEL_COLOR[r.result_level] || 'bg-navy-100 text-navy-500'}`}>{r.result_level}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Testni boshlash" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={beginTest}>Boshlash</button>
        </>}
      >
        <label className="label">Nomzod ismi</label>
        <input className="input !py-2.5" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="F.I.Sh." />
      </Modal>
    </div>
  );
}
