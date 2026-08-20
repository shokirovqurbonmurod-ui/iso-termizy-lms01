import { useEffect, useMemo, useState } from 'react';
import { Send, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { lead: '', assigned_to: '', action: "Qo'ng'iroq", date: new Date().toISOString().slice(0, 10), result: '', status: 'planned' };
const ACTIONS = ["Qo'ng'iroq", 'SMS', 'Telegram xabar', 'Uchrashuv'];

export default function FollowUpsPage() {
  const [rows, setRows] = useState(null);
  const [leads, setLeads] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, l] = await Promise.all([api.get('/follow_ups?limit=500').catch(() => []), api.get('/leads').catch(() => [])]);
    setRows((r || []).sort((a, b) => (a.status === 'planned' ? -1 : 1) - (b.status === 'planned' ? -1 : 1) || (b.date || '').localeCompare(a.date || '')));
    setLeads(l || []);
  }
  useEffect(() => { load(); }, []);

  const planned = useMemo(() => (rows || []).filter((r) => r.status === 'planned'), [rows]);

  function openAdd() { setForm({ ...empty, lead: leads[0]?.name || '' }); setModal(true); }

  async function save() {
    if (!form.lead.trim()) return;
    setSaving(true);
    try { await api.post('/follow_ups', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function markDone(row) {
    const result = prompt('Natija:', row.result || '');
    if (result === null) return;
    await api.put(`/follow_ups/${row.id}`, { status: 'done', result }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Send} title="Follow Up" subtitle={`${planned.length} ta rejalashtirilgan aloqa`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi follow-up</button>} />

      {rows.length === 0 ? <Empty icon={Send} title="Follow-up yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.lead}</div>
                <div className="text-[11px] text-navy-400">{r.action} · {r.assigned_to || "mas'ul yo'q"} · {r.date}</div>
                {r.result && <div className="text-[11px] text-navy-500 mt-0.5">{r.result}</div>}
              </div>
              {r.status === 'planned' || r.status === 'pending'
                ? <button onClick={() => markDone(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Bajarildi</button>
                : <span className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status}</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi follow-up" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Lid</label>
        <input className="input !py-2.5 mb-4" list="leads-list" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} />
        <datalist id="leads-list">{leads.map((l) => <option key={l.id} value={l.name} />)}</datalist>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Amal turi</label>
            <select className="input !py-2.5" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <label className="label">Mas'ul xodim</label>
        <input className="input !py-2.5" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
      </Modal>
    </div>
  );
}
