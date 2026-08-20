import { useEffect, useMemo, useState } from 'react';
import { Send, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';

const CHANNELS = ['Instagram', 'Telegram', 'Facebook', 'Referal', 'SMS'];
const CHANNEL_COLOR = { Instagram: 'bg-pink-400', Telegram: 'bg-sky-400', Facebook: 'bg-blue-500', Referal: 'bg-emerald-400', SMS: 'bg-amber-400' };
const empty = { name: '', channel: 'Instagram', budget: 0, leads: 0, status: 'active' };

export default function CampaignsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/campaigns?limit=500').catch(() => []);
    setRows(r || []);
  }
  useEffect(() => { load(); }, []);

  const totalBudget = useMemo(() => (rows || []).reduce((a, c) => a + (Number(c.budget) || 0), 0), [rows]);
  const totalLeads = useMemo(() => (rows || []).reduce((a, c) => a + (Number(c.leads) || 0), 0), [rows]);
  const cpl = totalLeads ? Math.round(totalBudget / totalLeads) : 0;

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/campaigns', { ...form, budget: Number(form.budget) || 0, leads: Number(form.leads) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Send} title="Kampaniyalar" subtitle="Marketing kampaniyalari samaradorligi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi kampaniya</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{money(totalBudget)}</div>
          <div className="text-sm text-navy-400">Jami byudjet</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-gold-600">{totalLeads}</div>
          <div className="text-sm text-navy-400">Jami lidlar</div>
        </div>
        <div className="card stat-glow p-5">
          <div className="font-display text-2xl text-navy-800">{money(cpl)}</div>
          <div className="text-sm text-navy-400">1 lid narxi</div>
        </div>
      </div>

      {rows.length === 0 ? <Empty icon={Send} title="Kampaniya yo'q" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                {['Kampaniya', 'Kanal', 'Byudjet', 'Lidlar', '1 lid narxi', 'Holat'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                  <td className="px-4 py-3 font-semibold text-navy-800">{c.name}</td>
                  <td className="px-4 py-3"><span className={`chip text-[9px] text-white ${CHANNEL_COLOR[c.channel] || 'bg-navy-400'}`}>{c.channel}</span></td>
                  <td className="px-4 py-3 tabular-nums text-navy-700">{money(c.budget)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-navy-700">{c.leads}</td>
                  <td className="px-4 py-3 tabular-nums text-navy-500">{c.leads ? money(Math.round(c.budget / c.leads)) : '—'}</td>
                  <td className="px-4 py-3"><span className={`chip text-[9px] ${statusStyle(c.status)}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title="Yangi kampaniya" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Kampaniya nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kanal</label>
            <select className="input !py-2.5" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Byudjet</label>
            <input className="input !py-2.5" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
        </div>
        <label className="label">Kelgan lidlar soni</label>
        <input className="input !py-2.5" type="number" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} />
      </Modal>
    </div>
  );
}
