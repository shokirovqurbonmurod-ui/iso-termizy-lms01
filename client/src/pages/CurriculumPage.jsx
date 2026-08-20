import { useEffect, useMemo, useState } from 'react';
import { ListTree, Plus, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

export default function CurriculumPage() {
  const [rows, setRows] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ subject: '', level: '', topics: '', hours: 0 });
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/curriculum?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const levels = useMemo(() => [...new Set((rows || []).map((r) => r.level).filter(Boolean))], [rows]);
  const filtered = useMemo(() => levelFilter ? (rows || []).filter((r) => r.level === levelFilter) : (rows || []), [rows, levelFilter]);

  function openAdd() {
    setForm({ subject: '', level: '', topics: '', hours: 0 });
    setModal(true);
  }

  async function save() {
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      await api.post('/curriculum', { ...form, hours: Number(form.hours) || 0, status: 'active' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ListTree} title="O'quv reja" subtitle="Fanlar bo'yicha mavzular va soatlar taqsimoti"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi reja</button>} />

      {levels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setLevelFilter('')} className={`chip text-xs ${!levelFilter ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700'}`}>Barchasi</button>
          {levels.map((l) => (
            <button key={l} onClick={() => setLevelFilter(l)} className={`chip text-xs ${levelFilter === l ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>{l}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? <Empty icon={ListTree} title="O'quv reja topilmadi" /> : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-bold text-navy-800">{r.subject}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.level && <span className="chip text-[10px] bg-gold/10 text-gold-700">{r.level}</span>}
                  <span className="flex items-center gap-1 text-[11px] text-navy-400"><Clock size={11} /> {r.hours} soat</span>
                </div>
              </div>
              {r.topics && <p className="text-sm text-navy-500 whitespace-pre-line">{r.topics}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi o'quv reja" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Fan</label>
        <input className="input !py-2.5 mb-4" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Daraja</label>
            <input className="input !py-2.5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
          <div>
            <label className="label">Umumiy soat</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </div>
        </div>
        <label className="label">Mavzular / modullar</label>
        <textarea className="input !py-2.5" rows={4} value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
      </Modal>
    </div>
  );
}
