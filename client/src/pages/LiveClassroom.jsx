import { useEffect, useMemo, useState } from 'react';
import { Video, Plus, ExternalLink, Radio, NotebookPen } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const PLATFORM_ICON = { Zoom: '🔵', 'Google Meet': '🟢', Jitsi: '🟣', Boshqa: '⚪' };

function isLiveNow(s) {
  if (!s.date || !s.time) return false;
  const start = new Date(`${s.date}T${s.time}`);
  const end = new Date(start.getTime() + 90 * 60000); // ~90 daqiqalik oyna
  const now = new Date();
  return now >= start && now <= end;
}
function isPast(s) {
  if (!s.date) return false;
  const start = new Date(`${s.date}T${s.time || '23:59'}`);
  return start.getTime() + 90 * 60000 < Date.now();
}

export default function LiveClassroom() {
  const { user } = useAuth();
  const canCreate = !['student', 'parent'].includes(user.role);
  const [sessions, setSessions] = useState(null);
  const [groups, setGroups] = useState([]);
  const [plans, setPlans] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', teacher: user.full_name, group_name: '', date: new Date().toISOString().slice(0, 10), time: '18:00', platform: 'Zoom', link: '', lesson_plan_id: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, g, lp] = await Promise.all([
      api.get('/live_sessions?limit=200').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/lesson_plans?limit=200').catch(() => []),
    ]);
    setSessions((s || []).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)));
    setGroups(g || []);
    setPlans(lp || []);
  }
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

  const live = useMemo(() => (sessions || []).filter(isLiveNow), [sessions]);
  const upcoming = useMemo(() => (sessions || []).filter((s) => !isLiveNow(s) && !isPast(s)), [sessions]);
  const past = useMemo(() => (sessions || []).filter(isPast), [sessions]);

  function openAdd() {
    setForm({ title: '', teacher: user.full_name, group_name: groups[0]?.name || '', date: new Date().toISOString().slice(0, 10), time: '18:00', platform: 'Zoom', link: '', lesson_plan_id: '' });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim() || !form.link.trim()) { alert("Dars nomi va havolani kiriting"); return; }
    setSaving(true);
    try {
      const plan = plans.find((p) => String(p.id) === String(form.lesson_plan_id));
      await api.post('/live_sessions', { ...form, status: 'planned', lesson_plan_title: plan?.title || '' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  function Card({ s, tone }) {
    return (
      <div className={`card p-4 ${tone === 'live' ? 'border-red-300 ring-2 ring-red-200' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-sm font-bold text-navy-800">{s.title}</div>
          {tone === 'live' && <span className="chip text-[9px] bg-red-500 text-white flex items-center gap-1 shrink-0"><Radio size={9} className="animate-pulse" /> JONLI</span>}
        </div>
        <div className="text-xs text-navy-400 mb-3">{s.teacher} · {s.group_name || 'Umumiy'}</div>
        {s.lesson_plan_title && (
          <div className="flex items-center gap-1 text-[11px] text-gold-700 bg-gold/10 rounded-lg px-2 py-1 mb-2 w-fit">
            <NotebookPen size={11} /> {s.lesson_plan_title}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-navy-500">{PLATFORM_ICON[s.platform] || '⚪'} {s.date} · {s.time}</span>
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer"
              className={`btn-gold !py-1.5 !px-3 text-xs ${tone === 'live' ? '!bg-red-500' : ''}`}>
              <ExternalLink size={12} /> Qo'shilish
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={Video} title="Live Classroom" subtitle="Onlayn darslar — Zoom/Google Meet havolalari bir joyda"
        actions={canCreate && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi dars</button>} />

      {sessions === null ? <Spinner /> : (
        <>
          {live.length > 0 && (
            <div className="mb-6">
              <h3 className="font-display text-lg text-red-600 mb-3 flex items-center gap-2"><Radio size={16} className="animate-pulse" /> Hozir jonli</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {live.map((s) => <Card key={s.id} s={s} tone="live" />)}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-display text-lg text-navy-800 mb-3">Yaqinlashayotgan darslar</h3>
            {upcoming.length === 0 ? <Empty icon={Video} title="Rejalashtirilgan dars yo'q" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((s) => <Card key={s.id} s={s} />)}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h3 className="font-display text-lg text-navy-800 mb-3">O'tgan darslar</h3>
              <div className="space-y-1.5">
                {past.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                    <span className="text-navy-600">{s.title} — {s.teacher} · {s.group_name}</span>
                    <span className="text-[11px] text-navy-400">{s.date} {s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modal} title="Yangi onlayn dars" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Dars nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Guruh</label>
            <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
              <option value="">— tanlang —</option>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Platforma</label>
            <select className="input !py-2.5" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {Object.keys(PLATFORM_ICON).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>
        <label className="label">Havola (Zoom/Meet link)</label>
        <input className="input !py-2.5 mb-4" placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        <label className="label">Dars rejasi (ixtiyoriy)</label>
        <select className="input !py-2.5" value={form.lesson_plan_id} onChange={(e) => setForm({ ...form, lesson_plan_id: e.target.value })}>
          <option value="">— tanlanmagan —</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.level})</option>)}
        </select>
      </Modal>
    </div>
  );
}
