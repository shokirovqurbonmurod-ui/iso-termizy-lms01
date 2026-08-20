import { useEffect, useMemo, useState } from 'react';
import { Video, Plus, Play, ArrowLeft, Pencil, Trash2, Clock, Eye, ExternalLink, Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SUBJECTS = ['Ingliz tili', 'IELTS', 'Koreys tili', 'Rus tili', 'Matematika', 'Tarix', 'Huquq', 'IT'];
const emptyForm = { title: '', subject: SUBJECTS[0], teacher: '', duration_min: 10, url: '', url_name: '' };

// YouTube havolalarining barcha ko'rinishlarini (watch?v=, youtu.be/, shorts/, embed/) embed havolaga aylantiradi.
function youtubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/watch\?v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

const isDirectVideo = (url) => /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url || '') || /^\/uploads\//.test(url || '');

export default function VideoLessonsPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [videos, setVideos] = useState(null);
  const [views, setViews] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [watching, setWatching] = useState(null);

  async function load() {
    const [v, vw] = await Promise.all([
      api.get('/video_lessons?limit=500').catch(() => []),
      api.get('/video_views?limit=2000').catch(() => []),
    ]);
    setVideos(v || []); setViews(vw || []);
  }
  useEffect(() => { load(); }, []);

  function viewsFor(id) { return views.filter((v) => String(v.video_id) === String(id)); }

  function openAdd() { setEditing(null); setForm(emptyForm); setModal(true); }
  function openEdit(v) { setEditing(v); setForm({ title: v.title, subject: v.subject || SUBJECTS[0], teacher: v.teacher || '', duration_min: v.duration_min || 10, url: v.url || '', url_name: '' }); setModal(true); }

  async function save() {
    if (!form.title.trim() || !form.url.trim()) { alert("Nomi va video havolani kiriting"); return; }
    setSaving(true);
    try {
      const payload = { ...form, duration_min: Number(form.duration_min) || 0 };
      if (editing) await api.put(`/video_lessons/${editing.id}`, payload);
      else await api.post('/video_lessons', payload);
      // Eski yuklangan fayl boshqasiga almashtirilgan bo'lsa, serverda "yetim" bo'lib qolmasin.
      if (editing && editing.url && editing.url.startsWith('/uploads/') && editing.url !== form.url) {
        api.del(editing.url).catch(() => {});
      }
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload(file);
      setForm((f) => ({ ...f, url: res.url, url_name: res.name }));
    } catch (e2) { alert(e2.message); }
    setUploading(false);
  }

  async function remove(v) {
    if (!confirm("Video o'chirilsinmi?")) return;
    await api.del(`/video_lessons/${v.id}`).catch(() => {});
    if (v.url && v.url.startsWith('/uploads/')) api.del(v.url).catch(() => {});
    await load();
  }

  async function openWatch(v) {
    setWatching(v);
    try {
      await api.post('/video_views', {
        video_id: v.id, video_title: v.title, student: user.full_name,
        date: new Date().toISOString().slice(0, 10),
      });
      const vw = await api.get('/video_views?limit=2000').catch(() => []);
      setViews(vw || []);
    } catch { /* ko'rish yozilmasa ham video ochilaveradi */ }
  }

  function exitWatch() { setWatching(null); }

  const embed = useMemo(() => watching ? youtubeEmbedUrl(watching.url) : null, [watching]);

  if (videos === null) return <Spinner />;

  // ── Ekran: videoni tomosha qilish ──
  if (watching) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={exitWatch} className="btn-ghost !py-1.5 !px-3 text-xs mb-4"><ArrowLeft size={13} /> Orqaga</button>
        <div className="card overflow-hidden !p-0 mb-4">
          <div className="aspect-video bg-navy-900">
            {embed ? (
              <iframe key={embed} src={embed} title={watching.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : isDirectVideo(watching.url) ? (
              <video key={watching.url} src={api.fileUrl(watching.url)} controls autoPlay className="w-full h-full" />
            ) : (
              <div className="w-full h-full grid place-items-center text-center px-6">
                <div>
                  <p className="text-navy-200 text-sm mb-3">Bu havolani ichkarida ko'rsatib bo'lmadi.</p>
                  <a href={api.fileUrl(watching.url)} target="_blank" rel="noreferrer" className="btn-gold !py-1.5 !px-4 text-xs"><ExternalLink size={13} /> Havolani ochish</a>
                </div>
              </div>
            )}
          </div>
        </div>
        <h2 className="font-display text-xl text-navy-800 mb-1">{watching.title}</h2>
        <div className="flex items-center gap-4 text-xs text-navy-400">
          <span className="chip text-[9px] bg-gold/10 text-gold-700">{watching.subject}</span>
          {watching.teacher && <span>{watching.teacher}</span>}
          <span className="flex items-center gap-1"><Clock size={11} /> {watching.duration_min} daq</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {viewsFor(watching.id).length} marta ko'rilgan</span>
        </div>
      </div>
    );
  }

  // ── Ekran: videolar ro'yxati ──
  return (
    <div>
      <PageHeader icon={Video} title="Video darslar" subtitle="Darslarni istalgan vaqtda qayta tomosha qiling"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi video</button>} />

      {videos.length === 0 ? <Empty icon={Video} title="Hali video qo'shilmagan" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="chip text-[9px] bg-gold/10 text-gold-700">{v.subject}</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-navy-500"><Eye size={11} /> {viewsFor(v.id).length}</span>
              </div>
              <div className="text-sm font-bold text-navy-800 mb-0.5">{v.title}</div>
              <div className="text-xs text-navy-400 mb-3">{v.teacher}</div>
              <div className="flex items-center gap-1 text-[11px] text-navy-400 mb-3">
                <Clock size={11} /> {v.duration_min} daqiqa
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <>
                    <button onClick={() => openEdit(v)} className="btn-ghost !py-1.5 !px-2.5 text-xs"><Pencil size={13} /></button>
                    <button onClick={() => remove(v)} className="btn-ghost !py-1.5 !px-2.5 text-xs text-red-500 hover:!bg-red-50"><Trash2 size={13} /></button>
                  </>
                )}
                <button onClick={() => openWatch(v)} className="btn-gold flex-1 !py-1.5 text-xs"><Play size={12} /> Ko'rish</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title={editing ? 'Videoni tahrirlash' : 'Yangi video'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Saqlash"}</button>
        </>}
      >
        <label className="label">Dars nomi</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Fan</label>
            <select className="input !py-2.5" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">O'qituvchi</label>
            <input className="input !py-2.5" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Davomiyligi (daqiqa)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
          </div>
        </div>
        <label className="label">Video havola (YouTube yoki to'g'ridan-to'g'ri video URL)</label>
        <input className="input !py-2.5 mb-4" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value, url_name: '' })} />

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-navy-100" />
          <span className="text-[11px] font-semibold text-navy-300 uppercase tracking-wide">yoki</span>
          <div className="flex-1 h-px bg-navy-100" />
        </div>

        <input type="file" accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="hidden" id="video-upload" onChange={handleFileUpload} />
        <label htmlFor="video-upload"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 py-8 px-4 text-center cursor-pointer hover:border-gold/60 hover:bg-gold/5 transition">
          <Upload size={22} className="text-navy-300" />
          <div className="text-sm font-bold text-navy-700">
            {uploading ? 'Yuklanmoqda...' : form.url_name ? `${form.url_name} yuklandi ✓` : 'Video yuklash'}
          </div>
          {!uploading && !form.url_name && <div className="text-[11px] text-navy-400">MP4, WEBM, MOV, AVI — max 500MB</div>}
        </label>
      </Modal>
    </div>
  );
}
