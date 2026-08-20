import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Plus, UserPlus, UserMinus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { staff: '', position: '', event: 'hired', date: new Date().toISOString().slice(0, 10), reason: '' };

export default function TurnoverLogPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/turnover_log?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const hired = useMemo(() => (rows || []).filter((r) => r.event === 'hired').length, [rows]);
  const left = useMemo(() => (rows || []).filter((r) => r.event === 'left').length, [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try { await api.post('/turnover_log', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Kadrlar aylanmasi" subtitle={`${hired} ta ishga qabul · ${left} ta ketgan`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yozuv qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={TrendingUp} title="Yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              {r.event === 'hired'
                ? <UserPlus size={16} className="text-emerald-500 shrink-0" />
                : <UserMinus size={16} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.staff}</div>
                <div className="text-[11px] text-navy-400">{r.position || 'lavozim yo\'q'} · {r.date} {r.reason && `· ${r.reason}`}</div>
              </div>
              <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 shrink-0 ${r.event === 'hired' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>{r.event === 'hired' ? 'ishga qabul' : 'ketdi'}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Kadrlar harakati" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <label className="label">Lavozim</label>
        <input className="input !py-2.5 mb-4" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <label className="label mb-2">Voqea</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[['hired', 'Ishga qabul'], ['left', 'Ishdan ketdi']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, event: v })}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${form.event === v ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="label">Sabab</label>
        <input className="input !py-2.5" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </Modal>
    </div>
  );
}
