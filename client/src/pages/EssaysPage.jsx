import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Check, X, Clock, Coins } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Tarix', 'Huquq', 'IT'];
const STATUS_STYLE = { pending: 'bg-amber-100 text-amber-700', checked: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600' };
const STATUS_LABEL = { pending: 'Kutilmoqda', checked: 'Tekshirilgan', rejected: 'Rad etilgan' };

export default function EssaysPage() {
  const { user } = useAuth();
  const canReview = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student: '', title: '', subject: SUBJECTS[0], content: '' });
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null); // ochilgan esse
  const [reviewForm, setReviewForm] = useState({ score: 80, feedback: '', coin_reward: 20 });

  async function load() {
    const [e, s] = await Promise.all([api.get('/essays?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((e || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => (
    canReview ? (rows || []) : (rows || []).filter((r) => r.student === user.full_name)
  ), [rows, canReview, user.full_name]);
  const pending = useMemo(() => visible.filter((r) => r.status === 'pending'), [visible]);
  const reviewed = useMemo(() => visible.filter((r) => r.status !== 'pending'), [visible]);

  function openAdd() {
    setForm({ student: canReview ? (students[0]?.full_name || '') : user.full_name, title: '', subject: SUBJECTS[0], content: '' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    if (canReview && !form.student.trim()) return;
    setSaving(true);
    try {
      if (canReview) {
        const word_count = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;
        await api.post('/essays', { ...form, word_count, score: 0, feedback: '', reviewer: '', coin_reward: 0, date: new Date().toISOString().slice(0, 10), status: 'pending' });
      } else {
        await api.post('/essay-actions/submit', { title: form.title, subject: form.subject, content: form.content });
      }
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  function openDetail(row) {
    setReviewForm({ score: row.score || 80, feedback: row.feedback || '', coin_reward: row.coin_reward || 20 });
    setDetail(row);
  }

  async function submitReview(status) {
    const coin_reward = status === 'checked' ? Math.min(200, Number(reviewForm.coin_reward) || 0) : 0;
    await api.put(`/essays/${detail.id}`, {
      status, reviewer: user.full_name,
      score: status === 'checked' ? Number(reviewForm.score) || 0 : 0,
      feedback: reviewForm.feedback,
      coin_reward,
    }).catch(() => {});
    if (coin_reward > 0) {
      const student = students.find((s) => s.full_name === detail.student);
      if (student) await api.post('/coins/give', { student_id: student.id, amount: coin_reward, reason: `Esse: ${detail.title}` }).catch(() => {});
    }
    setDetail(null); await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileText} title="Esselar" subtitle="O'quvchilar essesi va tekshiruv holati"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi esse</button>} />

      <div className="mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-3 flex items-center gap-2"><Clock size={16} className="text-amber-500" /> Tekshiruv kutilmoqda ({pending.length})</h3>
        {pending.length === 0 ? <Empty icon={FileText} title="Kutilayotgan esse yo'q" /> : (
          <div className="space-y-2">
            {pending.map((r) => (
              <button key={r.id} onClick={() => openDetail(r)} className="w-full text-left rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3 hover:bg-amber-50 transition">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-navy-800">{r.student} — {r.title}</div>
                  <span className="chip text-[9px] bg-gold/10 text-gold-700">{r.subject}</span>
                </div>
                <div className="text-xs text-navy-500">{r.word_count} so'z · {r.date} · o'qish uchun bosing</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">Tekshirilganlar</h3>
          <div className="space-y-1.5">
            {reviewed.map((r) => (
              <button key={r.id} onClick={() => openDetail(r)} className="w-full flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2 hover:bg-navy-100/60 transition text-left">
                <span className="text-navy-700">{r.student} — {r.title} {r.score > 0 && `(${r.score} ball)`}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {Number(r.coin_reward) > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600"><Coins size={11} /> +{r.coin_reward}</span>}
                  <span className={`chip text-[9px] ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} title="Yangi esse" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        {canReview ? (
          <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
            {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
          </select>
        ) : (
          <div className="input !py-2.5 mb-4 !bg-navy-50 text-navy-500">{user.full_name}</div>
        )}
        <label className="label">Mavzu</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Fan</label>
        <select className="input !py-2.5 mb-4" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="label">Esse matni</label>
        <textarea className="input !py-2.5" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="O'quvchi essesini shu yerga joylashtiring..." />
      </Modal>

      <Modal open={!!detail} title={detail?.title || ''} onClose={() => setDetail(null)}
        footer={canReview && detail?.status === 'pending' ? (
          <>
            <button className="btn-ghost !border-red-200 !text-red-500" onClick={() => submitReview('rejected')}><X size={14} /> Rad etish</button>
            <button className="btn-gold" onClick={() => submitReview('checked')}><Check size={14} /> Tekshirildi deb belgilash</button>
          </>
        ) : <button className="btn-ghost" onClick={() => setDetail(null)}>Yopish</button>}
      >
        {detail && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="chip text-[9px] bg-gold/10 text-gold-700">{detail.subject}</span>
              <span className="text-xs text-navy-400">{detail.student} · {detail.word_count} so'z · {detail.date}</span>
            </div>
            <div className="rounded-xl bg-navy-50/60 px-4 py-3 mb-4 text-sm text-navy-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {detail.content?.trim() ? detail.content : <span className="text-navy-400 italic">Esse matni kiritilmagan</span>}
            </div>
            {detail.status === 'pending' && canReview ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ball (0-100)</label>
                  <input className="input !py-2.5" type="number" min={0} max={100} value={reviewForm.score} onChange={(e) => setReviewForm({ ...reviewForm, score: e.target.value })} />
                </div>
                <div>
                  <label className="label">Coin mukofoti</label>
                  <input className="input !py-2.5" type="number" min={0} max={200} value={reviewForm.coin_reward} onChange={(e) => setReviewForm({ ...reviewForm, coin_reward: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Izoh</label>
                  <textarea className="input !py-2.5" rows={2} value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} placeholder="O'quvchiga fikr-mulohaza..." />
                </div>
              </div>
            ) : (
              <>
                <span className={`chip text-[10px] ${STATUS_STYLE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                {detail.score > 0 && <span className="ml-2 text-sm font-bold text-gold-600">{detail.score} ball</span>}
                {Number(detail.coin_reward) > 0 && <span className="ml-2 text-sm font-bold text-gold-600 inline-flex items-center gap-1"><Coins size={13} /> +{detail.coin_reward}</span>}
                {detail.feedback && <div className="text-sm text-navy-600 mt-2">{detail.feedback}</div>}
                {detail.reviewer && <div className="text-xs text-navy-400 mt-1">Tekshirdi: {detail.reviewer}</div>}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
