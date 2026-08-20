import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ArrowLeft, User, Users2, Wallet, MessageSquare, Coins, FileText,
  Award, Phone, MapPin, Calendar, Save, KeyRound, Copy, Check, TrendingUp, TrendingDown,
  Upload, Trash2, Plus, Printer, GraduationCap, X, CheckCircle2, Circle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner, Empty } from '../components/ui.jsx';
import { money } from '../lib/format.js';
import { printReceipt } from '../lib/receipt.js';

const TABS = [
  { key: 'umumiy', label: 'Umumiy', icon: User },
  { key: 'guruhlar', label: 'Guruhlar', icon: Users2 },
  { key: 'tolovlar', label: "To'lovlar", icon: Wallet },
  { key: 'tarix', label: 'Izohlar / Tarix', icon: FileText },
  { key: 'coin', label: 'Coin tarixi', icon: Coins },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'fayllar', label: 'Fayllar', icon: Upload },
  { key: 'onlinekurs', label: 'Onlayn kurs', icon: GraduationCap },
  { key: 'natijalar', label: 'Natijalar', icon: Award },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState('umumiy');
  const [notFound, setNotFound] = useState(false);

  async function load() {
    try {
      const s = await api.get(`/students/${id}`);
      setStudent(s);
    } catch {
      setNotFound(true);
    }
  }
  useEffect(() => { load(); setTab('umumiy'); }, [id]);

  if (notFound) {
    return <Empty icon={User} title="O'quvchi topilmadi" hint="Bu o'quvchi o'chirilgan yoki mavjud emas." />;
  }
  if (!student) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gold-600 font-semibold cursor-pointer hover:underline" onClick={() => navigate(-1)}>Talabalar</span>
          <ChevronRight size={14} className="text-navy-300" />
          <span className="text-navy-800 font-bold">{student.full_name}</span>
        </div>
        <button onClick={() => navigate(-1)} className="btn-ghost !py-1.5 !px-3 text-xs"><ArrowLeft size={14} /> Orqaga</button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <StudentSidebar student={student} onChanged={load} />

        <div className="card overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-navy-100 px-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${tab === t.key ? 'border-gold-500 text-gold-700' : 'border-transparent text-navy-400 hover:text-navy-600'}`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="p-5">
            {tab === 'umumiy' && <TabUmumiy student={student} onChanged={load} />}
            {tab === 'guruhlar' && <TabGuruhlar student={student} onChanged={load} />}
            {tab === 'tolovlar' && <TabTolovlar student={student} onChanged={load} />}
            {tab === 'tarix' && <TabTarix student={student} />}
            {tab === 'coin' && <TabCoin student={student} />}
            {tab === 'sms' && <TabSms student={student} />}
            {tab === 'fayllar' && <TabFayllar student={student} />}
            {tab === 'onlinekurs' && <TabOnlineKurs student={student} />}
            {tab === 'natijalar' && <TabNatijalar student={student} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentSidebar({ student, onChanged }) {
  const [account, setAccount] = useState(null);
  const [creating, setCreating] = useState(null); // 'student' | 'parent' | null
  const [revealed, setRevealed] = useState(null); // { phone, password, role }
  const [copied, setCopied] = useState(false);

  async function loadAccount() {
    try { setAccount(await api.get(`/student-account/${student.id}`)); } catch { setAccount(null); }
  }
  useEffect(() => { loadAccount(); }, [student.id]);

  async function createAccount(role) {
    setCreating(role);
    try {
      const r = await api.post(`/student-account/${student.id}/create`, { role });
      setRevealed(r);
      await loadAccount();
    } catch (e) { alert(e.message); }
    setCreating(null);
  }

  async function resetPassword(role) {
    if (!confirm("Parol tiklansinmi? Eski parol ishlamay qoladi.")) return;
    setCreating(role);
    try {
      const r = await api.post(`/student-account/${student.id}/reset`, { role });
      setRevealed(r);
    } catch (e) { alert(e.message); }
    setCreating(null);
  }

  function copyCreds() {
    navigator.clipboard?.writeText(`Login: ${revealed.phone}\nParol: ${revealed.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card p-5 h-fit">
      <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-white font-bold text-2xl mx-auto mb-3">
        {(student.full_name || '?')[0]}
      </div>
      <div className="text-center mb-4">
        <div className="font-display text-lg text-navy-800">{student.full_name}</div>
        <div className="text-xs text-navy-400">ID: {student.id} · {student.group_name || 'Guruhsiz'}</div>
        <span className={`chip text-[9px] mt-1.5 ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'}`}>{student.status || '—'}</span>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <InfoRow icon={Phone} label="Telefon" value={student.phone} />
        <InfoRow icon={Calendar} label="Tug'ilgan sana" value={student.birth_date} />
        <InfoRow icon={User} label="Ota-ona" value={student.parent_name} />
        <InfoRow icon={Phone} label="Ota-ona tel." value={student.parent_phone} />
        <InfoRow icon={MapPin} label="Manzil" value={student.address} />
        <InfoRow icon={MessageSquare} label="Telegram" value={student.telegram_username} />
      </div>

      <div className="rounded-xl bg-navy-50/60 p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600"><KeyRound size={13} /> Portal kirish</div>

        {account === null ? <Spinner label="" /> : (
          <>
            <div>
              <div className="text-[10px] text-navy-400 mb-1">O'quvchi hisobi</div>
              {account.student.exists ? (
                <>
                  <div className="text-xs text-navy-500 mb-1.5">Login: <b className="text-navy-800">{account.student.phone}</b></div>
                  <button onClick={() => resetPassword('student')} disabled={!!creating} className="btn-ghost w-full justify-center !py-1.5 text-xs">
                    {creating === 'student' ? '...' : 'Parolni tiklash'}
                  </button>
                </>
              ) : (
                <button onClick={() => createAccount('student')} disabled={!!creating} className="btn-gold w-full justify-center !py-1.5 text-xs">
                  {creating === 'student' ? 'Yaratilmoqda...' : 'Kirish yaratish'}
                </button>
              )}
            </div>
            <div>
              <div className="text-[10px] text-navy-400 mb-1">Ota-ona hisobi</div>
              {account.parent.exists ? (
                <>
                  <div className="text-xs text-navy-500 mb-1.5">Login: <b className="text-navy-800">{account.parent.phone}</b></div>
                  <button onClick={() => resetPassword('parent')} disabled={!!creating} className="btn-ghost w-full justify-center !py-1.5 text-xs">
                    {creating === 'parent' ? '...' : 'Parolni tiklash'}
                  </button>
                </>
              ) : (
                <button onClick={() => createAccount('parent')} disabled={!!creating} className="btn-gold w-full justify-center !py-1.5 text-xs">
                  {creating === 'parent' ? 'Yaratilmoqda...' : 'Kirish yaratish'}
                </button>
              )}
            </div>
          </>
        )}

        {revealed && (
          <div className="rounded-lg bg-gold/10 border border-gold/30 p-2.5 text-xs animate-fade">
            <p className="text-navy-500 mb-1">⚠️ Parol faqat bir marta ko'rsatiladi — nusxalab oling:</p>
            <div className="font-mono text-navy-800 mb-1.5">Login: {revealed.phone}<br />Parol: {revealed.password}</div>
            <button onClick={copyCreds} className="btn-ghost !py-1 !px-2 text-[10px] w-full justify-center">
              {copied ? <><Check size={11} /> Nusxalandi</> : <><Copy size={11} /> Nusxalash</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-navy-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-navy-400">{label}</div>
        <div className="text-navy-700 truncate">{value || '—'}</div>
      </div>
    </div>
  );
}

function TabUmumiy({ student, onChanged }) {
  const [form, setForm] = useState(() => ({
    full_name: student.full_name || '', phone: student.phone || '', birth_date: student.birth_date || '',
    parent_name: student.parent_name || '', parent_phone: student.parent_phone || '', address: student.address || '',
    telegram_username: student.telegram_username || '', jshshir: student.jshshir || '',
  }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api.put(`/students/${student.id}`, form);
      setMsg('✅ Saqlandi');
      onChanged?.();
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { setMsg('❌ ' + e.message); }
    setSaving(false);
  }

  const F = ({ k, label, type = 'text' }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input !py-2.5" type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        <F k="full_name" label="Ism familiya" />
        <F k="phone" label="Telefon" />
        <F k="birth_date" label="Tug'ilgan sana" type="date" />
        <F k="jshshir" label="JSHSHIR" />
        <F k="parent_name" label="Ota-ona ismi" />
        <F k="parent_phone" label="Ota-ona telefoni" />
        <F k="telegram_username" label="Telegram username" />
        <F k="address" label="Manzil" />
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} disabled={saving} className="btn-gold !py-2 !px-4 text-xs"><Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        {msg && <span className="text-xs">{msg}</span>}
      </div>
    </div>
  );
}

function TabGuruhlar({ student, onChanged }) {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ group_name: student.group_name || '', tariff_price: student.tariff_price || 0, tariff_type: student.tariff_type || 'Oddiy' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/groups').then((g) => setGroups(g || [])).catch(() => setGroups([])); }, []);

  async function save() {
    setSaving(true); setMsg('');
    try {
      if (form.group_name !== student.group_name) {
        await api.post('/student_timeline', { student: student.full_name, event: 'Guruh o\'zgardi', detail: `${student.group_name || '—'} → ${form.group_name || '—'}`, date: today(), type: 'group_change' });
      }
      await api.put(`/students/${student.id}`, form);
      setMsg('✅ Saqlandi');
      onChanged?.();
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { setMsg('❌ ' + e.message); }
    setSaving(false);
  }

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="label">Guruh</label>
          <select className="input !py-2.5" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })}>
            <option value="">— tanlang —</option>
            {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Oylik tarif (so'm)</label>
          <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.tariff_price}
            onChange={(e) => setForm({ ...form, tariff_price: e.target.value })} />
        </div>
        <div>
          <label className="label">Tarif turi</label>
          <select className="input !py-2.5" value={form.tariff_type} onChange={(e) => setForm({ ...form, tariff_type: e.target.value })}>
            <option value="Oddiy">Oddiy</option>
            <option value="2+6">2+6 (2 oy o'zi, 6 oy davlat to'laydi)</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={save} disabled={saving} className="btn-gold !py-2 !px-4 text-xs"><Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        {msg && <span className="text-xs">{msg}</span>}
      </div>
      <GroupHistory student={student} />
    </div>
  );
}

function GroupHistory({ student }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/student_timeline?q=${encodeURIComponent(student.full_name)}`)
      .then((r) => setRows((r || []).filter((x) => x.type === 'group_change')))
      .catch(() => setRows([]));
  }, [student.full_name]);
  if (rows === null) return <Spinner />;
  return (
    <div>
      <div className="label mb-2">Guruh tarixi</div>
      {rows.length === 0 ? <p className="text-sm text-navy-400">Hali o'zgarish yo'q</p> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
              <span className="text-navy-700">{r.detail}</span>
              <span className="text-[10px] text-navy-400">{r.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabTolovlar({ student, onChanged }) {
  const [ledger, setLedger] = useState(null);
  const [form, setForm] = useState({ type: 'credit', amount: '', reason: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const rows = await api.get(`/balance?student_id=${student.id}`).catch(() => []);
    setLedger((rows || []).sort((a, b) => (b.at || '').localeCompare(a.at || '')));
  }
  useEffect(() => { load(); }, [student.id]);

  async function adjust() {
    setErr('');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setErr("To'g'ri summa kiriting"); return; }
    setSaving(true);
    try {
      await api.post('/balance/adjust', { student_id: student.id, type: form.type, amount: amt, reason: form.reason.trim() });
      setForm({ type: 'credit', amount: '', reason: '' });
      await load();
      onChanged?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
          <div className={`font-display text-2xl ${(student.balance ?? 0) < 0 ? 'text-red-600' : 'text-navy-800'}`}>{money(student.balance ?? 0)}</div>
          <div className="text-[10px] text-navy-400">Joriy balans</div>
        </div>
        <div className="rounded-xl bg-navy-50/60 px-4 py-3 text-center">
          <div className="font-display text-2xl text-navy-800">{student.tariff_price ? money(student.tariff_price) : '—'}</div>
          <div className="text-[10px] text-navy-400">Oylik tarif</div>
        </div>
      </div>

      <div className="rounded-xl bg-gold/5 border border-gold/20 p-4 mb-5 max-w-xl">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <select className="input !py-2 text-xs" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="credit">+ Kredit</option>
            <option value="debit">− Debit</option>
          </select>
          <input className="input !py-2 text-xs" type="number" placeholder="Summa" onWheel={(e) => e.target.blur()}
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input !py-2 text-xs" placeholder="Sabab (ixtiyoriy)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <button onClick={adjust} disabled={saving} className="btn-gold !py-2 !px-4 text-xs">
          {saving ? 'Saqlanmoqda...' : <><Wallet size={14} /> Balansni tuzatish</>}
        </button>
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </div>

      <div className="label mb-2">Hisob-kitob tarixi</div>
      {ledger === null ? <Spinner /> : ledger.length === 0 ? (
        <p className="text-sm text-navy-400">Hali yozuv yo'q</p>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {ledger.map((l) => (
            <div key={l.id} className="flex items-center gap-2.5 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
              {l.type === 'credit' ? <TrendingUp size={14} className="text-emerald-500 shrink-0" /> : <TrendingDown size={14} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-navy-700 truncate">{l.reason}</div>
                <div className="text-[10px] text-navy-400">{l.date} · {l.staff}</div>
              </div>
              <span className={`font-bold shrink-0 ${l.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                {l.type === 'credit' ? '+' : '−'}{money(l.amount)}
              </span>
              <button onClick={() => printReceipt({
                studentName: student.full_name, groupName: student.group_name, type: l.type, amount: l.amount,
                reason: l.reason, date: l.date, staff: l.staff, balanceAfter: student.balance, receiptNo: l.id,
              })} className="text-navy-300 hover:text-gold-600 transition shrink-0" title="Chek chop etish">
                <Printer size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TARIX_TYPES = [
  { v: 'izoh', label: 'Izoh' },
  { v: 'call', label: "Qo'ng'iroq" },
  { v: 'system', label: 'Tizim' },
];

function TabTarix({ student }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ type: 'izoh', detail: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/student_timeline?q=${encodeURIComponent(student.full_name)}`).catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, [student.full_name]);

  async function add() {
    if (!form.detail.trim()) return;
    setSaving(true);
    try {
      const label = TARIX_TYPES.find((t) => t.v === form.type)?.label || form.type;
      await api.post('/student_timeline', { student: student.full_name, event: label, detail: form.detail.trim(), date: today(), type: form.type });
      setForm({ type: 'izoh', detail: '' });
      await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <select className="input !py-2.5 !w-40 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TARIX_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <input className="input !py-2.5 text-sm flex-1" placeholder="Izoh yoki qo'ng'iroq natijasini yozing..."
          value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} disabled={saving} className="btn-gold !py-2.5 !px-4 text-xs shrink-0"><Plus size={14} /> Qo'shish</button>
      </div>

      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <p className="text-sm text-navy-400">Hali yozuv yo'q</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl bg-navy-50/60 px-3.5 py-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-navy-600">{r.event}</span>
                <span className="text-[10px] text-navy-400">{r.date}</span>
              </div>
              <div className="text-sm text-navy-700">{r.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabCoin({ student }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get('/coins/log').then((r) => setRows((r || []).filter((c) => c.student === student.full_name))).catch(() => setRows([]));
  }, [student.full_name]);
  if (rows === null) return <Spinner />;
  if (rows.length === 0) return <p className="text-sm text-navy-400">Hali coin tarixi yo'q</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
          <Coins size={14} className={r.amount >= 0 ? 'text-emerald-500' : 'text-red-500'} />
          <div className="flex-1 min-w-0">
            <div className="text-navy-700 truncate">{r.reason || '—'}</div>
            <div className="text-[10px] text-navy-400">{r.at} · {r.given_by}</div>
          </div>
          <span className={`font-bold shrink-0 ${r.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.amount >= 0 ? '+' : ''}{r.amount}</span>
        </div>
      ))}
    </div>
  );
}

function TabSms({ student }) {
  const [rows, setRows] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const r = await api.get(`/sms_log?q=${encodeURIComponent(student.full_name)}`).catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, [student.full_name]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post('/sms_log', { recipient: student.full_name, phone: student.phone || '', message: text.trim(), date: today(), status: 'yuborildi' });
      setText('');
      await load();
    } catch (e) { alert(e.message); }
    setSending(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <input className="input !py-2.5 text-sm flex-1" placeholder={`${student.full_name}ga SMS matni...`}
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button onClick={send} disabled={sending || !text.trim()} className="btn-gold !py-2.5 !px-4 text-xs shrink-0">Yuborish</button>
      </div>
      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <p className="text-sm text-navy-400">Hali SMS tarixi yo'q</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`chip text-[9px] ${r.status === 'yuborildi' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'}`}>{r.status}</span>
                <span className="text-[10px] text-navy-400">{r.date}</span>
              </div>
              <div className="text-navy-700">{r.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabFayllar({ student }) {
  const [rows, setRows] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const r = await api.get(`/student_portfolio?q=${encodeURIComponent(student.full_name)}`).catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, [student.full_name]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const up = await api.upload(file);
      await api.post('/student_portfolio', { student: student.full_name, type: 'file', title: up.name, description: '', file_url: up.url, date: today() });
      await load();
    } catch (e) { alert(e.message); }
    setUploading(false);
  }

  async function removeFile(id) {
    if (!confirm("Faylni o'chirasizmi?")) return;
    await api.del(`/student_portfolio/${id}`).catch(() => {});
    await load();
  }

  return (
    <div>
      <label className="btn-gold !py-2 !px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer mb-5 w-fit">
        <Upload size={14} /> {uploading ? 'Yuklanmoqda...' : 'Fayl yuklash'}
        <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>
      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <p className="text-sm text-navy-400">Hali fayl yo'q</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
              <FileText size={14} className="text-navy-400 shrink-0" />
              <a href={api.fileUrl(r.file_url)} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-gold-700 hover:underline truncate">{r.title}</a>
              <span className="text-[10px] text-navy-400 shrink-0">{r.date}</span>
              <button onClick={() => removeFile(r.id)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabOnlineKurs({ student }) {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState(null);
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [completions, setCompletions] = useState([]);
  const [addCourseId, setAddCourseId] = useState('');
  const [openCourseId, setOpenCourseId] = useState(null);
  const [newLesson, setNewLesson] = useState({});
  const [uploading, setUploading] = useState(false);

  async function loadAll() {
    const [c, e, comp] = await Promise.all([
      api.get('/courses').catch(() => []),
      api.get(`/course-progress/enrollments?student_id=${student.id}`).catch(() => []),
      api.get(`/course-progress/completions?student_id=${student.id}`).catch(() => []),
    ]);
    setCourses(c || []); setEnrollments(e || []); setCompletions(comp || []);
  }
  useEffect(() => { loadAll(); }, [student.id]);

  async function loadLessons(courseId) {
    if (lessonsByCourse[courseId]) return;
    const rows = await api.get(`/course-progress/lessons?course_id=${courseId}`).catch(() => []);
    setLessonsByCourse((prev) => ({ ...prev, [courseId]: rows || [] }));
  }

  async function toggleCourse(courseId) {
    const next = openCourseId === courseId ? null : courseId;
    setOpenCourseId(next);
    if (next) await loadLessons(next);
  }

  async function enroll() {
    if (!addCourseId) return;
    await api.post('/course-progress/enroll', { student_id: student.id, course_id: Number(addCourseId) }).catch((e) => alert(e.message));
    setAddCourseId('');
    await loadAll();
  }

  async function unenroll(enrollmentId) {
    if (!confirm("Kursdan chiqarilsinmi?")) return;
    await api.del(`/course-progress/enroll/${enrollmentId}`).catch(() => {});
    await loadAll();
  }

  async function addLesson(courseId) {
    const l = newLesson[courseId];
    if (!l?.title?.trim()) return;
    let slide_url = null;
    if (l.file) {
      setUploading(true);
      try { const up = await api.upload(l.file); slide_url = up.url; } catch (e) { alert(e.message); setUploading(false); return; }
      setUploading(false);
    }
    await api.post('/course-progress/lessons', { course_id: courseId, title: l.title.trim(), slide_url }).catch((e) => alert(e.message));
    setNewLesson((prev) => ({ ...prev, [courseId]: { title: '', file: null } }));
    setLessonsByCourse((prev) => ({ ...prev, [courseId]: undefined }));
    await loadLessons(courseId);
  }

  async function toggleComplete(lesson, done) {
    if (done) {
      const score = prompt("Natija (%) — ixtiyoriy:", "100");
      await api.post('/course-progress/complete', { student_id: student.id, lesson_id: lesson.id, score: score ? Number(score) : null }).catch((e) => alert(e.message));
    } else {
      const existing = completions.find((c) => c.lesson_id === lesson.id);
      if (existing) await api.del(`/course-progress/complete/${existing.id}`).catch(() => {});
    }
    const comp = await api.get(`/course-progress/completions?student_id=${student.id}`).catch(() => []);
    setCompletions(comp || []);
  }

  const availableCourses = courses.filter((c) => !enrollments?.some((e) => e.course_id === c.id));

  if (enrollments === null) return <Spinner />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <select className="input !py-2.5 text-sm flex-1" value={addCourseId} onChange={(e) => setAddCourseId(e.target.value)}>
          <option value="">— kurs tanlang —</option>
          {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={enroll} disabled={!addCourseId} className="btn-gold !py-2.5 !px-4 text-xs shrink-0"><Plus size={14} /> Kursga qo'shish</button>
      </div>

      {enrollments.length === 0 ? (
        <p className="text-sm text-navy-400">Hali hech qanday kursga yozilmagan</p>
      ) : (
        <div className="space-y-3">
          {enrollments.map((en) => {
            const lessons = lessonsByCourse[en.course_id] || [];
            const courseCompletions = completions.filter((c) => c.course_id === en.course_id);
            const total = lessons.length;
            const done = courseCompletions.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const open = openCourseId === en.course_id;
            return (
              <div key={en.id} className="rounded-xl border border-navy-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-navy-50/40" onClick={() => toggleCourse(en.course_id)}>
                  <GraduationCap size={16} className="text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-navy-800">{en.course_name}</div>
                    <div className="text-[11px] text-navy-400">{done}/{total} dars · {pct}% {pct === 100 && total > 0 ? '✅ Tugatildi' : pct > 0 ? 'Jarayonda' : ''}</div>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-navy-100 overflow-hidden shrink-0">
                    <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); unenroll(en.id); }} className="text-navy-300 hover:text-red-500 transition shrink-0"><X size={14} /></button>
                </div>

                {open && (
                  <div className="border-t border-navy-100 bg-navy-50/30 p-3">
                    {lessons.length === 0 ? (
                      <p className="text-xs text-navy-400 mb-3">Hali dars/material yo'q</p>
                    ) : (
                      <div className="space-y-1.5 mb-3">
                        {lessons.map((l) => {
                          const c = courseCompletions.find((c2) => c2.lesson_id === l.id);
                          return (
                            <div key={l.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                              <button onClick={() => toggleComplete(l, !c)} className="shrink-0">
                                {c ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-navy-300" />}
                              </button>
                              <span className="flex-1 truncate text-navy-700">{l.title}</span>
                              {l.slide_url && <a href={api.fileUrl(l.slide_url)} target="_blank" rel="noreferrer" className="text-[10px] text-gold-600 hover:underline shrink-0">slayd</a>}
                              {c?.score != null && <span className="text-[11px] font-bold text-navy-600 shrink-0">{c.score}%</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input className="input !py-2 text-xs flex-1" placeholder="Yangi dars/material nomi..."
                        value={newLesson[en.course_id]?.title || ''}
                        onChange={(e) => setNewLesson((prev) => ({ ...prev, [en.course_id]: { ...prev[en.course_id], title: e.target.value } }))} />
                      <label className="btn-ghost !py-2 !px-2.5 text-[11px] cursor-pointer shrink-0">
                        📎
                        <input type="file" className="hidden" onChange={(e) => setNewLesson((prev) => ({ ...prev, [en.course_id]: { ...prev[en.course_id], file: e.target.files?.[0] } }))} />
                      </label>
                      <button onClick={() => addLesson(en.course_id)} disabled={uploading} className="btn-gold !py-2 !px-3 text-xs shrink-0">{uploading ? '...' : 'Qo\'shish'}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabNatijalar({ student }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/exam_results?q=${encodeURIComponent(student.full_name)}`)
      .then((r) => setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))))
      .catch(() => setRows([]));
  }, [student.full_name]);
  if (rows === null) return <Spinner />;
  if (rows.length === 0) return <p className="text-sm text-navy-400">Hali imtihon natijasi yo'q</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
          <Award size={14} className="text-gold-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-navy-700 truncate">{r.exam}</div>
            <div className="text-[10px] text-navy-400">{r.date}</div>
          </div>
          <span className="font-bold text-navy-800 shrink-0">{r.score}</span>
          {r.grade && <span className="chip text-[9px] bg-gold/10 text-gold-700 shrink-0">{r.grade}</span>}
        </div>
      ))}
    </div>
  );
}
