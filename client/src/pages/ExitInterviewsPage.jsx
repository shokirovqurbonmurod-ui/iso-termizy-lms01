import { useEffect, useState } from 'react';
import { FileText, Plus, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { staff: '', position: '', last_day: new Date().toISOString().slice(0, 10), reason: '', rating: 3, notes: '' };

export default function ExitInterviewsPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/exit_interviews?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.last_day || '').localeCompare(a.last_day || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.staff.trim()) return;
    setSaving(true);
    try { await api.post('/exit_interviews', { ...form, rating: Number(form.rating) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={FileText} title="Chiqish suhbati" subtitle="Ishdan ketayotgan xodimlar bilan suhbat yozuvlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Suhbat qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={FileText} title="Suhbat yozuvi yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-navy-800">{r.staff}</span>
                <span className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? 'text-gold-500 fill-gold-500' : 'text-navy-200'} />)}</span>
              </div>
              <div className="text-[11px] text-navy-400">{r.position || "lavozim yo'q"} · so'nggi kun: {r.last_day}</div>
              {r.reason && <div className="text-xs text-navy-600 mt-1">Sabab: {r.reason}</div>}
              {r.notes && <div className="text-xs text-navy-500 mt-0.5">{r.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Chiqish suhbati qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Xodim</label>
        <input className="input !py-2.5 mb-4" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Lavozim</label>
            <input className="input !py-2.5" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <label className="label">So'nggi ish kuni</label>
            <input className="input !py-2.5" type="date" value={form.last_day} onChange={(e) => setForm({ ...form, last_day: e.target.value })} />
          </div>
        </div>
        <label className="label">Ketish sababi</label>
        <input className="input !py-2.5 mb-4" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <label className="label mb-2">Baho (1-5)</label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}
              className={`rounded-xl border py-2 text-sm font-semibold transition ${form.rating === n ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {n}
            </button>
          ))}
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Modal>
    </div>
  );
}
