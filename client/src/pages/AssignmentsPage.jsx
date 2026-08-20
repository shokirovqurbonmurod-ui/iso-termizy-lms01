import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Clock, Users, Check, Coins, ArrowLeft, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Matematika', 'Tarix', 'Huquq', 'IT'];
const emptyForm = { title: '', subject: SUBJECTS[0], group_name: '', description: '', deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), coin_reward: 50 };

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [items, setItems] = useState(null);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  async function load() {
    const [i, g, s, c] = await Promise.all([
      api.get('/assignments?limit=500').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
    ]);
    setItems((i || []).sort((a, b) => (b.deadline || '').localeCompare(a.deadline || '')));
    setGroups(g || []); setStudents(s || []);
    setCompletions((c || []).filter((x) => x.item_type === 'assignments'));
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => (
    canManage ? (items || []) : (items || []).filter((it) => it.group_name === user.group_name)
  ), [items, canManage, user.group_name]);

  function roster(groupName) { return students.filter((s) => s.group_name === groupName); }
  function completionFor(itemId, studentName) { return completions.find((c) => String(c.item_id) === String(itemId) && c.student === studentName); }
  function approvedCount(itemId) { return completions.filter((c) => String(c.item_id) === String(itemId) && c.status === 'approved').length; }

  function openAdd() { setForm({ ...emptyForm, group_name: groups[0]?.name || '' }); setModal(true); }

  async function save() {
    if (!form.title.trim() || !form.group_name) { alert("Topshiriq nomi va guruhni kiriting"); return; }
    setSaving(true);
    try {
      await api.post('/assignments', { ...form, coin_reward: Math.min(200, Number(form.coin_reward) || 0), max_score: 100, submitted: 0, status: 'open' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  // ── O'quvchi: o'zi topshiradi ──
  async function submitMine(item) {
    const existing = completionFor(item.id, user.full_name);
    if (existing) return;
    try {
      await api.post('/assignment-actions/submit', { item_id: item.id });
      await load();
    } catch (e) { alert(e.message); }
  }

  // ── O'qituvchi: tasdiqlaydi va coin beradi ──
  async function approve(item, studentName) {
    const c = completionFor(item.id, studentName);
    if (!c || c.status === 'approved') return;
    await api.put(`/assignment_completions/${c.id}`, { status: 'approved' }).catch(() => {});
    const student = students.find((s) => s.full_name === studentName && s.group_name === item.group_name) || students.find((s) => s.full_name === studentName);
    if (student && Number(item.coin_reward) > 0) {
      await api.post('/coins/give', { student_id: student.id, amount: Number(item.coin_reward), reason: `Topshiriq: ${item.title}` }).catch(() => {});
    }
    await load();
  }

  if (items === null) return <Spinner />;

  // ── Ekran: roster (admin) ──
  if (detail) {
    const group = roster(detail.group_name);
    return (
      <div>
        <button onClick={() => setDetail(null)} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <PageHeader icon={ClipboardList} title={detail.title} subtitle={`${detail.subject || 'Umumiy'} · ${detail.group_name}`}
          actions={Number(detail.coin_reward) > 0 && <span className="chip bg-gold/10 text-gold-700 flex items-center gap-1"><Coins size={12} /> +{detail.coin_reward} coin</span>} />
        {detail.description && <p className="text-sm text-navy-500 mb-5 -mt-3">{detail.description}</p>}
        {group.length === 0 ? <Empty icon={Users} title="Guruhda o'quvchi yo'q" /> : (
          <div className="space-y-1.5">
            {group.map((s) => {
              const c = completionFor(detail.id, s.full_name);
              const status = c?.status || 'none';
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{s.full_name[0]}</div>
                  <span className="flex-1 text-sm font-semibold text-navy-800 truncate">{s.full_name}</span>
                  {status === 'approved' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 text-emerald-600 bg-emerald-50"><Check size={12} /> Tasdiqlangan</span>
                  ) : status === 'submitted' ? (
                    <button onClick={() => approve(detail, s.full_name)} className="btn-gold !py-1 !px-3 text-[11px] shrink-0"><Check size={12} /> Tasdiqlash</button>
                  ) : (
                    <span className="text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 text-navy-400 bg-navy-100">Kutilmoqda</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Ekran: topshiriqlar ro'yxati ──
  return (
    <div>
      <PageHeader icon={ClipboardList} title="Topshiriqlar" subtitle="Amaliy topshiriqlar, topshirish va tasdiqlash"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi topshiriq</button>} />

      {visible.length === 0 ? <Empty icon={ClipboardList} title="Topshiriq yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item) => {
            const group = roster(item.group_name);
            const size = group.length || 1;
            const approved = approvedCount(item.id);
            const pct = Math.round((approved / size) * 100);
            const left = daysLeft(item.deadline);
            const mine = !canManage ? completionFor(item.id, user.full_name) : null;
            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="chip text-[9px] bg-gold/10 text-gold-700">{item.subject || 'Umumiy'}</span>
                  {Number(item.coin_reward) > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600"><Coins size={12} /> +{item.coin_reward}</span>}
                </div>
                <div className="text-sm font-bold text-navy-800 mb-0.5">{item.title}</div>
                <div className="text-xs text-navy-400 mb-3 flex items-center gap-1"><Users size={11} /> {item.group_name}</div>
                {left !== null && (
                  <div className={`flex items-center gap-1 text-[11px] mb-3 ${left < 0 ? 'text-red-500' : left <= 2 ? 'text-amber-500' : 'text-navy-400'}`}>
                    <Clock size={11} /> {left < 0 ? "Muddati o'tgan" : left === 0 ? 'Bugun' : `${left} kun qoldi`}
                  </div>
                )}
                {canManage ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 rounded-full bg-navy-100 overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-navy-600 shrink-0">{approved}/{size}</span>
                    </div>
                    <button onClick={() => setDetail(item)} className="btn-ghost w-full !py-1.5 text-xs">Ko'rish</button>
                  </>
                ) : (
                  mine?.status === 'approved' ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Tasdiqlandi{Number(item.coin_reward) > 0 ? ` +${item.coin_reward} coin` : ''}</div>
                  ) : mine?.status === 'submitted' ? (
                    <div className="text-center text-xs font-bold text-navy-400 bg-navy-100 rounded-xl py-1.5">Tekshirilmoqda...</div>
                  ) : (
                    <button onClick={() => submitMine(item)} className="btn-gold w-full !py-1.5 text-xs"><Send size={12} /> Topshirish</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi topshiriq" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
        </div>
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5 mb-4" rows={2} placeholder="Topshiriq tavsifi..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Muddat</label>
            <input className="input !py-2.5" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <label className="label">Coin mukofoti</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.coin_reward} onChange={(e) => setForm({ ...form, coin_reward: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
