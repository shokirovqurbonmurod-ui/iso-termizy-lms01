import { useEffect, useMemo, useState } from 'react';
import { Library, Plus, Download, Search, FileText, Video, FileAudio, FileImage } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TYPE_ICON = { Slayd: FileImage, Video: Video, PDF: FileText, Mashq: FileText, Shablon: FileText, Audio: FileAudio };
const TYPES = ['Slayd', 'Video', 'PDF', 'Mashq', 'Shablon', 'Audio'];

export default function LessonLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', level: '', type: 'Slayd', file: null });
  const [saving, setSaving] = useState(false);

  async function load() { setItems(await api.get('/lesson_library?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (items || [])
    .filter((i) => i.status !== 'archived')
    .filter((i) => !typeFilter || i.type === typeFilter)
    .filter((i) => !q.trim() || i.title.toLowerCase().includes(q.toLowerCase()) || (i.subject || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.id || 0) - (a.id || 0)), [items, q, typeFilter]);

  function openAdd() {
    setForm({ title: '', subject: '', level: '', type: 'Slayd', file: null });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim() || !form.file) { alert('Nomi va fayl kerak'); return; }
    setSaving(true);
    try {
      const up = await api.upload(form.file);
      await api.post('/lesson_library', {
        title: form.title.trim(), subject: form.subject, level: form.level, type: form.type,
        author: user.full_name, file_url: up.url, downloads: 0, status: 'active',
      });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function downloadItem(item) {
    await api.put(`/lesson_library/${item.id}`, { downloads: (Number(item.downloads) || 0) + 1 }).catch(() => {});
    window.open(api.fileUrl(item.file_url), '_blank');
    load();
  }

  if (items === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Library} title="Dars kutubxonasi" subtitle="O'qituvchilar tomonidan ulashilgan materiallar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Material qo'shish</button>} />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9 !py-2 text-sm" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setTypeFilter('')} className={`chip text-xs ${!typeFilter ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700'}`}>Barchasi</button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`chip text-xs ${typeFilter === t ? 'bg-gold-500 text-white' : 'bg-gold/10 text-gold-700 hover:bg-gold/20'}`}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty icon={Library} title="Material topilmadi" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.type] || FileText;
            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="grid place-items-center w-9 h-9 rounded-xl bg-gold/10 text-gold-600 shrink-0"><Icon size={16} /></div>
                  <span className="chip text-[9px] bg-navy-100 text-navy-500">{item.level || '—'}</span>
                </div>
                <div className="text-sm font-bold text-navy-800 mb-0.5">{item.title}</div>
                <div className="text-xs text-navy-400 mb-3">{item.subject || 'Umumiy'} · {item.author}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-navy-400">{item.downloads || 0} marta yuklandi</span>
                  <button onClick={() => downloadItem(item)} className="btn-ghost !py-1.5 !px-3 text-xs"><Download size={12} /> Yuklash</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi material" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Yuklanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Fan</label>
            <input className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Daraja</label>
            <input className="input !py-2.5" placeholder="A1, B2..." value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
        </div>
        <label className="label mb-2">Turi</label>
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${form.type === t ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {t}
            </button>
          ))}
        </div>
        <label className="label">Fayl</label>
        <input type="file" className="input !py-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
      </Modal>
    </div>
  );
}
