import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Plus, Users, Coins, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { title: '', target: '', date: new Date().toISOString().slice(0, 10), status: 'active' };
const today = () => new Date().toISOString().slice(0, 10);

export default function FitnessChallengePage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState({});
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [r, l] = await Promise.all([
      api.get('/fitness_challenge?limit=500').catch(() => []),
      api.get('/fitness_logs?limit=2000').catch(() => []),
    ]);
    setRows((r || []).filter((x) => x.status !== 'archived'));
    setLogs(l || []);
  }
  useEffect(() => { load(); }, []);

  function logsFor(id) { return logs.filter((l) => String(l.challenge_id) === String(id)); }
  function myTotal(id) { return logsFor(id).filter((l) => l.student === user.full_name).reduce((s, l) => s + (Number(l.amount) || 0), 0); }
  function loggedToday(id) { return logsFor(id).some((l) => l.student === user.full_name && l.date === today()); }
  function topList(id) {
    const totals = {};
    for (const l of logsFor(id)) totals[l.student] = (totals[l.student] || 0) + (Number(l.amount) || 0);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/fitness_challenge', { ...form, participants: 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function logActivity(challenge) {
    const amt = Number(amount[challenge.id]) || 0;
    if (amt <= 0) { alert("Miqdorni kiriting"); return; }
    setBusyId(challenge.id);
    try {
      const res = await api.post('/fitness/log', { challenge_id: challenge.id, amount: amt });
      setAmount((a) => ({ ...a, [challenge.id]: '' }));
      await load();
      alert(`✅ Belgilandi! +${res.reward} coin yutdingiz.`);
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Dumbbell} title="Fitness challenge" subtitle="Kundalik faollikni belgilang va reytingda yuqoriga chiqing"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi challenge</button>} />

      {rows.length === 0 ? <Empty icon={Dumbbell} title="Challenge yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((c) => {
            const top = topList(c.id);
            const done = loggedToday(c.id);
            return (
              <div key={c.id} className="card p-4">
                <div className="text-sm font-bold text-navy-800 mb-0.5">{c.title}</div>
                <div className="text-xs text-navy-400 mb-1">{c.target}</div>
                <div className="flex items-center gap-3 text-[11px] text-navy-500 mb-3">
                  <span className="flex items-center gap-1"><Users size={11} /> {c.participants || 0} ishtirokchi</span>
                  <span className="flex items-center gap-1 text-gold-600 font-bold"><Coins size={11} /> Mening jamim: {myTotal(c.id)}</span>
                </div>
                {top.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {top.map(([name, val], i) => (
                      <div key={name} className="flex items-center justify-between text-[11px] rounded-lg bg-navy-50/60 px-2.5 py-1.5">
                        <span className="text-navy-600">{i + 1}. {name}</span>
                        <span className="font-bold text-navy-800">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!canManage && (
                  done ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Bugun belgilandi</div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="number" placeholder="Miqdor" className="input !py-1.5 text-xs flex-1"
                        value={amount[c.id] || ''} onChange={(e) => setAmount((a) => ({ ...a, [c.id]: e.target.value }))} />
                      <button onClick={() => logActivity(c)} disabled={busyId === c.id} className="btn-gold !py-1.5 !px-3 text-xs shrink-0">
                        {busyId === c.id ? '...' : '+1-3 coin'}
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi challenge" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Maqsad</label>
        <input className="input !py-2.5" placeholder="Masalan: kuniga 10000 qadam" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
      </Modal>
    </div>
  );
}
