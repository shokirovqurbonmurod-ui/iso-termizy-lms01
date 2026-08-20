import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, User, Palette, Globe, Shield, Database, Info, Bot, Check, Send, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { roleLabel, roleColor, isAdmin } from '../config/roles.js';
import { api } from '../lib/api.js';

export default function Settings() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Sozlamalar" subtitle="Profil va tizim sozlamalari" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5 text-navy-800">
            <User size={18} className="text-gold" />
            <h3 className="font-display text-lg">Profil</h3>
          </div>
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-navy-50 to-gold-50/30">
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-2xl font-bold shadow-lg">{user.full_name[0]}</div>
            <div>
              <div className="font-bold text-navy-800 text-lg">{user.full_name}</div>
              <span className={`chip ${roleColor(user.role)} shadow-sm`}>{roleLabel(user.role)}</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <Row icon="📞" title="Telefon" value={user.phone} />
            <Row icon="🏢" title="Filial" value={user.branch || 'Sherobod — Bosh filial'} />
            {user.group_name && <Row icon="👥" title="Guruh" value={user.group_name} />}
            <Row icon="🔑" title="Rol" value={roleLabel(user.role)} />
          </div>
        </div>

        {/* System */}
        <div className="space-y-4">
          {isAdmin(user.role) && <AiModelCard />}
          {isAdmin(user.role) && <TelegramCard />}
          {isAdmin(user.role) && <KioskModeCard />}

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 text-navy-800">
              <Palette size={18} className="text-gold" />
              <h3 className="font-display text-lg">Ko'rinish</h3>
            </div>
            <div className="space-y-2">
              <SettingRow icon="🌙" title="Mavzu" value="Tun / Kun (topbar tugmasi)" />
              <SettingRow icon="🎨" title="Rang sxemasi" value="Timurid Gold + Navy" />
              <SettingRow icon="✒️" title="Shrift" value="Marcellus + Inter" />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 text-navy-800">
              <Globe size={18} className="text-gold" />
              <h3 className="font-display text-lg">Til</h3>
            </div>
            <div className="space-y-2">
              <SettingRow icon="🇺🇿" title="Interfeys tili" value="O'zbekcha / Русский / English" />
              <SettingRow icon="🔄" title="Almashtirish" value="Topbar → til tugmasi" />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 text-navy-800">
              <Info size={18} className="text-gold" />
              <h3 className="font-display text-lg">Tizim</h3>
            </div>
            <div className="space-y-2">
              <SettingRow icon="📦" title="Versiya" value="ISO Termizy LMS v9.0 Premium" />
              <SettingRow icon="📊" title="Modullar" value="100 ta menyu" />
              <SettingRow icon="💾" title="Ma'lumotlar" value="JSON-fayl bazasi (server/data/)" />
              <SettingRow icon="🏢" title="Bosh filial" value="Sherobod" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiModelCard() {
  const [models, setModels] = useState(null);
  const [current, setCurrent] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/ai/models').catch(() => []), api.get('/ai/settings').catch(() => null)])
      .then(([list, settings]) => {
        setModels(list || []);
        const model = settings?.model || (list && list[0]?.id) || '';
        setCurrent(model);
        setSelected(model);
      });
  }, []);

  async function save() {
    if (!selected || selected === current || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/ai/settings', { model: selected });
      setCurrent(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 text-navy-800">
        <Bot size={18} className="text-gold" />
        <h3 className="font-display text-lg">ISO Termizy AI modeli</h3>
      </div>
      {models === null ? (
        <p className="text-sm text-navy-400">Yuklanmoqda...</p>
      ) : models.length === 0 ? (
        <p className="text-sm text-navy-400">Bepul modellar ro'yxati topilmadi.</p>
      ) : (
        <div className="space-y-3">
          <select className="input !py-2.5 w-full" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
          <div className="flex items-center justify-between">
            <p className="text-xs text-navy-400">Barchasi OpenRouter'dagi bepul (:free) modellar — tanlash chatga darhol ta'sir qiladi.</p>
            <button onClick={save} disabled={selected === current || saving}
              className="btn-gold !py-2 !px-4 text-xs shrink-0 disabled:opacity-40">
              {saved ? <><Check size={14} /> Saqlandi</> : saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

function TelegramCard() {
  const [botInfo, setBotInfo] = useState(null);
  const [recipients, setRecipients] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [students, setStudents] = useState([]);
  const [linkChoice, setLinkChoice] = useState({}); // chat_id -> student_id ('' = hammasi/xodim)
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const [bot, list, st] = await Promise.all([
      api.get('/telegram/me').catch((e) => ({ error: e.message })),
      api.get('/telegram/recipients').catch(() => []),
      api.get('/students').catch(() => []),
    ]);
    setBotInfo(bot);
    setRecipients(list || []);
    setStudents(st || []);
  }
  useEffect(() => { load(); }, []);

  async function checkUpdates() {
    setChecking(true); setErr('');
    try {
      const links = await api.get('/bot/links');
      const existing = new Set(recipients.map((r) => String(r.chat_id)));
      setCandidates((links || [])
        .filter((l) => !existing.has(String(l.chat_id)))
        .map((l) => ({ chat_id: l.chat_id, name: l.user_name })));
    } catch (e) { setErr(e.message); }
    setChecking(false);
  }

  async function addRecipient(c) {
    setErr('');
    const studentId = linkChoice[c.chat_id] || '';
    const student = students.find((s) => String(s.id) === String(studentId));
    try {
      await api.post('/telegram/recipients', { chat_id: c.chat_id, name: c.name, student_id: studentId || null, student_name: student?.full_name || '' });
      setCandidates((prev) => prev.filter((x) => x.chat_id !== c.chat_id));
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function removeRecipient(id) {
    try { await api.del(`/telegram/recipients/${id}`); await load(); }
    catch (e) { setErr(e.message); }
  }

  async function sendTest() {
    setTesting(true); setMsg(''); setErr('');
    try { await api.post('/telegram/test', {}); setMsg('✅ Test xabar yuborildi!'); }
    catch (e) { setErr(e.message); }
    setTesting(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 text-navy-800">
        <Send size={18} className="text-gold" />
        <h3 className="font-display text-lg">Telegram bildirishnomalar</h3>
      </div>

      {botInfo?.error ? (
        <p className="text-sm text-red-500">{botInfo.error}</p>
      ) : !botInfo ? (
        <p className="text-sm text-navy-400">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-navy-50/60 p-4 text-sm text-navy-600">
            <p className="font-semibold text-navy-800 mb-1">Qanday ulash:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li><b>"Bot"</b> menyusidan har bir xodim/ota-ona o'z hisobini ulasin (kod orqali)</li>
              <li>Ulangandan keyin shu yerda "Yangilash" tugmasini bosing</li>
              <li>Ro'yxatdan kimga bildirishnoma borishini tanlab qo'shing</li>
            </ol>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Qabul qiluvchilar ({recipients?.length ?? 0})</span>
              <button onClick={checkUpdates} disabled={checking} className="text-[11px] font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1">
                <RefreshCw size={11} className={checking ? 'animate-spin' : ''} /> Yangilash
              </button>
            </div>
            {recipients?.length === 0 && candidates.length === 0 && (
              <p className="text-xs text-navy-400">Hali hech kim qo'shilmagan.</p>
            )}
            <div className="space-y-1.5">
              {recipients?.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-navy-50/60 px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm text-navy-700">{r.name}</span>
                    <span className={`chip text-[9px] ml-2 ${r.student_id ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.student_id ? `👶 ${r.student_name}` : 'Xodim — hammasi'}
                    </span>
                  </div>
                  <button onClick={() => removeRecipient(r.id)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
              {candidates.map((c) => (
                <div key={c.chat_id} className="rounded-lg bg-gold/5 border border-gold/20 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy-700">{c.name}</span>
                    <button onClick={() => addRecipient(c)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><UserPlus size={12} /> Qo'shish</button>
                  </div>
                  <select className="input !py-1.5 text-xs w-full" value={linkChoice[c.chat_id] || ''}
                    onChange={(e) => setLinkChoice((prev) => ({ ...prev, [c.chat_id]: e.target.value }))}>
                    <option value="">Xodim (hammasi haqida xabar oladi)</option>
                    {students.map((s) => <option key={s.id} value={s.id}>Ota-ona — faqat "{s.full_name}" haqida</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-navy-100">
            <p className="text-xs text-navy-400">Kirish/chiqish belgilanganda shu ro'yxatdagilarga avtomatik xabar boradi.</p>
            <button onClick={sendTest} disabled={testing || !recipients?.length} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0 disabled:opacity-40">
              {testing ? 'Yuborilmoqda...' : 'Test xabar'}
            </button>
          </div>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>
      )}
    </div>
  );
}

const KIOSK_KEY = 'iso_kiosk_mode';

function KioskModeCard() {
  const [kiosk, setKiosk] = useState(() => { try { return localStorage.getItem(KIOSK_KEY) === '1'; } catch { return false; } });

  function toggle() {
    const next = !kiosk;
    if (next && !confirm(
      "Ushbu qurilma \"qabulxona kiosk\" deb belgilanadi.\n\nBu yerda kimdir login-parolni ketma-ket noto'g'ri kiritsa (masalan 8 marta), shu qurilmaning veb-kamerasidan bitta kadr olinib, xavfsizlik ogohlantirishiga biriktiriladi.\n\nFaqat xodimlar nazorat qiladigan, hammaga ma'lum bitta qurilmada yoqing — shaxsiy telefon/kompyuterlarda YOQMANG.\n\nDavom etasizmi?"
    )) return;
    try { localStorage.setItem(KIOSK_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    setKiosk(next);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3 text-navy-800">
        <Shield size={18} className="text-gold" />
        <h3 className="font-display text-lg">Xavfsizlik — qabulxona kiosk</h3>
      </div>
      <p className="text-xs text-navy-400 mb-4">
        Faqat markazdagi umumiy/qabulxona qurilmasida yoqing. Yoqilgan bo'lsa — login sahifasida ketma-ket ko'p marta noto'g'ri parol kiritilganda (hisob bloklanganda) shu qurilma kamerasidan bitta kadr olinib, xavfsizlik ogohlantirishiga qo'shiladi. Shaxsiy qurilmalarda yoqmang.
      </p>
      <button onClick={toggle} className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition ${kiosk ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'btn-gold justify-center'}`}>
        {kiosk ? "✅ Yoqilgan — o'chirish" : "Ushbu qurilmani kiosk sifatida yoqish"}
      </button>
    </div>
  );
}

function Row({ icon, title, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-3">
      <span className="flex items-center gap-2 text-navy-600"><span>{icon}</span> {title}</span>
      <span className="font-semibold text-navy-800">{value}</span>
    </div>
  );
}

function SettingRow({ icon, title, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl hover:bg-navy-50/60 px-4 py-2.5 transition">
      <span className="flex items-center gap-2 text-sm text-navy-600"><span>{icon}</span> {title}</span>
      <span className="text-sm font-semibold text-navy-700">{value}</span>
    </div>
  );
}
