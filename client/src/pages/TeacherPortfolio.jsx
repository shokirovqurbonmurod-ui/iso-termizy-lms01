import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, Trash2, ExternalLink, Award, Star, Coins } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TYPES = ['Sertifikat', 'Maqola', 'Loyiha', 'Kurs', 'Boshqa'];
const TYPE_ICON = { Sertifikat: '🏅', Maqola: '📝', Loyiha: '🚀', Kurs: '🎓', Boshqa: '📌' };

export default function TeacherPortfolio() {
  const { user } = useAuth();
  const isTeacher = user.role === 'teacher' || user.role === 'senior_teacher';
  const [teachers, setTeachers] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: 'Sertifikat', title: '', description: '', url: '', file: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/teachers').then((t) => {
      setTeachers(t || []);
      setTeacherName(isTeacher ? user.full_name : (t?.[0]?.full_name || ''));
    }).catch(() => setTeachers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems() {
    if (!teacherName) return;
    const rows = await api.get(`/teacher_portfolio?q=${encodeURIComponent(teacherName)}`).catch(() => []);
    setItems((rows || []).filter((r) => r.teacher === teacherName).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { loadItems(); }, [teacherName]); // eslint-disable-line react-hooks/exhaustive-deps

  const teacherInfo = useMemo(() => teachers.find((t) => t.full_name === teacherName), [teachers, teacherName]);
  const byType = useMemo(() => {
    const m = {};
    for (const t of TYPES) m[t] = (items || []).filter((i) => i.type === t);
    return m;
  }, [items]);

  function openAdd() {
    setForm({ type: 'Sertifikat', title: '', description: '', url: '', file: null });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let url = form.url;
      if (form.file) { const up = await api.upload(form.file); url = up.url; }
      await api.post('/teacher_portfolio', {
        teacher: teacherName, type: form.type, title: form.title.trim(), description: form.description, url,
        date: new Date().toISOString().slice(0, 10),
      });
      setModal(false); await loadItems();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function removeItem(id) {
    if (!confirm("O'chirilsinmi?")) return;
    await api.del(`/teacher_portfolio/${id}`).catch(() => {});
    await loadItems();
  }

  const canEdit = isTeacher ? teacherName === user.full_name : true;

  return (
    <div>
      <PageHeader icon={Briefcase} title="O'qituvchi portfolio" subtitle="Sertifikatlar, maqolalar, loyihalar va yutuqlar to'plami"
        actions={canEdit && teacherName && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi yozuv</button>} />

      {!isTeacher && (
        <div className="mb-5">
          <select className="input !py-2.5 !w-auto" value={teacherName} onChange={(e) => setTeacherName(e.target.value)}>
            {teachers.map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
          </select>
        </div>
      )}

      {teacherInfo && (
        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xl font-bold shadow shrink-0">{teacherName[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg text-navy-800">{teacherName}</div>
            <div className="text-xs text-navy-400">{teacherInfo.langs || ''} · {teacherInfo.level || ''}</div>
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <div className="flex items-center gap-1 justify-center text-amber-500 font-bold"><Star size={13} /> {teacherInfo.rating || '—'}</div>
              <div className="text-[10px] text-navy-400">Reyting</div>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-center text-gold-600 font-bold"><Coins size={13} /> {teacherInfo.coins || 0}</div>
              <div className="text-[10px] text-navy-400">Coin</div>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-center text-navy-600 font-bold"><Award size={13} /> {items?.length || 0}</div>
              <div className="text-[10px] text-navy-400">Yutuqlar</div>
            </div>
          </div>
        </div>
      )}

      {items === null ? <Spinner /> : items.length === 0 ? (
        <Empty icon={Briefcase} title="Portfolio bo'sh" hint="Yangi yozuv qo'shib boshlang" />
      ) : (
        <div className="space-y-6">
          {TYPES.filter((t) => byType[t].length > 0).map((t) => (
            <div key={t}>
              <h3 className="font-display text-lg text-navy-800 mb-3">{TYPE_ICON[t]} {t}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byType[t].map((item) => (
                  <div key={item.id} className="card p-4 group relative">
                    <button onClick={() => removeItem(item.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
                    <div className="text-sm font-bold text-navy-800 mb-1 pr-4">{item.title}</div>
                    {item.description && <div className="text-xs text-navy-500 mb-2">{item.description}</div>}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">{item.date}</span>
                      {item.url && <a href={api.fileUrl(item.url)} target="_blank" rel="noreferrer" className="text-[11px] text-gold-600 hover:underline flex items-center gap-1"><ExternalLink size={11} /> Ko'rish</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Yangi portfolio yozuvi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label mb-2">Turi</label>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
              className={`rounded-xl border px-1 py-2 text-[10px] font-semibold transition ${form.type === t ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
              {TYPE_ICON[t]}<br />{t}
            </button>
          ))}
        </div>
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="label">Havola yoki fayl</label>
        <input className="input !py-2.5 mb-2" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input type="file" className="input !py-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
      </Modal>
    </div>
  );
}
