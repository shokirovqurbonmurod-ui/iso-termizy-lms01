import { useEffect, useState } from 'react';
import { Users, Plus, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { reviewer: '', reviewee: '', date: new Date().toISOString().slice(0, 10), score: 4, comments: '' };

export default function PeerReviewsPage() {
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [r, s] = await Promise.all([api.get('/peer_reviews?limit=500').catch(() => []), api.get('/staff').catch(() => [])]);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); setStaff(s || []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.reviewer.trim() || !form.reviewee.trim()) return;
    setSaving(true);
    try { await api.post('/peer_reviews', { ...form, score: Number(form.score) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Peer review" subtitle="O'qituvchilarning bir-birini dars kuzatuvi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Kuzatuv qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Users} title="Kuzatuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-navy-800">{r.reviewer} → {r.reviewee}</span>
                <span className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.score ? 'text-gold-500 fill-gold-500' : 'text-navy-200'} />)}</span>
              </div>
              <div className="text-[11px] text-navy-400 mb-0.5">{r.date}</div>
              {r.comments && <div className="text-xs text-navy-600">{r.comments}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Peer review qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Kuzatuvchi</label>
            <input className="input !py-2.5" list="staff-list-pr" value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} />
          </div>
          <div>
            <label className="label">Kuzatilgan</label>
            <input className="input !py-2.5" list="staff-list-pr" value={form.reviewee} onChange={(e) => setForm({ ...form, reviewee: e.target.value })} />
          </div>
        </div>
        <datalist id="staff-list-pr">{staff.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <label className="label mb-2">Baho</label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setForm({ ...form, score: n })}
              className={`rounded-xl border py-2 text-sm font-semibold transition ${form.score === n ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {n}
            </button>
          ))}
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
      </Modal>
    </div>
  );
}
