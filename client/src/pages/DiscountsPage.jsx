import { useEffect, useMemo, useState } from 'react';
import { Percent, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { name: '', percent: 10, applies_to: '', valid_until: '', status: 'active' };

export default function DiscountsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/discounts?limit=500').catch(() => []);
    setRows(r || []);
  }
  useEffect(() => { load(); }, []);

  const activeCount = useMemo(() => (rows || []).filter((r) => r.status === 'active').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/discounts', { ...form, percent: Number(form.percent) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function toggleStatus(row) {
    await api.put(`/discounts/${row.id}`, { status: row.status === 'active' ? 'expired' : 'active' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Percent} title="Chegirmalar" subtitle={`${activeCount} ta faol chegirma`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Chegirma qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Percent} title="Chegirma yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {rows.map((disc) => (
            <div key={disc.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gold-600 text-lg">{disc.percent}%</span>
                <button onClick={() => toggleStatus(disc)} className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${statusStyle(disc.status)}`}>{disc.status}</button>
              </div>
              <div className="text-sm font-semibold text-navy-800 truncate">{disc.name}</div>
              <div className="text-[10px] text-navy-400">{disc.applies_to} · {disc.valid_until} gacha</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Chegirma qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Chegirma nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Ikkinchi farzand chegirmasi" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Foiz (%)</label>
            <input className="input !py-2.5" type="number" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />
          </div>
          <div>
            <label className="label">Amal muddati</label>
            <input className="input !py-2.5" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </div>
        </div>
        <label className="label">Qamrov</label>
        <input className="input !py-2.5" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} placeholder="Masalan: barcha kurslar" />
      </Modal>
    </div>
  );
}
