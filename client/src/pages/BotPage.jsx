import { useEffect, useRef, useState } from 'react';
import { Bot, Copy, Check, Link2, Unlink, Coins, CalendarClock, HelpCircle, Users, Send, Plus, Trash2, Wallet, Users2, Sparkles, ShieldAlert, MessagesSquare } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { isAdmin, roleLabel, roleColor } from '../config/roles.js';

const CAN_EDIT_COMMANDS = ['founder', 'director', 'super_admin'];

const BUILTIN_COMMANDS = [
  { cmd: '/balance', desc: 'Coin va ball balansingizni ko\'rsatadi', icon: Coins },
  { cmd: '/schedule', desc: 'Guruhingiz dars jadvalini ko\'rsatadi', icon: CalendarClock },
  { cmd: '/payments', desc: "So'nggi to'lovlaringizni ko'rsatadi", icon: Wallet },
  { cmd: '/group', desc: 'Guruhdoshlaringiz ro\'yxatini ko\'rsatadi', icon: Users2 },
  { cmd: '/help', desc: 'Barcha buyruqlar ro\'yxati', icon: HelpCircle },
];

export default function BotPage() {
  const { user } = useAuth();
  const canEditCommands = CAN_EDIT_COMMANDS.includes(user.role);
  const [botInfo, setBotInfo] = useState(null);
  const [myLink, setMyLink] = useState(null);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState(null);
  const [commands, setCommands] = useState([]);

  const [messagingId, setMessagingId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const [newCmd, setNewCmd] = useState({ command: '', description: '', response: '' });
  const [cmdErr, setCmdErr] = useState('');
  const [cmdSaving, setCmdSaving] = useState(false);

  const [botSettings, setBotSettings] = useState({ attendance_chat_id: '', attendance_topic_id: '', qa_enabled: false, mini_app_url: '', qa_chat_id: '', qa_topic_id: '' });
  const pristineSettings = useRef(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  async function load() {
    const [bot, mine, cmds] = await Promise.all([
      api.get('/telegram/me').catch((e) => ({ error: e.message })),
      api.get('/bot/my-link').catch(() => null),
      api.get('/bot/commands').catch(() => []),
    ]);
    setBotInfo(bot);
    setMyLink(mine);
    setCommands(cmds || []);
    if (isAdmin(user.role)) api.get('/bot/links').then(setLinks).catch(() => setLinks([]));
    if (CAN_EDIT_COMMANDS.includes(user.role)) {
      api.get('/bot/settings').then((s) => {
        const shaped = {
          attendance_chat_id: s?.attendance_chat_id || '', attendance_topic_id: s?.attendance_topic_id || '',
          qa_enabled: !!s?.qa_enabled, mini_app_url: s?.mini_app_url || '',
          qa_chat_id: s?.qa_chat_id || '', qa_topic_id: s?.qa_topic_id || '',
        };
        pristineSettings.current = shaped;
        setBotSettings(shaped);
      }).catch(() => {});
    }
  }
  useEffect(() => { load(); }, []);

  async function sendBroadcast() {
    if (!broadcastText.trim()) return;
    if (!confirm(`Ushbu xabar barcha ulangan hisoblarga (${links?.length ?? 0} ta) yuborilsinmi?`)) return;
    setBroadcasting(true); setBroadcastMsg('');
    try {
      const r = await api.post('/bot/broadcast', { text: broadcastText.trim() });
      setBroadcastMsg(`✅ ${r.count} ta hisobga yuborildi`);
      setBroadcastText('');
      setTimeout(() => setBroadcastMsg(''), 3000);
    } catch (e) { setBroadcastMsg('❌ ' + e.message); }
    setBroadcasting(false);
  }

  async function saveBotSettings() {
    setSettingsSaving(true); setSettingsMsg('');
    try {
      // Boshqa yo'ldan (masalan Telegram'dagi /setqa buyrug'i) o'zgargan bo'lishi mumkin bo'lgan
      // maydonlarni saqlashdan oldin qayta yuklaymiz — shu sahifada haqiqatan tahrirlangan
      // maydonlarnigina yuboramiz, aks holda ochiq turgan eski (stale) sahifa serverdagi yangi
      // qiymatni (masalan /setqa bilan o'rnatilgan qa_chat_id'ni) bosib qo'yishi mumkin edi.
      const fresh = await api.get('/bot/settings').catch(() => null);
      const freshShaped = fresh ? {
        attendance_chat_id: fresh.attendance_chat_id || '', attendance_topic_id: fresh.attendance_topic_id || '',
        qa_enabled: !!fresh.qa_enabled, mini_app_url: fresh.mini_app_url || '',
        qa_chat_id: fresh.qa_chat_id || '', qa_topic_id: fresh.qa_topic_id || '',
      } : botSettings;
      const base = pristineSettings.current || freshShaped;
      const merged = { ...freshShaped };
      for (const key of Object.keys(botSettings)) {
        if (botSettings[key] !== base[key]) merged[key] = botSettings[key];
      }
      await api.put('/bot/settings', merged);
      pristineSettings.current = merged;
      setBotSettings(merged);
      setSettingsMsg('✅ Saqlandi');
      setTimeout(() => setSettingsMsg(''), 2000);
    } catch (e) { setSettingsMsg('❌ ' + e.message); }
    setSettingsSaving(false);
  }

  async function getCode() {
    setCodeErr(''); setCode('');
    try { const res = await api.post('/bot/link-code', {}); setCode(res.code); }
    catch (e) { setCodeErr(e.message); }
  }

  function copyCommand() {
    navigator.clipboard?.writeText(`/start ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function unlink(id) {
    if (!confirm("Bot ulanishini uzasizmi?")) return;
    try { await api.del(`/bot/links/${id}`); await load(); if (id === myLink?.id) setMyLink(null); }
    catch (e) { alert(e.message); }
  }

  async function toggleSecurity(l) {
    try { await api.put(`/bot/links/${l.id}/security`, { security_alert: !l.security_alert }); await load(); }
    catch (e) { alert(e.message); }
  }

  async function sendDirect(chatId) {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/bot/send', { chat_id: chatId, text: messageText.trim() });
      setMessagingId(null); setMessageText('');
    } catch (e) { alert(e.message); }
    setSending(false);
  }

  async function addCommand() {
    setCmdErr('');
    if (!newCmd.command.trim() || !newCmd.response.trim()) { setCmdErr("Buyruq nomi va javob matni kerak."); return; }
    setCmdSaving(true);
    try {
      await api.post('/bot/commands', newCmd);
      setNewCmd({ command: '', description: '', response: '' });
      await load();
    } catch (e) { setCmdErr(e.message); }
    setCmdSaving(false);
  }

  async function removeCommand(id) {
    if (!confirm("Bu buyruqni o'chirasizmi?")) return;
    try { await api.del(`/bot/commands/${id}`); await load(); }
    catch (e) { alert(e.message); }
  }

  if (!botInfo) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Bot} title="Telegram Bot" subtitle={botInfo.error ? botInfo.error : `@${botInfo.username} — bildirishnoma va buyruqlar`} />

      {botInfo.error ? (
        <Empty icon={Bot} title="Bot sozlanmagan" hint={botInfo.error} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Mening hisobim */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 text-navy-800">
              <Link2 size={18} className="text-gold" />
              <h3 className="font-display text-lg">Mening hisobim</h3>
            </div>

            {myLink ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center animate-fade">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-display text-lg text-emerald-700 mb-1">Telegram ulangan</div>
                <p className="text-xs text-emerald-600 mb-4">{myLink.linked_at} da ulangan</p>
                <button onClick={() => unlink(myLink.id)} className="btn-ghost !py-2 !px-4 text-xs mx-auto">
                  <Unlink size={14} /> Ulanishni uzish
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-navy-500 mb-1">Telegram orqali bildirishnoma olish va <code>/balance</code>, <code>/schedule</code> kabi buyruqlardan foydalanish uchun hisobingizni ulang.</p>
                <p className="text-xs text-navy-400 mb-4">Ulangan kod <b className="text-navy-700">{user.full_name}</b> ({roleLabel(user.role)}) hisobingiz uchun ishlatiladi.</p>
                {!code ? (
                  <button onClick={getCode} className="btn-gold w-full justify-center"><Link2 size={16} /> Kod olish</button>
                ) : (
                  <div className="rounded-2xl bg-gold/5 border border-gold/20 p-5 text-center animate-fade">
                    <p className="text-xs text-navy-500 mb-2">
                      <b>{user.full_name}</b> hisobingiz uchun kod tayyor. <a href={`https://t.me/${botInfo.username}`} target="_blank" rel="noreferrer" className="text-gold-600 font-semibold hover:underline">@{botInfo.username}</a> botini oching va shu buyruqni yuboring:
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <code className="font-display text-2xl tracking-widest text-navy-800 bg-white rounded-xl px-4 py-2 border border-navy-100">/start {code}</code>
                      <button onClick={copyCommand} className="grid place-items-center w-10 h-10 rounded-xl hover:bg-white text-navy-400 hover:text-gold-600 transition shrink-0" title="Nusxalash">
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-navy-400">Kod 10 daqiqa amal qiladi. Yubormasangiz, qayta kod oling.</p>
                    <button onClick={load} className="btn-ghost !py-1.5 !px-3 text-xs mt-3">Ulanganimni tekshirish</button>
                  </div>
                )}
                {codeErr && <p className="text-xs text-red-500 mt-2">{codeErr}</p>}
              </div>
            )}
          </div>

          {/* Buyruqlar */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 text-navy-800">
              <HelpCircle size={18} className="text-gold" />
              <h3 className="font-display text-lg">Mavjud buyruqlar</h3>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {BUILTIN_COMMANDS.map((c) => (
                <div key={c.cmd} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white shrink-0"><c.icon size={14} /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-navy-800 font-mono">{c.cmd}</div>
                    <div className="text-xs text-navy-400">{c.desc}</div>
                  </div>
                </div>
              ))}
              {commands.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-gold/5 border border-gold/20 px-3 py-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white shrink-0"><Sparkles size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-navy-800 font-mono">/{c.command}</div>
                    <div className="text-xs text-navy-400">{c.description || 'Maxsus buyruq'}</div>
                  </div>
                  {canEditCommands && (
                    <button onClick={() => removeCommand(c.id)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-navy-400 mt-4">💡 Buyruqlar faqat o'quvchi hisobiga ulangan foydalanuvchilar uchun to'liq ishlaydi.</p>
          </div>

          {/* Super admin: maxsus buyruqlar */}
          {canEditCommands && (
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center gap-2 mb-4 text-navy-800">
                <Plus size={18} className="text-gold" />
                <h3 className="font-display text-lg">Yangi buyruq qo'shish</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="label">Buyruq (masalan: narxlar)</label>
                  <input className="input !py-2.5" placeholder="narxlar" value={newCmd.command} onChange={(e) => setNewCmd({ ...newCmd, command: e.target.value })} />
                </div>
                <div>
                  <label className="label">Tavsif</label>
                  <input className="input !py-2.5" placeholder="Kurs narxlari" value={newCmd.description} onChange={(e) => setNewCmd({ ...newCmd, description: e.target.value })} />
                </div>
                <div>
                  <label className="label">Javob matni</label>
                  <input className="input !py-2.5" placeholder="Salom {name}! Narxlar..." value={newCmd.response} onChange={(e) => setNewCmd({ ...newCmd, response: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-navy-400">💡 Javob matnida <code>{'{name}'}</code> yozsangiz, foydalanuvchi ismi bilan almashadi.</p>
                <button onClick={addCommand} disabled={cmdSaving} className="btn-gold !py-2 !px-4 text-xs shrink-0">{cmdSaving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
              </div>
              {cmdErr && <p className="text-xs text-red-500 mt-2">{cmdErr}</p>}
            </div>
          )}

          {/* Super admin: davomat guruhi/topic sozlamalari */}
          {canEditCommands && (
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center gap-2 mb-2 text-navy-800">
                <MessagesSquare size={18} className="text-gold" />
                <h3 className="font-display text-lg">Davomat guruhi</h3>
              </div>
              <p className="text-[11px] text-navy-400 mb-4">
                O'quvchi kamera orqali kirganda/chiqqanda shu Telegram guruhga (va ixtiyoriy topicga) avtomatik xabar yuboriladi. Guruh ID sini bilish uchun botni guruhga qo'shing, guruhda bir marta xabar yozing, so'ng <code>@userinfobot</code> yoki <code>@RawDataBot</code> yordamida <code>chat_id</code>ni oling. Topic (mavzu) ID si — forum-guruhlarda shu mavzuga xabar yozib, uning havolasidagi oxirgi raqam.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Guruh chat_id (masalan: -1001234567890)</label>
                  <input className="input !py-2.5" placeholder="-1001234567890" value={botSettings.attendance_chat_id}
                    onChange={(e) => setBotSettings({ ...botSettings, attendance_chat_id: e.target.value })} />
                </div>
                <div>
                  <label className="label">Topic ID (ixtiyoriy)</label>
                  <input className="input !py-2.5" placeholder="12" value={botSettings.attendance_topic_id}
                    onChange={(e) => setBotSettings({ ...botSettings, attendance_topic_id: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveBotSettings} disabled={settingsSaving} className="btn-gold !py-2 !px-4 text-xs">{settingsSaving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
                {settingsMsg && <span className="text-xs">{settingsMsg}</span>}
              </div>
            </div>
          )}

          {/* Super admin: AI savol-javob va Mini App */}
          {canEditCommands && (
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center gap-2 mb-2 text-navy-800">
                <Sparkles size={18} className="text-gold" />
                <h3 className="font-display text-lg">AI Yordamchi Ustoz & Mini App</h3>
              </div>
              <p className="text-[11px] text-navy-400 mb-4">
                Yoqilsa, bot sun'iy intellekt bilan avtomatik javob beradi — imzosiz, oddiy xabar sifatida (barcha javoblar "ISO Termizy AI Auditi" bo'limida ham ko'rinadi):
              </p>
              <ul className="text-[11px] text-navy-500 mb-4 space-y-1 pl-4 list-disc">
                <li><b>Pastda "Savol-javob guruhi" chat_id (va ixtiyoriy Topic ID) belgilangan bo'lsa:</b> bot <u>FAQAT</u> o'sha bitta guruh/mavzuda javob beradi (mention shart emas, Junior IT Academy'dagi kabi har bir xabarga) — boshqa hech qanday guruhda, hatto mention qilinsa ham, aralashmaydi.</li>
                <li><b>Hech qaysi guruh belgilanmagan bo'lsa:</b> bot istalgan guruhda, lekin faqat o'ziga <b>@{botInfo?.username}</b> deb mention qilinganda yoki xabariga reply qilinganda javob beradi (spam bo'lmasin uchun).</li>
              </ul>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 mb-4 text-[11px] text-amber-800">
                ⚠️ <b>Muhim:</b> Telegram botlarida standart holatda "Group Privacy" yoqilgan bo'lib, bot mention/reply/buyruq bo'lmagan oddiy xabarlarni umuman ko'rmaydi (bu Telegram'ning o'zining cheklovi, kod bilan aylanib o'tib bo'lmaydi). "Savol-javob guruhi"dagi har bir xabarga javob berishi uchun: <b>@BotFather</b> → <code>/mybots</code> → botni tanlang → <b>Bot Settings → Group Privacy → Turn off</b>. So'ng botni guruhdan chiqarib qayta qo'shing (sozlama kuchga kirishi uchun).
              </div>
              <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none w-fit">
                <input type="checkbox" className="w-4 h-4 accent-gold-500" checked={botSettings.qa_enabled}
                  onChange={(e) => setBotSettings({ ...botSettings, qa_enabled: e.target.checked })} />
                <span className="text-sm font-semibold text-navy-700">AI savol-javob yoqilgan</span>
              </label>
              <div className="grid sm:grid-cols-2 gap-3 mb-1">
                <div>
                  <label className="label">Savol-javob guruhi chat_id (ixtiyoriy)</label>
                  <input className="input !py-2.5" placeholder="-1001234567890" value={botSettings.qa_chat_id}
                    onChange={(e) => setBotSettings({ ...botSettings, qa_chat_id: e.target.value })} />
                </div>
                <div>
                  <label className="label">Topic ID (ixtiyoriy)</label>
                  <input className="input !py-2.5" placeholder="12" value={botSettings.qa_topic_id}
                    onChange={(e) => setBotSettings({ ...botSettings, qa_topic_id: e.target.value })} />
                </div>
              </div>
              <p className="text-[11px] text-navy-400 mb-4">Bo'sh qoldirilsa, faqat mention/reply orqali javob beradi (yuqoridagi birinchi holat).</p>
              <label className="label">Mini App URL (ilovaning ochiq HTTPS manzili)</label>
              <input className="input !py-2.5 mb-2" placeholder="https://app.isotermizy.uz" value={botSettings.mini_app_url}
                onChange={(e) => setBotSettings({ ...botSettings, mini_app_url: e.target.value })} />
              <p className="text-[11px] text-navy-400 mb-4">
                Kiritilsa, botning menyu tugmasi va <code>/start</code>, <code>/help</code> xabarlaridagi <b>"📱 Ilovani ochish"</b> tugmasi shu manzilni Telegram ichida (Mini App sifatida) ochadi. Manzil albatta ilovaning o'zining <b>https://</b> veb-sahifasi bo'lishi kerak (masalan <code>https://app.isotermizy.uz</code>) — <b>t.me/... guruh yoki kanal taklif havolasi emas</b> va lokal <code>http://localhost</code> ham ishlamaydi; noto'g'ri manzil kiritilsa Telegram uni rad etadi.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={saveBotSettings} disabled={settingsSaving} className="btn-gold !py-2 !px-4 text-xs">{settingsSaving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
                {settingsMsg && <span className="text-xs">{settingsMsg}</span>}
              </div>
            </div>
          )}

          {/* Admin: ulangan hisoblar */}
          {isAdmin(user.role) && (
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="p-4 border-b border-navy-100 flex items-center gap-2">
                <Users size={18} className="text-gold" />
                <h3 className="font-display text-lg text-navy-800">Ulangan hisoblar</h3>
                <span className="text-xs text-navy-400 ml-auto">{links?.length ?? 0} ta</span>
              </div>
              <div className="p-4 border-b border-navy-100 bg-navy-50/40">
                <label className="label flex items-center gap-1.5"><Sparkles size={12} className="text-gold" /> Hammaga birdaniga xabar</label>
                <div className="flex items-center gap-2">
                  <input className="input !py-2.5 text-sm flex-1" placeholder="Barcha ulangan hisoblarga yuboriladigan xabar..."
                    value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendBroadcast()} />
                  <button onClick={sendBroadcast} disabled={broadcasting || !broadcastText.trim()} className="btn-gold !py-2.5 !px-4 text-xs shrink-0">
                    {broadcasting ? '...' : <><Send size={14} /> Yuborish</>}
                  </button>
                </div>
                {broadcastMsg && <p className="text-xs mt-1.5">{broadcastMsg}</p>}
              </div>
              {links === null ? <Spinner /> : links.length === 0 ? (
                <Empty icon={Users} title="Hali hech kim ulanmagan" />
              ) : (
                <div className="divide-y divide-navy-50">
                  {links.map((l) => (
                    <div key={l.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(l.user_name || '?')[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-navy-800 truncate">{l.user_name}</div>
                          <div className="text-[10px] text-navy-400">{l.linked_at}</div>
                        </div>
                        <span className={`chip text-[9px] shrink-0 ${roleColor(l.role)}`}>{roleLabel(l.role)}</span>
                        <button onClick={() => { setMessagingId(messagingId === l.id ? null : l.id); setMessageText(''); }} className="text-navy-300 hover:text-gold-600 transition shrink-0" title="Xabar yuborish"><Send size={14} /></button>
                        {CAN_EDIT_COMMANDS.includes(user.role) && (
                          <button onClick={() => toggleSecurity(l)} className={`transition shrink-0 ${l.security_alert ? 'text-red-500' : 'text-navy-300 hover:text-red-400'}`} title={l.security_alert ? "Xavfsizlik ogohlantirishlari: YOQILGAN — o'chirish uchun bosing" : "Xavfsizlik ogohlantirishlarini shu hisobga yuborish"}>
                            <ShieldAlert size={14} />
                          </button>
                        )}
                        <button onClick={() => unlink(l.id)} className="text-navy-300 hover:text-red-500 transition shrink-0" title="Uzish"><Unlink size={14} /></button>
                      </div>
                      {messagingId === l.id && (
                        <div className="flex items-center gap-2 mt-2.5 pl-11 animate-fade">
                          <input className="input !py-2 text-sm flex-1" placeholder={`${l.user_name}ga xabar...`} value={messageText}
                            onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendDirect(l.chat_id)} autoFocus />
                          <button onClick={() => sendDirect(l.chat_id)} disabled={sending || !messageText.trim()} className="btn-gold !py-2 !px-3 text-xs shrink-0">
                            {sending ? '...' : <Send size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
