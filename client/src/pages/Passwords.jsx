import { useEffect, useState } from 'react';
import { KeyRound, UserPlus, Copy, Check, RefreshCw, Power, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { ROLES, roleColor, roleLabel } from '../config/roles.js';

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function Passwords() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // 'add' | {id, name}
  const [form, setForm] = useState({});
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() { setRows(await api.get('/users').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const filtered = (rows || []).filter((u) =>
    !q.trim() || `${u.full_name} ${u.phone} ${u.role_label}`.toLowerCase().includes(q.toLowerCase()));

  function openAdd() {
    setForm({ full_name: '', phone: '', role: 'teacher', group_name: '' });
    setPw(genPassword()); setErr(''); setMsg(''); setModal('add');
  }
  function openReset(u) {
    setPw(genPassword()); setErr(''); setMsg(''); setModal({ id: u.id, name: u.full_name });
  }
  function openEdit(u) {
    setForm({ id: u.id, full_name: u.full_name, phone: u.phone, role: u.role, group_name: u.group_name || '' });
    setErr(''); setMsg(''); setModal('edit');
  }

  async function saveNew() {
    setErr('');
    if (!form.full_name?.trim() || !form.phone?.trim()) { setErr('Ism va telefon majburiy'); return; }
    try {
      const res = await api.post('/users', { ...form, password: pw });
      setMsg(`✅ ${res.full_name} qo'shildi\n📞 ${res.phone}\n🔑 Parol: ${pw}`);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function saveReset() {
    setErr('');
    if (!pw || pw.length < 4) { setErr('Parol kamida 4 belgi bo\'lsin'); return; }
    try {
      await api.put(`/users/${Number(modal.id)}/password`, { password: pw });
      setMsg(`✅ ${modal.name} uchun yangi parol:\n🔑 ${pw}`);
    } catch (e) { setErr(e.message); }
  }

  async function saveEdit() {
    setErr('');
    if (!form.full_name?.trim() || !form.phone?.trim()) { setErr('Ism va telefon majburiy'); return; }
    try {
      await api.put(`/users/${Number(form.id)}`, form);
      setModal(null); load();
    } catch (e) { setErr(e.message); }
  }

  async function toggle(u) {
    try { await api.put(`/users/${u.id}/toggle`, {}); load(); }
    catch (e) { alert(e.message); }
  }

  async function remove(u) {
    if (!confirm(`"${u.full_name}"ni o'chirmoqchimisiz?`)) return;
    try { await api.del(`/users/${u.id}`); load(); }
    catch (e) { alert(e.message); }
  }

  function copyPw() {
    navigator.clipboard?.writeText(pw);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={KeyRound} title="Parollar" subtitle={`Foydalanuvchilar: ${rows.length} ta · parol boshqaruvi`}
        actions={<button className="btn-gold" onClick={openAdd}><UserPlus size={16} /> Yangi foydalanuvchi</button>} />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100">
          <input className="input !py-2 max-w-sm text-sm" placeholder="Qidirish (ism, telefon, rol)..."
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">#</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Foydalanuvchi</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Telefon (login)</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider">Holat</th>
                <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                  <td className="px-4 py-3 text-navy-300 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[11px] font-bold">{u.full_name[0]}</div>
                      <span className="font-semibold text-navy-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy-500 font-mono text-xs">{u.phone}</td>
                  <td className="px-4 py-3"><span className={`chip ${roleColor(u.role)}`}>{u.role_label}</span></td>
                  <td className="px-4 py-3">
                    {u.active
                      ? <span className="chip bg-emerald-100 text-emerald-700">Faol</span>
                      : <span className="chip bg-slate-200 text-slate-600">Bloklangan</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={14} /></button>
                      <button onClick={() => openReset(u)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-gold/10 text-navy-400 hover:text-gold-600 transition" title="Parolni almashtirish"><RefreshCw size={14} /></button>
                      <button onClick={() => toggle(u)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-amber-50 text-navy-400 hover:text-amber-500 transition" title="Faol/Bloklash"><Power size={14} /></button>
                      <button onClick={() => remove(u)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal === 'add' ? "Yangi foydalanuvchi" : modal === 'edit' ? "Foydalanuvchini tahrirlash" : `Parolni almashtirish: ${modal?.name || ''}`}
        onClose={() => setModal(null)}
        footer={!msg && <>
          <button className="btn-ghost" onClick={() => setModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={modal === 'add' ? saveNew : modal === 'edit' ? saveEdit : saveReset}>Saqlash</button>
        </>}>
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        {msg ? (
          <div className="text-center">
            <pre className="text-left text-sm bg-navy-50 rounded-xl p-4 whitespace-pre-wrap font-mono">{msg}</pre>
            <p className="text-xs text-navy-400 mt-3">⚠️ Parolni yozib oling — qayta ko'rsatilmaydi</p>
            <button className="btn-gold mt-4" onClick={() => { setModal(null); setMsg(''); }}>Tushundim</button>
          </div>
        ) : (modal === 'add' || modal === 'edit') ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Ism familiya <span className="text-red-400">*</span></label>
                <input className="input !py-2.5" placeholder="Ism familiya..." value={form.full_name || ''}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Telefon (login) <span className="text-red-400">*</span></label>
                <input className="input !py-2.5" placeholder="998901234567" value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Rol</label>
                <select className="input !py-2.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Guruh / bo'lim</label>
                <input className="input !py-2.5" placeholder="Masalan: IELTS" value={form.group_name || ''}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
              </div>
            </div>
            {modal === 'add' && (
              <div>
                <label className="label flex items-center gap-1.5"><KeyRound size={12} className="text-gold" /> Parol</label>
                <div className="flex gap-2">
                  <input className="input !py-2.5 font-mono tracking-wider text-lg" value={pw} onChange={(e) => setPw(e.target.value)} />
                  <button onClick={() => setPw(genPassword())} className="btn-ghost shrink-0" title="Yangi parol"><RefreshCw size={16} /></button>
                  <button onClick={copyPw} className="btn-ghost shrink-0" title="Nusxalash">
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="label flex items-center gap-1.5"><KeyRound size={12} className="text-gold" /> Parol</label>
            <div className="flex gap-2">
              <input className="input !py-2.5 font-mono tracking-wider text-lg" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button onClick={() => setPw(genPassword())} className="btn-ghost shrink-0" title="Yangi parol"><RefreshCw size={16} /></button>
              <button onClick={copyPw} className="btn-ghost shrink-0" title="Nusxalash">
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
