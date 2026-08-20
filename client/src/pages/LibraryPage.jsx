import { useEffect, useMemo, useState } from 'react';
import { Library, Plus, Search, BookOpen, Download } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

export default function LibraryPage() {
  const [books, setBooks] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', lang: '', qty: 1, shelf: '', file: null });
  const [saving, setSaving] = useState(false);

  async function load() { setBooks(await api.get('/books?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (books || [])
    .filter((b) => b.status !== 'archived')
    .filter((b) => !q.trim() || b.title.toLowerCase().includes(q.toLowerCase()) || (b.author || '').toLowerCase().includes(q.toLowerCase())), [books, q]);

  function openAdd() {
    setForm({ title: '', author: '', lang: '', qty: 1, shelf: '', file: null });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let file_url = null;
      if (form.file) { const up = await api.upload(form.file); file_url = up.url; }
      await api.post('/books', { ...form, qty: Number(form.qty) || 1, file_url, status: 'active' });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (books === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Library} title="Kutubxona" subtitle="Darsliklar va kitoblar katalogi"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Kitob qo'shish</button>} />

      <div className="relative max-w-xs mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-9 !py-2 text-sm" placeholder="Kitob yoki muallif qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? <Empty icon={Library} title="Kitob topilmadi" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-gold/10 text-gold-600 shrink-0"><BookOpen size={16} /></div>
                <span className="chip text-[9px] bg-navy-100 text-navy-500">{b.lang || '—'}</span>
              </div>
              <div className="text-sm font-bold text-navy-800">{b.title}</div>
              <div className="text-xs text-navy-400 mb-2">{b.author}</div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-navy-400">{b.qty} nusxa · {b.shelf}</span>
                {b.file_url && <a href={api.fileUrl(b.file_url)} target="_blank" rel="noreferrer" className="text-gold-600 hover:text-gold-700"><Download size={14} /></a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi kitob" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Kitob nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Muallif</label>
            <input className="input !py-2.5" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <label className="label">Fan / Til</label>
            <input className="input !py-2.5" value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value })} />
          </div>
          <div>
            <label className="label">Nusxalar soni</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </div>
          <div>
            <label className="label">Javon</label>
            <input className="input !py-2.5" value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
          </div>
        </div>
        <label className="label">Fayl (ixtiyoriy)</label>
        <input type="file" className="input !py-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
      </Modal>
    </div>
  );
}
