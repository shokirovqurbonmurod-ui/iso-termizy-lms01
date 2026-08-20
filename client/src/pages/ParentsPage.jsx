import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users2, Plus, Search, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const RELATIONS = ['Ota', 'Ona', 'Vasiy'];
const empty = { name: '', child: '', phone: '', relation: 'Ota', status: 'active' };

export default function ParentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  async function load() {
    const [r, s] = await Promise.all([api.get('/parents?limit=500').catch(() => []), api.get('/students').catch(() => [])]);
    setRows(r || []); setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (rows || []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || (r.child || '').toLowerCase().includes(q.toLowerCase())), [rows, q]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.post('/parents', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  function goChild(name) {
    const s = students.find((s) => s.full_name === name);
    if (s) navigate(`/app/students/${s.id}`);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users2} title="Ota-onalar" subtitle={`${rows.length} ta ro'yxatdagi ota-ona`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Ota-ona qo'shish</button>} />

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={Users2} title="Ota-ona topilmadi" /> : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{r.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.name} <span className="text-[10px] font-bold text-navy-400 bg-navy-100 rounded-full px-1.5 py-0.5 ml-1">{r.relation}</span></div>
                <div className="text-[11px] text-navy-400 flex items-center gap-2">
                  {r.child && <button onClick={() => goChild(r.child)} className="hover:text-gold-600 transition">👤 {r.child}</button>}
                  {r.phone && <span className="flex items-center gap-1"><Phone size={10} /> {r.phone}</span>}
                </div>
              </div>
              <span className={`chip text-[10px] shrink-0 ${statusStyle(r.status)}`}>{r.status === 'active' ? 'faol' : 'nofaol'}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Ota-ona qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Ism familiya</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Farzandi</label>
        <input className="input !py-2.5 mb-4" list="students-list-p" value={form.child} onChange={(e) => setForm({ ...form, child: e.target.value })} />
        <datalist id="students-list-p">{students.map((s) => <option key={s.id} value={s.full_name} />)}</datalist>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefon</label>
            <input className="input !py-2.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Kim</label>
            <select className="input !py-2.5" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
