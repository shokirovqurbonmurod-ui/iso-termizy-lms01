import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function SurveyVote() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState(null);
  const [votes, setVotes] = useState([]);
  const [active, setActive] = useState(null);
  const [choice, setChoice] = useState('');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newSurvey, setNewSurvey] = useState({ title: '', audience: "Barcha" });
  const isAdmin = ['founder','director','super_admin','admin','academic_manager'].includes(user.role);

  async function load() {
    const [s, v] = await Promise.all([
      api.get('/surveys').catch(() => []),
      api.get('/survey_votes').catch(() => []),
    ]);
    setSurveys(s || []); setVotes(v || []);
    if (!active && s?.length) setActive(s[0]);
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const m = {};
    votes.forEach((v) => {
      m[v.survey] = m[v.survey] || { ha: 0, yoq: 0, comments: [] };
      if (v.vote === 'ha') m[v.survey].ha++; else m[v.survey].yoq++;
      if (v.comment) m[v.survey].comments.push(v);
    });
    return m;
  }, [votes]);

  const myVote = votes.find((v) => v.survey === active?.title && v.voter === user.full_name);

  async function createSurvey() {
    if (!newSurvey.title.trim()) return;
    try {
      await api.post('/surveys', {
        title: newSurvey.title, audience: newSurvey.audience,
        responses: 0, date: new Date().toISOString().slice(0, 10), status: 'active',
      });
      setShowCreate(false); setNewSurvey({ title: '', audience: 'Barcha' });
      load();
    } catch (e) { setMsg('❌ ' + e.message); }
  }

  async function submit() {
    if (!choice) { setMsg('Avval "Ha" yoki "Yo\'q" tanlang'); return; }
    try {
      await api.post('/survey_votes', {
        survey: active.title, voter: user.full_name, vote: choice,
        comment, date: new Date().toISOString().slice(0, 10),
      });
      setMsg('✅ Ovozingiz qabul qilindi!');
      setChoice(''); setComment(''); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  }

  if (surveys === null) return <Spinner />;

  const s = stats[active?.title] || { ha: 0, yoq: 0, comments: [] };
  const total = s.ha + s.yoq;
  const haPct = total ? Math.round((s.ha / total) * 100) : 0;

  return (
    <div>
      <PageHeader icon={ClipboardList} title="So'rovnomalar" subtitle="Ovoz bering va fikringizni qoldiring"
        actions={isAdmin && !showCreate && (
          <button className="btn-gold" onClick={() => setShowCreate(true)}>+ Yangi so'rovnoma</button>
        )} />

      {showCreate && (
        <div className="card p-5 mb-5 animate-fade">
          <h3 className="font-display text-lg text-navy-800 mb-3">Yangi so'rovnoma</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Sarlavha *</label>
              <input className="input !py-2.5" placeholder="So'rovnoma sarlavhasi..." autoFocus
                value={newSurvey.title} onChange={e => setNewSurvey({...newSurvey, title: e.target.value})} />
            </div>
            <div>
              <label className="label">Auditoriya</label>
              <select className="input !py-2.5" value={newSurvey.audience} onChange={e => setNewSurvey({...newSurvey, audience: e.target.value})}>
                <option>Barcha</option>
                <option>O'quvchilar</option>
                <option>O'qituvchilar</option>
                <option>Ota-onalar</option>
                <option>Xodimlar</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Bekor</button>
            <button className="btn-gold" onClick={createSurvey}>Yaratish</button>
          </div>
        </div>
      )}

      {surveys.length === 0 ? <Empty icon={ClipboardList} title="So'rovnoma yo'q" /> : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ro'yxat */}
          <div className="space-y-2">
            {surveys.map((sv) => {
              const st = stats[sv.title] || { ha: 0, yoq: 0 };
              const on = active?.id === sv.id;
              return (
                <button key={sv.id} onClick={() => { setActive(sv); setMsg(''); setChoice(''); }}
                  className={`w-full text-left card p-4 transition ${on ? 'ring-2 ring-gold shadow-glow' : 'hover:shadow-md'}`}>
                  <div className="font-semibold text-navy-800 text-sm">{sv.title}</div>
                  <div className="text-xs text-navy-400 mt-1">{sv.audience} · {sv.date}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-emerald-600 font-bold">👍 {st.ha}</span>
                    <span className="text-red-500 font-bold">👎 {st.yoq}</span>
                    <span className={`chip ml-auto ${sv.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{sv.status}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ovoz berish + natija */}
          <div className="lg:col-span-2 space-y-4">
            {active && (
              <>
                <div className="card p-6">
                  <h3 className="font-display text-xl text-navy-800 mb-1">{active.title}</h3>
                  <p className="text-sm text-navy-400 mb-5">{active.audience} · {active.date}</p>

                  {/* Natija bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-emerald-600">Ha — {s.ha} ({haPct}%)</span>
                      <span className="text-red-500">Yo'q — {s.yoq} ({100 - haPct}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-red-100 overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${haPct}%` }} />
                    </div>
                    <div className="text-xs text-navy-400 mt-1.5">Jami {total} ta ovoz</div>
                  </div>

                  {myVote ? (
                    <div className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-600">
                      ✔️ Siz allaqachon ovoz bergansiz: <b className={myVote.vote === 'ha' ? 'text-emerald-600' : 'text-red-500'}>{myVote.vote}</b>
                      {myVote.comment && <div className="text-xs text-navy-400 mt-1">"{myVote.comment}"</div>}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3 mb-4">
                        <button onClick={() => setChoice('ha')}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition ${
                            choice === 'ha' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow' : 'border-navy-100 text-navy-500 hover:border-emerald-300'}`}>
                          <ThumbsUp size={18} /> Ha
                        </button>
                        <button onClick={() => setChoice("yo'q")}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition ${
                            choice === "yo'q" ? 'border-red-500 bg-red-50 text-red-600 shadow' : 'border-navy-100 text-navy-500 hover:border-red-300'}`}>
                          <ThumbsDown size={18} /> Yo'q
                        </button>
                      </div>
                      <label className="label">Sharh (ixtiyoriy)</label>
                      <textarea className="input !py-2.5 min-h-[80px] resize-none" placeholder="Fikringizni yozing..."
                        value={comment} onChange={(e) => setComment(e.target.value)} />
                      <button className="btn-gold w-full mt-4" onClick={submit}><Send size={16} /> Ovoz berish</button>
                    </>
                  )}
                  {msg && <div className="mt-3 text-sm text-center text-navy-600">{msg}</div>}
                </div>

                {/* Sharhlar */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-gold" />
                    <h3 className="font-display text-lg text-navy-800">Sharhlar ({s.comments.length})</h3>
                  </div>
                  {s.comments.length === 0 ? (
                    <p className="text-sm text-navy-400">Hozircha sharh yo'q.</p>
                  ) : (
                    <div className="space-y-2">
                      {s.comments.map((c) => (
                        <div key={c.id} className="flex gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                          <div className={`grid place-items-center w-8 h-8 rounded-lg text-white text-xs font-bold shrink-0 ${c.vote === 'ha' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {c.voter[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-navy-800">{c.voter} <span className="text-xs font-normal text-navy-400">· {c.date}</span></div>
                            <div className="text-sm text-navy-600">{c.comment}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
