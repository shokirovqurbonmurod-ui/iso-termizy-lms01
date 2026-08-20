import { useEffect, useState } from 'react';
import { BookOpen, Plus, Download } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const TYPES = ['Qo\'llanma', 'Mezon', 'Shablon', 'Video'];
const empty = { title: '', subject: '', type: "Qo'llanma", author: '', file_url: '' };

export default function MethodologyLibPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  async function load() { setRows(await api.get('/methodology_lib?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setFile(null); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let file_url = form.file_url;
      if (file) { const up = await api.upload(file); file_url = up.url; }
      await api.post('/methodology_lib', { ...form, file_url });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BookOpen} title="Metodika kutubxonasi" subtitle="O'qitish standartlari va metodik materiallar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Material qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={BookOpen} title="Material yo'q" /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2 py-0.5 inline-block mb-1.5">{r.type}</div>
              <div className="text-sm font-bold text-navy-800">{r.title}</div>
              <div className="text-[11px] text-navy-400 mt-0.5">{r.subject} {r.author && `· ${r.author}`}</div>
              {r.file_url && <a href={api.fileUrl(r.file_url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-navy-600 hover:text-gold-600 mt-2 transition"><Download size={11} /> Yuklab olish</a>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Material qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Fan</label>
            <input className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Turi</label>
            <select className="input !py-2.5" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <label className="label">Muallif</label>
        <input className="input !py-2.5 mb-4" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        <label className="label">Fayl</label>
        <input className="input !py-2.5" type="file" onChange={(e) => setFile(e.target.files[0])} />
      </Modal>
    </div>
  );
}
