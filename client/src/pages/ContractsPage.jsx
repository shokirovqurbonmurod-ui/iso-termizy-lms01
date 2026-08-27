import { useEffect, useMemo, useState } from 'react';
import { FileSignature, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';

function today() { return new Date().toISOString().slice(0, 10); }
const empty = { title: '', party: '', start_date: today(), end_date: '', amount: 0, status: 'draft' };

export default function ContractsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/contracts?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')));
  }
  useEffect(() => { load(); }, []);

  const activeTotal = useMemo(() => (rows || []).filter((r) => r.status === 'active').reduce((a, r) => a + (Number(r.amount) || 0), 0), [rows]);
  const expiringSoon = useMemo(() => {
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const limit = in30.toISOString().slice(0, 10);
    return (rows || []).filter((r) => r.status === 'active' && r.end_date && r.end_date <= limit).length;
  }, [rows]);

  function openAdd() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(c) { setEditing(c); setForm({ title: c.title || '', party: c.party || '', start_date: c.start_date || today(), end_date: c.end_date || '', amount: c.amount ?? 0, status: c.status || 'draft' }); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (editing) await api.put(`/contracts/${editing.id}`, payload);
      else await api.post('/contracts', payload);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(c) {
    if (!confirm(`"${c.title}" shartnomasini o'chirmoqchimisiz?`)) return;
    try { await api.del(`/contracts/${c.id}`); await load(); }
    catch (e) { alert(e.message); }
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileSignature} title="Shartnomalar" subtitle={`${money(activeTotal)} faol shartnomalar summasi · ${expiringSoon} ta 30 kun ichida tugaydi`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Shartnoma qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={FileSignature} title="Shartnoma yo'q" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                {['Shartnoma', 'Taraf', 'Boshlanish', 'Tugash', 'Summa', 'Holat', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const expiring = c.status === 'active' && c.end_date && c.end_date <= (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
                return (
                  <tr key={c.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                    <td className="px-4 py-3 font-semibold text-navy-800">{c.title}</td>
                    <td className="px-4 py-3 text-navy-600">{c.party}</td>
                    <td className="px-4 py-3 text-xs text-navy-500">{c.start_date}</td>
                    <td className={`px-4 py-3 text-xs ${expiring ? 'text-amber-600 font-bold' : 'text-navy-500'}`}>{c.end_date}{expiring && ' · tez orada tugaydi'}</td>
                    <td className="px-4 py-3 tabular-nums text-navy-700">{money(c.amount)}</td>
                    <td className="px-4 py-3"><span className={`chip text-[9px] ${statusStyle(c.status)}`}>{c.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={13} /></button>
                        <button onClick={() => remove(c)} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editing ? 'Shartnomani tahrirlash' : "Shartnoma qo'shish"} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Shartnoma nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Ikkinchi taraf</label>
        <input className="input !py-2.5 mb-4" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Boshlanish</label>
            <input className="input !py-2.5" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Tugash</label>
            <input className="input !py-2.5" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Summa</label>
            <input className="input !py-2.5" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Holat</label>
            <select className="input !py-2.5" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
