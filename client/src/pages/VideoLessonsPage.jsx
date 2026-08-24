import { useEffect, useMemo, useState } from 'react';
import { Video, Plus, Play, ArrowLeft, Pencil, Trash2, Clock, Eye, ExternalLink, Upload, FileCheck2, ClipboardList, Check, X, RotateCcw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Matematika', 'Tarix', 'Huquq', 'IT'];
const emptyForm = { title: '', subject: SUBJECTS[0], teacher: '', duration_min: 10, url: '', url_name: '', quiz_id: '', assignment_id: '' };

// YouTube havolalarining barcha ko'rinishlarini (watch?v=, youtu.be/, shorts/, embed/) embed havolaga aylantiradi.
function youtubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/watch\?v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

const isDirectVideo = (url) => /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url || '') || /^\/uploads\//.test(url || '');

export default function VideoLessonsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = !['student', 'parent'].includes(user.role);
  const isStudent = user.role === 'student';
  const [videos, setVideos] = useState(null);
  const [views, setViews] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [watching, setWatching] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  // Testni videoning o'zidan chiqmasdan shu yerda yechish uchun — alohida "Testlar" sahifasiga
  // o'tib, o'sha yerda testni qayta qidirish shart bo'lmasin.
  const [takingQuiz, setTakingQuiz] = useState(null);
  const [quizOrder, setQuizOrder] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizPicked, setQuizPicked] = useState(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizFinished, setQuizFinished] = useState(null);

  async function load() {
    const [v, vw, qz, asg, comp, qs] = await Promise.all([
      api.get('/video_lessons?limit=500').catch(() => []),
      api.get('/video_views?limit=2000').catch(() => []),
      api.get('/quizzes?limit=500').catch(() => []),
      api.get('/assignments?limit=500').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
      api.get('/quiz_questions?limit=2000').catch(() => []),
    ]);
    setVideos(v || []); setViews(vw || []); setQuizzes(qz || []); setAssignments(asg || []); setCompletions(comp || []);
    setQuizQuestions(qs || []);
  }
  useEffect(() => { load(); }, []);

  function quizQuestionsFor(quizId) { return quizQuestions.filter((q) => String(q.quiz_id) === String(quizId) && q.status !== 'archived'); }

  function startInlineQuiz(quiz) {
    const qs = quizQuestionsFor(quiz.id);
    if (qs.length === 0) return;
    const shuffled = [...qs].sort(() => Math.random() - 0.5);
    setTakingQuiz(quiz); setQuizOrder(shuffled); setQuizIdx(0); setQuizPicked(null); setQuizCorrect(0); setQuizFinished(null);
  }

  function pickQuizOption(option) {
    if (quizPicked) return;
    const q = quizOrder[quizIdx];
    const isCorrect = option === q.answer;
    setQuizPicked({ option, isCorrect });
    if (isCorrect) setQuizCorrect((c) => c + 1);
  }

  async function nextQuizQuestion() {
    if (quizIdx + 1 >= quizOrder.length) {
      const total = quizOrder.length;
      const correct = quizCorrect;
      const pct = Math.round((correct / total) * 100);
      setQuizFinished({ correct, total, pct });
      try {
        await api.post('/quiz_attempts', {
          quiz_id: takingQuiz.id, quiz_title: takingQuiz.title, student: user.full_name,
          correct_count: correct, total_count: total, score_pct: pct, date: new Date().toISOString().slice(0, 10),
        });
        const attempts = await api.get('/quiz_attempts?limit=2000').catch(() => []);
        const mine = (attempts || []).filter((a) => String(a.quiz_id) === String(takingQuiz.id));
        const avg = mine.length ? Math.round(mine.reduce((a, r) => a + (r.score_pct || 0), 0) / mine.length) : pct;
        await api.put(`/quizzes/${takingQuiz.id}`, { avg_score: avg }).catch(() => {});
      } catch { /* natija saqlanmasa ham interfeys ishlayveradi */ }
      return;
    }
    setQuizIdx((i) => i + 1); setQuizPicked(null);
  }

  function exitInlineQuiz() { setTakingQuiz(null); setQuizFinished(null); load(); }

  function viewsFor(id) { return views.filter((v) => String(v.video_id) === String(id)); }
  function quizFor(id) { return quizzes.find((q) => String(q.id) === String(id)); }
  function assignmentFor(id) { return assignments.find((a) => String(a.id) === String(id)); }
  function hasSubmitted(assignmentId) {
    return completions.some((c) => c.item_type === 'assignments' && String(c.item_id) === String(assignmentId) && c.student === user.full_name);
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setModal(true); }
  function openEdit(v) { setEditing(v); setForm({ title: v.title, subject: v.subject || SUBJECTS[0], teacher: v.teacher || '', duration_min: v.duration_min || 10, url: v.url || '', url_name: '', quiz_id: v.quiz_id || '', assignment_id: v.assignment_id || '' }); setModal(true); }

  async function submitAssignment(assignmentId) {
    setSubmitting(true);
    try {
      await api.post('/assignment-actions/submit', { item_id: assignmentId, item_type: 'assignments' });
      const comp = await api.get('/assignment_completions?limit=2000').catch(() => []);
      setCompletions(comp || []);
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  }

  async function save() {
    if (!form.title.trim() || !form.url.trim()) { alert("Nomi va video havolani kiriting"); return; }
    setSaving(true);
    try {
      const payload = { ...form, duration_min: Number(form.duration_min) || 0 };
      if (editing) await api.put(`/video_lessons/${editing.id}`, payload);
      else await api.post('/video_lessons', payload);
      // Eski yuklangan fayl boshqasiga almashtirilgan bo'lsa, serverda "yetim" bo'lib qolmasin.
      if (editing && editing.url && editing.url.startsWith('/uploads/') && editing.url !== form.url) {
        api.del(editing.url).catch(() => {});
      }
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload(file);
      setForm((f) => ({ ...f, url: res.url, url_name: res.name }));
    } catch (e2) { alert(e2.message); }
    setUploading(false);
  }

  async function remove(v) {
    if (!confirm("Video o'chirilsinmi?")) return;
    await api.del(`/video_lessons/${v.id}`).catch(() => {});
    if (v.url && v.url.startsWith('/uploads/')) api.del(v.url).catch(() => {});
    await load();
  }

  async function openWatch(v) {
    setWatching(v);
    try {
      await api.post('/video_views', {
        video_id: v.id, video_title: v.title, student: user.full_name,
        date: new Date().toISOString().slice(0, 10),
      });
      const vw = await api.get('/video_views?limit=2000').catch(() => []);
      setViews(vw || []);
    } catch { /* ko'rish yozilmasa ham video ochilaveradi */ }
  }

  function exitWatch() { setWatching(null); }

  const embed = useMemo(() => watching ? youtubeEmbedUrl(watching.url) : null, [watching]);

  if (videos === null) return <Spinner />;

  // ── Ekran: videoni tomosha qilish ──
  // ── Ekran: video ichidan chiqmasdan testni yechish ──
  if (watching && takingQuiz && !quizFinished) {
    const q = quizOrder[quizIdx];
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={exitInlineQuiz} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Darsga qaytish</button>
        <div className="flex gap-1 mb-5">
          {quizOrder.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < quizIdx ? 'bg-gold-500' : i === quizIdx ? 'bg-gold-300' : 'bg-navy-100'}`} />
          ))}
        </div>
        <div className="text-xs text-navy-400 mb-1">{takingQuiz.title} · Savol {quizIdx + 1}/{quizOrder.length}</div>
        <h2 className="font-display text-xl text-navy-800 mb-6">{q.question}</h2>
        <div className="space-y-2.5 mb-5">
          {opts.map((opt) => {
            const isPicked = quizPicked?.option === opt;
            const isAnswer = quizPicked && opt === q.answer;
            let cls = 'border-navy-100 hover:border-gold/50';
            if (quizPicked) {
              if (isAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
              else if (isPicked) cls = 'border-red-400 bg-red-50 text-red-600';
              else cls = 'border-navy-100 opacity-50';
            }
            return (
              <button key={opt} onClick={() => pickQuizOption(opt)} disabled={!!quizPicked}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${cls}`}>
                {opt}
              </button>
            );
          })}
        </div>
        {quizPicked && (
          <div className={`rounded-2xl p-4 flex items-center justify-between animate-fade ${quizPicked.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`flex items-center gap-2 font-bold ${quizPicked.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
              {quizPicked.isCorrect ? <Check size={18} /> : <X size={18} />}
              {quizPicked.isCorrect ? "To'g'ri javob" : "Noto'g'ri javob"}
            </div>
            <button onClick={nextQuizQuestion} className={`btn-gold !rounded-xl ${quizPicked.isCorrect ? '' : '!bg-gradient-to-r !from-red-500 !to-red-600'}`}>Keyingisi</button>
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: test natijasi (darsga qaytish yoki qayta yechish) ──
  if (watching && takingQuiz && quizFinished) {
    return (
      <div className="max-w-md mx-auto text-center card p-8">
        <Trophy size={40} className="text-gold-500 mx-auto mb-3" />
        <div className="font-display text-3xl text-navy-800 mb-1">{quizFinished.pct}%</div>
        <div className="text-sm text-navy-400 mb-6">{quizFinished.correct}/{quizFinished.total} to'g'ri javob</div>
        <div className="flex gap-2">
          <button onClick={exitInlineQuiz} className="btn-ghost flex-1"><ArrowLeft size={16} /> Darsga qaytish</button>
          <button onClick={() => startInlineQuiz(takingQuiz)} className="btn-gold flex-1"><RotateCcw size={16} /> Qaytadan</button>
        </div>
      </div>
    );
  }

  if (watching) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={exitWatch} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <div className="card overflow-hidden !p-0 mb-4">
          <div className="aspect-video bg-navy-900">
            {embed ? (
              <iframe key={embed} src={embed} title={watching.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : isDirectVideo(watching.url) ? (
              <video key={watching.url} src={api.fileUrl(watching.url)} controls autoPlay className="w-full h-full" />
            ) : (
              <div className="w-full h-full grid place-items-center text-center px-6">
                <div>
                  <p className="text-navy-200 text-sm mb-3">Bu havolani ichkarida ko'rsatib bo'lmadi.</p>
                  <a href={api.fileUrl(watching.url)} target="_blank" rel="noreferrer" className="btn-gold !py-1.5 !px-4 text-xs"><ExternalLink size={13} /> Havolani ochish</a>
                </div>
              </div>
            )}
          </div>
        </div>
        <h2 className="font-display text-xl text-navy-800 mb-1">{watching.title}</h2>
        <div className="flex items-center gap-4 text-xs text-navy-400 mb-5">
          <span className="chip text-[9px] bg-gold/10 text-gold-700">{watching.subject}</span>
          {watching.teacher && <span>{watching.teacher}</span>}
          <span className="flex items-center gap-1"><Clock size={11} /> {watching.duration_min} daq</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {viewsFor(watching.id).length} marta ko'rilgan</span>
        </div>

        {(watching.quiz_id || watching.assignment_id) && (
          <div className="card p-5 space-y-3">
            <h3 className="font-display text-base text-navy-800">Darsdan keyin</h3>
            {watching.quiz_id && quizFor(watching.quiz_id) && (
              <div className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                <ClipboardList size={18} className="text-gold-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">Test: {quizFor(watching.quiz_id).title}</div>
                  <div className="text-[11px] text-navy-400">
                    {quizQuestionsFor(watching.quiz_id).length > 0 ? "Bilimingizni tekshirib ko'ring" : "Hali savol qo'shilmagan"}
                  </div>
                </div>
                <button onClick={() => startInlineQuiz(quizFor(watching.quiz_id))} disabled={quizQuestionsFor(watching.quiz_id).length === 0}
                  className="btn-gold !py-1.5 !px-3 text-xs shrink-0 disabled:opacity-40">Testni boshlash</button>
              </div>
            )}
            {watching.assignment_id && assignmentFor(watching.assignment_id) && (
              <div className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                <FileCheck2 size={18} className="text-gold-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">Amaliy vazifa: {assignmentFor(watching.assignment_id).title}</div>
                  <div className="text-[11px] text-navy-400">{assignmentFor(watching.assignment_id).description || "Bajarib, o'qituvchiga topshiring"}</div>
                </div>
                {isStudent ? (
                  hasSubmitted(watching.assignment_id) ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold shrink-0"><Check size={14} /> Topshirildi</span>
                  ) : (
                    <button onClick={() => submitAssignment(watching.assignment_id)} disabled={submitting} className="btn-gold !py-1.5 !px-3 text-xs shrink-0">
                      {submitting ? '...' : 'Topshirish'}
                    </button>
                  )
                ) : (
                  <button onClick={() => navigate('/app/homework')} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">Topshiriqlarni ko'rish</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: videolar ro'yxati ──
  return (
    <div>
      <PageHeader icon={Video} title="Video darslar" subtitle="Darslarni istalgan vaqtda qayta tomosha qiling"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi video</button>} />

      {videos.length === 0 ? <Empty icon={Video} title="Hali video qo'shilmagan" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="chip text-[9px] bg-gold/10 text-gold-700">{v.subject}</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-navy-500"><Eye size={11} /> {viewsFor(v.id).length}</span>
              </div>
              <div className="text-sm font-bold text-navy-800 mb-0.5">{v.title}</div>
              <div className="text-xs text-navy-400 mb-3">{v.teacher}</div>
              <div className="flex items-center gap-1 text-[11px] text-navy-400 mb-3">
                <Clock size={11} /> {v.duration_min} daqiqa
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <>
                    <button onClick={() => openEdit(v)} className="btn-ghost !py-1.5 !px-2.5 text-xs"><Pencil size={13} /></button>
                    <button onClick={() => remove(v)} className="btn-ghost !py-1.5 !px-2.5 text-xs text-red-500 hover:!bg-red-50"><Trash2 size={13} /></button>
                  </>
                )}
                <button onClick={() => openWatch(v)} className="btn-gold flex-1 !py-1.5 text-xs"><Play size={12} /> Ko'rish</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title={editing ? 'Videoni tahrirlash' : 'Yangi video'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Saqlash"}</button>
        </>}
      >
        <label className="label">Dars nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Fan</label>
            <select className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">O'qituvchi</label>
            <input className="input !py-2.5" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Davomiyligi (daqiqa)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
          </div>
        </div>
        <label className="label">Video havola (YouTube yoki to'g'ridan-to'g'ri video URL)</label>
        <input className="input !py-2.5 mb-4" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value, url_name: '' })} />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Bog'langan test (ixtiyoriy)</label>
            <select className="input !py-2.5" value={form.quiz_id} onChange={(e) => setForm({ ...form, quiz_id: e.target.value })}>
              <option value="">— tanlanmagan —</option>
              {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bog'langan amaliy vazifa (ixtiyoriy)</label>
            <select className="input !py-2.5" value={form.assignment_id} onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}>
              <option value="">— tanlanmagan —</option>
              {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-navy-100" />
          <span className="text-[11px] font-semibold text-navy-300 uppercase tracking-wide">yoki</span>
          <div className="flex-1 h-px bg-navy-100" />
        </div>

        <input type="file" accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="hidden" id="video-upload" onChange={handleFileUpload} />
        <label htmlFor="video-upload"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 py-8 px-4 text-center cursor-pointer hover:border-gold/60 hover:bg-gold/5 transition">
          <Upload size={22} className="text-navy-300" />
          <div className="text-sm font-bold text-navy-700">
            {uploading ? 'Yuklanmoqda...' : form.url_name ? `${form.url_name} yuklandi ✓` : 'Video yuklash'}
          </div>
          {!uploading && !form.url_name && <div className="text-[11px] text-navy-400">MP4, WEBM, MOV, AVI — max 500MB</div>}
        </label>
      </Modal>
    </div>
  );
}
