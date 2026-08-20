import { useEffect, useState } from 'react';
import { Trophy, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { student: '', title: '', story: '', achievement: '', date: new Date().toISOString().slice(0, 10) };

export default function SuccessStoriesPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/success_stories?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.student.trim()) return;
    setSaving(true);
    try { await api.post('/success_stories', form); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Trophy} title="Muvaffaqiyat tarixi" subtitle="O'quvchilarning ilhomlantiruvchi hikoyalari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Hikoya qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={Trophy} title="Hikoya yo'q" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0"><Trophy size={14} /></div>
                <div>
                  <div className="text-sm font-bold text-navy-800">{r.student}</div>
                  <div className="text-[10px] text-navy-400">{r.date}</div>
                </div>
              </div>
              {r.title && <div className="text-sm font-semibold text-navy-700 mb-1">{r.title}</div>}
              {r.story && <p className="text-xs text-navy-500 leading-relaxed mb-2">{r.story}</p>}
              {r.achievement && <span className="text-[10px] font-bold text-gold-600 bg-gold/10 rounded-full px-2.5 py-1">🏆 {r.achievement}</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Hikoya qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">O'quvchi</label>
        <input className="input !py-2.5 mb-4" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} />
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Hikoya</label>
        <textarea className="input !py-2.5 mb-4" rows={3} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
        <label className="label">Yutuq</label>
        <input className="input !py-2.5" value={form.achievement} onChange={(e) => setForm({ ...form, achievement: e.target.value })} placeholder="Masalan: IELTS 8.0" />
      </Modal>
    </div>
  );
}
