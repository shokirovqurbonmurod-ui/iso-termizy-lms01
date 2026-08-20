import { useEffect, useState } from 'react';
import { BriefcaseBusiness, UserPlus, Key, Copy, Check, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { ROLES, roleColor, roleLabel } from '../config/roles.js';
import { useAuth } from '../auth/AuthContext.jsx';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function Staff() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editModal, setEditModal] = useState(null); // {id, name}
  const [resetModal, setResetModal] = useState(null); // {id, name}
  const [form, setForm] = useState({ full_name: '', phone: '', role: 'teacher', group_name: '', password: '' });
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const isAdmin = ['director', 'super_admin', 'admin'].includes(user.role);

  function load() { api.get('/staff').then(setRows).catch(() => setRows([])); }
  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm({ full_name: '', phone: '', role: 'teacher', group_name: '', password: generatePassword() });
    setErr(''); setSuccess(''); setShowAdd(true);
  }

  async function saveStaff() {
    setErr('');
    if (!form.full_name.trim()) { setErr('Ism familiya kiriting'); return; }
    if (!form.phone.trim()) { setErr('Telefon kiriting'); return; }
    if (!form.password || form.password.length < 4) { setErr('Parol kamida 4 belgi bo\'lsin'); return; }
    try {
      const res = await api.post('/users', form);
      setSuccess(`✅ Yangi xodim tayyor!\n\n📞 Telefon: ${res.phone}\n🔑 Parol: ${form.password}\n👤 Rol: ${roleLabel(res.role)}\n\n⚠️ Bu parolni yozib oling — keyinchalik ko'rsatilmaydi!`);
      load();
    } catch (e) { setErr(e.message); }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(form.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEdit(u) {
    setForm({ id: u.id, full_name: u.full_name, phone: u.phone, role: u.role, group_name: u.group_name || '' });
    setErr(''); setEditModal({ id: u.id, name: u.full_name });
  }

  async function saveEdit() {
    setErr('');
    if (!form.full_name?.trim() || !form.phone?.trim()) { setErr('Ism va telefon majburiy'); return; }
    try {
      await api.put(`/users/${Number(form.id)}`, form);
      setEditModal(null); load();
    } catch (e) { setErr(e.message); }
  }

  function openReset(u) {
    setPw(generatePassword()); setErr(''); setResetMsg(''); setResetModal({ id: u.id, name: u.full_name });
  }

  async function saveReset() {
    setErr('');
    if (!pw || pw.length < 4) { setErr('Parol kamida 4 belgi bo\'lsin'); return; }
    try {
      await api.put(`/users/${Number(resetModal.id)}/password`, { password: pw });
      setResetMsg(`✅ ${resetModal.name} uchun yangi parol:\n🔑 ${pw}`);
    } catch (e) { setErr(e.message); }
  }

  async function remove(u) {
    if (!confirm(`"${u.full_name}"ni o'chirmoqchimisiz?`)) return;
    try { await api.del(`/users/${u.id}`); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <PageHeader icon={BriefcaseBusiness} title="Xodimlar · HR" subtitle={`Markaz jamoasi: ${rows ? rows.length : '...'} xodim`}
        actions={isAdmin && (
          <button className="btn-gold" onClick={openAdd}><UserPlus size={16} /> Xodim qo'shish</button>
        )}
      />

      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <Empty icon={BriefcaseBusiness} title="Xodimlar yo'q" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">#</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Xodim</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Telefon</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Lavozim</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Guruh / bo'lim</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Holat</th>
                {isAdmin && <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Amallar</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr key={u.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition animate-fade" style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-4 py-3.5 text-navy-300 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shadow-sm">{u.full_name[0]}</div>
                      <span className="font-semibold text-navy-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-navy-500 tabular-nums">{u.phone}</td>
                  <td className="px-4 py-3.5"><span className={`chip ${roleColor(u.role)} shadow-sm`}>{u.role_label}</span></td>
                  <td className="px-4 py-3.5 text-navy-500">{u.group_name || '—'}</td>
                  <td className="px-4 py-3.5">
                    {u.active ? <span className="chip bg-emerald-100 text-emerald-700 shadow-sm">Faol</span> : <span className="chip bg-slate-200 text-slate-600">Nofaol</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => openEdit(u)} className="chip bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-semibold">Tahrirlash</button>
                        <button onClick={() => openReset(u)} className="chip bg-navy-100 text-navy-600 hover:bg-navy-200 transition font-semibold">Parol tiklash</button>
                        <button onClick={() => remove(u)} className="chip bg-red-50 text-red-500 hover:bg-red-100 transition font-semibold">O'chirish</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add staff modal */}
      <Modal open={showAdd} title={success ? "Xodim tayyor" : "Yangi xodim qo'shish"} onClose={() => { setShowAdd(false); setSuccess(''); }}
        footer={!success && <>
          <button className="btn-ghost" onClick={() => setShowAdd(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveStaff}>Saqlash</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}

        {success ? (
          <div className="text-center animate-fade">
            <div className="text-4xl mb-3">✅</div>
            <pre className="text-left text-sm bg-navy-50 rounded-xl p-4 whitespace-pre-wrap font-mono">{success}</pre>
            <button className="btn-gold mt-4" onClick={() => { setShowAdd(false); setSuccess(''); }}>Tushundim</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Ism familiya <span className="text-red-400">*</span></label>
              <input className="input !py-2.5" placeholder="Ism familiya..." value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Telefon <span className="text-red-400">*</span></label>
              <input className="input !py-2.5" placeholder="+998..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Lavozim</label>
              <select className="input !py-2.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.filter((r) => !['student', 'parent'].includes(r)).map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Guruh / bo'lim</label>
              <input className="input !py-2.5" placeholder="Masalan: IELTS, IT..." value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-2">
                <Key size={12} className="text-gold" /> Parol (avtomatik yaratildi)
              </label>
              <div className="flex gap-2">
                <input className="input !py-2.5 font-mono tracking-wider text-lg" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button onClick={() => setForm({ ...form, password: generatePassword() })} className="btn-ghost shrink-0" title="Yangi parol">🔄</button>
                <button onClick={copyPassword} className="btn-ghost shrink-0" title="Nusxalash">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-navy-400 mt-1.5">Xodimga bu parolni bering. Keyinchalik o'zgartirish mumkin.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit staff modal */}
      <Modal open={!!editModal} title={`Xodimni tahrirlash: ${editModal?.name || ''}`} onClose={() => setEditModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setEditModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveEdit}>Saqlash</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ism familiya <span className="text-red-400">*</span></label>
            <input className="input !py-2.5" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Telefon <span className="text-red-400">*</span></label>
            <input className="input !py-2.5" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Lavozim</label>
            <select className="input !py-2.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.filter((r) => !['student', 'parent'].includes(r)).map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Guruh / bo'lim</label>
            <input className="input !py-2.5" value={form.group_name || ''} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetModal} title={`Parolni tiklash: ${resetModal?.name || ''}`} onClose={() => setResetModal(null)}
        footer={!resetMsg && <>
          <button className="btn-ghost" onClick={() => setResetModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveReset}>Saqlash</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        {resetMsg ? (
          <div className="text-center">
            <pre className="text-left text-sm bg-navy-50 rounded-xl p-4 whitespace-pre-wrap font-mono">{resetMsg}</pre>
            <p className="text-xs text-navy-400 mt-3">⚠️ Parolni yozib oling — qayta ko'rsatilmaydi</p>
            <button className="btn-gold mt-4" onClick={() => setResetModal(null)}>Tushundim</button>
          </div>
        ) : (
          <div>
            <label className="label flex items-center gap-1.5"><Key size={12} className="text-gold" /> Yangi parol</label>
            <div className="flex gap-2">
              <input className="input !py-2.5 font-mono tracking-wider text-lg" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button onClick={() => setPw(generatePassword())} className="btn-ghost shrink-0" title="Yangi parol"><RefreshCw size={16} /></button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
