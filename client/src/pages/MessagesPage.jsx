import { useEffect, useMemo, useState } from 'react';
import { Send, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const CHANNELS = ['SMS', 'Telegram', 'Instagram', 'Email'];
const AUDIENCES = ['Barcha o\'quvchilar', 'Barcha ota-onalar', 'Barcha xodimlar', 'Faol o\'quvchilar', 'Qarzdorlar'];
const empty = { title: '', channel: 'Telegram', audience: AUDIENCES[0], date: new Date().toISOString().slice(0, 10), status: 'draft' };

export default function MessagesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/messages?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const sentCount = useMemo(() => (rows || []).filter((r) => r.status === 'sent').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await api.post('/messages', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function markSent(row) {
    if (!confirm(`"${row.title}" xabari ${row.audience} guruhiga yuborilsinmi?`)) return;
    await api.put(`/messages/${row.id}`, { status: 'sent' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Send} title="Xabar yuborish" subtitle={`${sentCount} ta yuborilgan · ${rows.length - sentCount} ta kutilmoqda`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi xabar</button>} />

      {rows.length === 0 ? <Empty icon={Send} title="Xabar yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.title}</div>
                <div className="text-[11px] text-navy-400">{r.channel} · {r.audience} · {r.date}</div>
              </div>
              {r.status === 'sent'
                ? <span className={`chip text-[10px] shrink-0 ${statusStyle('sent')}`}>yuborildi</span>
                : <button onClick={() => markSent(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Yuborish</button>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi xabar" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Qoralama sifatida saqlash'}</button>
        </>}
      >
        <label className="label">Xabar sarlavhasi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kanal</label>
            <select className="input !py-2.5" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Auditoriya</label>
            <select className="input !py-2.5" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <label className="label">Sana</label>
        <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Modal>
    </div>
  );
}
