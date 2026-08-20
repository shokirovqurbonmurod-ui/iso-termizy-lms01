import { useEffect, useState } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { teacher: '', period: '', metric: 'Sertifikat', score: 0, notes: '' };
const METRICS = ['Sertifikat', 'Reyting oshishi', "O'quvchilar bahosi", 'Malaka oshirish'];

export default function TeacherGrowthPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/teacher_growth?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.teacher.trim()) return;
    setSaving(true);
    try { await api.post('/teacher_growth', { ...form, score: Number(form.score) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Ustoz o'sishi" subtitle="O'qituvchilarning professional rivojlanishi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yozuv qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={TrendingUp} title="Yozuv yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.teacher}</div>
                <div className="text-[11px] text-navy-400">{r.metric} · {r.period}</div>
                {r.notes && <div className="text-xs text-navy-500 mt-0.5">{r.notes}</div>}
              </div>
              {r.score > 0 && <span className="font-bold text-gold-600 text-sm shrink-0">+{r.score}</span>}
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
        <label className="label">O'qituvchi</label>
        <input className="input !py-2.5 mb-4" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Ko'rsatkich</label>
            <select className="input !py-2.5" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Davr</label>
            <input className="input !py-2.5" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Masalan: 2026" />
          </div>
        </div>
        <label className="label">Izoh</label>
        <textarea className="input !py-2.5" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Modal>
    </div>
  );
}
