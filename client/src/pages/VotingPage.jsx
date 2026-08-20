import { useEffect, useState } from 'react';
import { Vote, Plus, Check, Lock, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function VotingPage() {
  const { user } = useAuth();
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const [polls, setPolls] = useState(null);
  const [modal, setModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setPolls(await api.get('/voting/polls').catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function vote(pollId, idx) {
    setErr('');
    try {
      await api.post(`/voting/polls/${pollId}/vote`, { option_index: idx });
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function closePoll(id) {
    if (!confirm("Bu so'rovnomani yopasizmi? Ovoz berish to'xtaydi.")) return;
    await api.post(`/voting/polls/${id}/close`, {}).catch((e) => alert(e.message));
    await load();
  }

  async function removePoll(id) {
    if (!confirm("So'rovnomani o'chirasizmi?")) return;
    await api.del(`/voting/polls/${id}`).catch((e) => alert(e.message));
    await load();
  }

  function updateOption(i, val) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function createPoll() {
    setErr('');
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOpts.length < 2) { setErr("Savol va kamida 2 ta variant kiriting."); return; }
    setBusy(true);
    try {
      await api.post('/voting/polls', { question: question.trim(), options: cleanOpts });
      setModal(false); setQuestion(''); setOptions(['', '']);
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  if (polls === null) return <Spinner />;

  const active = polls.filter((p) => p.status === 'active');
  const closed = polls.filter((p) => p.status !== 'active');

  function PollCard(p) {
    const voted = p.myVoteIndex !== null;
    return (
      <div key={p.id} className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-lg text-navy-800">{p.question}</h3>
          {isStaff && (
            <div className="flex items-center gap-2 shrink-0">
              {p.status === 'active' && <button onClick={() => closePoll(p.id)} className="text-navy-300 hover:text-amber-500" title="Yopish"><Lock size={14} /></button>}
              <button onClick={() => removePoll(p.id)} className="text-navy-300 hover:text-red-500" title="O'chirish"><Trash2 size={14} /></button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {p.options.map((opt, i) => {
            const pct = p.percentages[i];
            const isMine = p.myVoteIndex === i;
            const canVote = p.status === 'active' && !voted;
            return (
              <button key={i} disabled={!canVote} onClick={() => vote(p.id, i)}
                className={`relative w-full text-left rounded-xl border overflow-hidden px-4 py-2.5 transition ${
                  isMine ? 'border-gold' : 'border-navy-100'
                } ${canVote ? 'hover:border-gold/50 cursor-pointer' : 'cursor-default'}`}>
                {(voted || p.status !== 'active') && (
                  <div className="absolute inset-0 bg-gold/10" style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between text-sm font-semibold text-navy-800">
                  <span className="flex items-center gap-1.5">{isMine && <Check size={14} className="text-gold-600" />} {opt}</span>
                  {(voted || p.status !== 'active') && <span className="text-navy-500">{pct}% ({p.counts[i]})</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3 text-[11px] text-navy-400">
          <span>{p.total} ovoz · {p.created_by}</span>
          <span className={`chip text-[9px] ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'}`}>{p.status === 'active' ? 'Faol' : 'Yopilgan'}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={Vote} title="Saylov & So'rovnoma" subtitle="Guruh yoki markaz bo'yicha qaror uchun ovoz bering"
        actions={isStaff && <button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Yangi so'rovnoma</button>} />

      {err && <p className="text-xs text-red-500 mb-3">{err}</p>}

      {polls.length === 0 ? <Empty icon={Vote} title="Hali so'rovnoma yo'q" /> : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy-400 uppercase mb-2">Faol</h3>
              <div className="grid md:grid-cols-2 gap-4">{active.map(PollCard)}</div>
            </div>
          )}
          {closed.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy-400 uppercase mb-2">Yopilgan</h3>
              <div className="grid md:grid-cols-2 gap-4">{closed.map(PollCard)}</div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} title="Yangi so'rovnoma" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={createPoll} disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Yaratish'}</button>
        </>}>
        <label className="label">Savol</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Bugun qaysi filmni ko'ramiz?" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <label className="label">Variantlar</label>
        {options.map((o, i) => (
          <input key={i} className="input !py-2.5 mb-2" placeholder={`Variant ${i + 1}`} value={o} onChange={(e) => updateOption(i, e.target.value)} />
        ))}
        <button className="btn-ghost !py-1.5 !px-3 text-xs mb-2" onClick={() => setOptions([...options, ''])}><Plus size={13} /> Variant qo'shish</button>
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
