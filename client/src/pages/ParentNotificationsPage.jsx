import { useEffect, useState } from 'react';
import { Bell, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const CHANNELS = ['SMS', 'Telegram', "Ilova ichida"];
const empty = { student: '', message: '', channel: 'Telegram', date: new Date().toISOString().slice(0, 10), status: 'pending' };

export default function ParentNotificationsPage() {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/parent_notifications?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...empty, student: students[0]?.full_name || '' }); setModal(true); }

  async function save() {
    if (!form.student.trim() || !form.message.trim()) return;
    setSaving(true);
    try { await api.post('/parent_notifications', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function markSent(row) {
    await api.put(`/parent_notifications/${row.id}`, { status: 'sent' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Bell} title="Ota-ona xabarnoma" subtitle="Ota-onalarga yuboriladigan shaxsiy xabarlar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Xabar qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Bell} title="Xabar yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.student}</div>
                <div className="text-xs text-navy-600">{r.message}</div>
                <div className="text-[11px] text-navy-400">{r.channel} · {r.date}</div>
              </div>
              {r.status === 'sent'
                ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 shrink-0">yuborildi</span>
                : <button onClick={() => markSent(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Yuborish</button>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Ota-onaga xabar" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <select className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
          {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
        </select>
        <label className="label">Xabar</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <label className="label">Kanal</label>
        <select className="input !py-2.5" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Modal>
    </div>
  );
}
