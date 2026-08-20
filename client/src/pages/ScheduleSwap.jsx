import { useEffect, useState } from 'react';
import { Repeat, Plus, Check, X, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };

export default function ScheduleSwap() {
  const { user } = useAuth();
  const canDecide = ['founder', 'director', 'super_admin', 'admin', 'academic_manager', 'head_teacher'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ group_name: '', date: new Date().toISOString().slice(0, 10), reason: '', substitute_teacher: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState(null);
  const [subFor, setSubFor] = useState('');

  async function load() {
    const [r, g, t] = await Promise.all([
      api.get('/schedule-swap').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/teachers').catch(() => []),
    ]);
    setRows(r || []); setGroups(g || []); setTeachers(t || []);
  }
  useEffect(() => { load(); }, []);

  const myGroups = groups.filter((g) => g.teacher === user.full_name);

  function openRequest() {
    setForm({ group_name: myGroups[0]?.name || '', date: new Date().toISOString().slice(0, 10), reason: '', substitute_teacher: '' });
    setErr(''); setModal(true);
  }

  async function submit() {
    if (!form.group_name || !form.date) { setErr("Guruh va sanani tanlang"); return; }
    setSaving(true);
    try {
      await api.post('/schedule-swap/request', form);
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function decide(row, status) {
    setDecidingId(row.id);
    try {
      await api.put(`/schedule-swap/${row.id}/decide`, { status, substitute_teacher: subFor });
      setSubFor('');
      await load();
    } catch (e) { alert(e.message); }
    setDecidingId(null);
  }

  if (rows === null) return <Spinner />;
  const pending = rows.filter((r) => r.status === 'pending');
  const decided = rows.filter((r) => r.status !== 'pending');

  return (
    <div>
      <PageHeader icon={Repeat} title="Dars/Ustoz jadval almashtirish" subtitle="O'qituvchi darsini boshqa kunga yoki o'rin bosuvchiga topshirish so'rovlari"
        actions={myGroups.length > 0 && <button className="btn-gold" onClick={openRequest}><Plus size={16} /> Yangi so'rov</button>} />

      <div className="card p-5 mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-gold" /> Kutilayotgan so'rovlar ({pending.length})</h3>
        {pending.length === 0 ? <Empty icon={Repeat} title="Kutilayotgan so'rov yo'q" /> : (
          <div className="space-y-2">
            {pending.map((row) => (
              <div key={row.id} className="rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="text-sm font-bold text-navy-800">{row.teacher} — {row.group_name}</div>
                  <span className={`chip text-[10px] ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                </div>
                <div className="text-xs text-navy-500 mb-2">{row.date} {row.reason && `· ${row.reason}`}</div>
                {canDecide && (
                  <div className="flex items-center gap-2">
                    <select className="input !py-1.5 text-xs flex-1" value={decidingId === row.id ? subFor : ''} onChange={(e) => setSubFor(e.target.value)}>
                      <option value="">O'rin bosuvchi (ixtiyoriy)</option>
                      {teachers.filter((t) => t.full_name !== row.teacher).map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                    </select>
                    <button onClick={() => decide(row, 'approved')} disabled={decidingId === row.id} className="btn-gold !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Tasdiqlash</button>
                    <button onClick={() => decide(row, 'rejected')} disabled={decidingId === row.id} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0 !border-red-200 !text-red-500"><X size={13} /> Rad etish</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4">Tarix</h3>
        {decided.length === 0 ? <p className="text-sm text-navy-400">Hali qaror qabul qilinmagan</p> : (
          <div className="space-y-1.5">
            {decided.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                <span className="text-navy-700">{row.teacher} — {row.group_name} ({row.date}){row.substitute_teacher && ` → ${row.substitute_teacher}`}</span>
                <span className={`chip text-[9px] shrink-0 ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} title="Dars almashtirish so'rovi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submit} disabled={saving}>{saving ? 'Yuborilmoqda...' : "So'rov yuborish"}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              {myGroups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <label className="label">O'rin bosuvchi taklif (ixtiyoriy)</label>
        <select className="input !py-2.5 mb-4" value={form.substitute_teacher} onChange={(e) => setForm({ ...form, substitute_teacher: e.target.value })}>
          <option value="">— tanlanmagan —</option>
          {teachers.filter((t) => t.full_name !== user.full_name).map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
        </select>
        <label className="label">Sabab</label>
        <textarea className="input !py-2.5" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Modal>
    </div>
  );
}
