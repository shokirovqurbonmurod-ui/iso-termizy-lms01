import { useEffect, useState } from 'react';
import { Cross, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const empty = { person: '', incident: '', treatment: '', date: new Date().toISOString().slice(0, 10), status: 'completed' };

export default function FirstAidLogPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/first_aid_log?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.person.trim()) return;
    setSaving(true);
    try { await api.post('/first_aid_log', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Cross} title="Birinchi yordam" subtitle="Kichik jarohat va tibbiy yordam yozuvlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yozuv qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Cross} title="Yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-navy-800">{r.person}</span>
                <span className={`chip text-[9px] ${statusStyle(r.status)}`}>{r.date}</span>
              </div>
              <div className="text-xs text-navy-600">{r.incident}</div>
              {r.treatment && <div className="text-[11px] text-navy-500 mt-0.5">Ko'rsatilgan yordam: {r.treatment}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yozuv qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Shaxs (o'quvchi/xodim)</label>
        <input className="input !py-2.5 mb-4" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} />
        <label className="label">Hodisa</label>
        <input className="input !py-2.5 mb-4" value={form.incident} onChange={(e) => setForm({ ...form, incident: e.target.value })} />
        <label className="label">Ko'rsatilgan yordam</label>
        <input className="input !py-2.5" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} />
      </Modal>
    </div>
  );
}
