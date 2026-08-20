import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Hash, Users, User, Search, Plus, Smile, Paperclip, Image, UserPlus, X, Lock, KeyRound, Mic, Video as VideoIcon, Trash2, Download, FileText, Reply, Pin, SmilePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const TABS = [
  { key: 'channels', icon: Hash, label: 'Kanallar' },
  { key: 'groups', icon: Users, label: 'Guruhlar' },
  { key: 'private', icon: User, label: 'Shaxsiy' },
];

// "O'qituvchilar" kanaliga faqat xodimlar kira oladi — server ham shu qoidani bajaradi.
const STAFF_ONLY_CHANNELS = ["O'qituvchilar"];

const DEF_CHANNELS = [
  { key: 'Umumiy', icon: '🌐' },
  { key: "O'qituvchilar", icon: '👨‍🏫', staffOnly: true },
  { key: 'Marketing', icon: '📣' },
  { key: 'IELTS', icon: '📝' },
  { key: 'IT / Olimpiada', icon: '💻' },
  { key: 'Matematika', icon: '📐' },
  { key: 'Koreys tili', icon: '🇰🇷' },
];

const EMOJIS = ['😊','👍','❤️','🔥','👏','💪','✅','⭐','🎉','😂','🙏','💯','📚','✍️','🏆','💡','🎓','👋','😍','🤔'];
const QUICK_REACTIONS = ['👍','❤️','😂','🔥','😮','🙏'];

const BOT_NAME = 'ISO Termizy AI';

const COLORS = ['from-blue-500 to-blue-700','from-emerald-500 to-emerald-700','from-violet-500 to-violet-700','from-amber-500 to-amber-700','from-rose-500 to-rose-700','from-cyan-500 to-cyan-700'];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T'));
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return Math.floor(diff/60) + ' daq oldin';
  if (diff < 86400) return Math.floor(diff/3600) + ' soat oldin';
  return ts.slice(5, 16);
}

// Matn ichidagi "@Ism Familiya" ko'rinishidagi mentionlarni topib, alohida stil bilan chizadi —
// eng uzun ismlardan boshlab qidiradi (aks holda "@Ali Vali" ichidagi "@Ali" qismi noto'g'ri mos kelib qolardi).
function renderWithMentions(text, allUsers, myName) {
  if (!text) return text;
  const names = [...allUsers.map(u => u.full_name), myName].filter(Boolean)
    .filter((n, i, arr) => arr.indexOf(n) === i).sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const pattern = new RegExp('@(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?!\\w)', 'g');
  const parts = [];
  let last = 0, m;
  while ((m = pattern.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const isMe = m[1] === myName;
    parts.push(<span key={m.index} className={`font-bold ${isMe ? 'text-amber-700 bg-amber-100 rounded px-0.5' : 'text-[#0A84FF]'}`}>@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function GroupChat() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [tab, setTab] = useState('channels');
  const [channel, setChannel] = useState('Umumiy');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [channelMembers, setChannelMembers] = useState({});
  const [chatRooms, setChatRooms] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [recorder, setRecorder] = useState(null); // { kind: 'audio'|'video', seconds }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const isAdmin = ['founder','director','super_admin','branch_manager','admin','academic_manager','head_teacher'].includes(user.role);
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);

  async function load() {
    const [msgs, users, gr, mem, rooms] = await Promise.all([
      api.get('/chat_messages').catch(() => []),
      api.get('/staff').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/group_memberships').catch(() => []),
      api.get('/chat_rooms').catch(() => []),
    ]);
    setMessages(msgs || []);
    setAllUsers(users || []);
    setGroups(gr || []);
    setMemberships((mem || []).map(m => m.group_name));
    setChatRooms(rooms || []);
  }

  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, []);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [messages, channel]);
  useEffect(() => { setJoinCode(''); setJoinErr(''); setShowCode(false); }, [channel]);

  // "Link olish" orqali kelingan taklif havolasini (?g=guruh&code=kod) avtomatik qo'llash.
  useEffect(() => {
    if (messages === null) return; // hali yuklanmagan
    const g = searchParams.get('g');
    const code = searchParams.get('code');
    if (!g || !code) return;
    setSearchParams({}, { replace: true });
    setTab('groups');
    setChannel(g);
    if (!memberships.includes(g)) {
      api.post('/group_memberships/join', { group_name: g, code })
        .then(() => setMemberships((m) => [...new Set([...m, g])]))
        .catch((e) => setJoinErr(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const visibleChannels = useMemo(() =>
    DEF_CHANNELS.filter(c => !c.staffOnly || isStaff), [isStaff]);

  const groupItems = useMemo(() => groups.map(g => ({
    key: g.name, icon: '👥', teacher: g.teacher, id: g.id,
  })), [groups]);

  const botKey = useMemo(() => `DM:${[user.full_name, BOT_NAME].sort().join(':')}`, [user.full_name]);

  const customChannels = useMemo(() => chatRooms.filter(r => r.type === 'channel').map(r => ({ key: r.name, icon: r.icon || '#️⃣', roomId: r.id })), [chatRooms]);
  const customGroups = useMemo(() => chatRooms.filter(r => r.type === 'group').map(r => ({ key: r.name, icon: r.icon || '👥', roomId: r.id })), [chatRooms]);

  const items = useMemo(() => {
    if (tab === 'channels') return [...visibleChannels, ...customChannels];
    if (tab === 'groups') return [...groupItems, ...customGroups];
    const humans = allUsers.filter(u2 => u2.full_name !== user.full_name)
      .map(u2 => ({ key: `DM:${[user.full_name, u2.full_name].sort().join(':')}`, icon: '👤', label: u2.full_name, role: u2.role_label }));
    const bot = { key: botKey, icon: '🤖', label: BOT_NAME, role: 'AI yordamchi' };
    return [bot, ...humans];
  }, [tab, allUsers, customChannels, customGroups, user, visibleChannels, groupItems, botKey]);

  const isBotChannel = tab === 'private' && channel === botKey;

  const isLocked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(channel) && groups.some(g => g.name === channel);

  async function joinGroup() {
    setJoinErr(''); setJoining(true);
    try {
      await api.post('/group_memberships/join', { group_name: channel, code: joinCode });
      setMemberships(m => [...new Set([...m, channel])]);
      setJoinCode('');
    } catch (e) { setJoinErr(e.message); }
    setJoining(false);
  }

  const filteredItems = searchQ.trim()
    ? items.filter(it => (it.label || it.key).toLowerCase().includes(searchQ.toLowerCase()))
    : items;

  const filtered = useMemo(() => {
    return (messages || [])
      .filter(m => {
        if (tab === 'private' && channel.startsWith('DM:')) {
          const names = channel.replace('DM:', '').split(':');
          const mNames = (m.channel || '').replace('DM:', '').split(':');
          return names.every(n => mNames.includes(n));
        }
        return m.channel === channel;
      })
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [messages, channel, tab]);

  const pinnedInChannel = useMemo(() => filtered.filter(m => m.pinned), [filtered]);

  // Kanal a'zolari
  const members = useMemo(() => {
    const senders = [...new Set(filtered.map(m => m.sender))];
    return allUsers.filter(u => senders.includes(u.full_name) || u.full_name === user.full_name);
  }, [filtered, allUsers, user]);

  async function send(extraText) {
    const msg = extraText || text.trim();
    if (!msg || sending) return;
    setSending(true);
    const askBot = isBotChannel;
    try {
      await api.post('/chat_messages', {
        channel, sender: user.full_name, sender_role: user.role,
        text: msg,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        reply_to: replyingTo?.id || undefined,
      });
      setText('');
      setShowEmoji(false);
      setReplyingTo(null);
      await load();
      if (askBot) {
        setBotTyping(true);
        const history = (messages || [])
          .filter((m) => m.channel === botKey)
          .slice(-12)
          .map((m) => ({ role: m.sender === BOT_NAME ? 'assistant' : 'user', content: m.text }));
        let reply = '';
        try {
          await api.aiChatStream({ message: msg, history, session: `chat-bot-${user.full_name}` }, (full) => { reply = full; });
        } catch (e) { reply = "Kechirasiz, hozir javob bera olmadim. Birozdan so'ng qayta urinib ko'ring."; }
        await api.post('/chat_messages', {
          channel: botKey, sender: BOT_NAME, sender_role: 'bot',
          text: reply || '...',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        }).catch(() => {});
        setBotTyping(false);
        await load();
      }
    } catch (e) { console.error(e); }
    setSending(false);
    inputRef.current?.focus();
  }

  function addEmoji(e) { setText(prev => prev + e); }

  async function togglePin(m) {
    await api.put(`/chat_messages/${m.id}/pin`, {}).catch(() => {});
    await load();
  }

  async function toggleReaction(m, emoji) {
    setReactionPickerFor(null);
    await api.post(`/chat_messages/${m.id}/react`, { emoji }).catch(() => {});
    await load();
  }

  function reactionGroups(m) {
    const list = Array.isArray(m.reactions) ? m.reactions : [];
    const byEmoji = {};
    for (const r of list) (byEmoji[r.emoji] ||= []).push(r.sender);
    return Object.entries(byEmoji);
  }

  // "@" dan keyingi bo'shliqsiz so'zga qarab (masalan "@Diyor") mos keladigan foydalanuvchilarni
  // taklif qiladi — tanlanganda to'liq ism qo'yiladi.
  const mentionQuery = useMemo(() => {
    const m = text.match(/@(\S{0,20})$/);
    return m ? m[1] : null;
  }, [text]);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allUsers.filter(u => u.full_name.toLowerCase().split(' ').some(w => w.startsWith(q))).slice(0, 5);
  }, [mentionQuery, allUsers]);

  function pickMention(u) {
    setText(prev => prev.replace(/@(\S{0,20})$/, `@${u.full_name} `));
    inputRef.current?.focus();
  }

  const fileRef = useRef(null);
  const imgRef = useRef(null);

  async function sendMedia(media_url, media_type, media_name, caption = '') {
    await api.post('/chat_messages', {
      channel, sender: user.full_name, sender_role: user.role,
      text: caption, media_url, media_type, media_name,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
    await load();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, 'file', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, 'image', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  // ── Ovozli / video xabar yozib olish ──
  async function startRecording(kind) {
    try {
      const constraints = kind === 'video' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      chunksRef.current = [];
      if (kind === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecorder({ kind, seconds: 0 });
      timerRef.current = setInterval(() => setRecorder((r) => r ? { ...r, seconds: r.seconds + 1 } : r), 1000);
    } catch (err) {
      alert("Mikrofon/kameraga ruxsat berilmadi: " + err.message);
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    stopStream();
    setRecorder(null);
    chunksRef.current = [];
  }

  async function finishRecording() {
    const kind = recorder?.kind;
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    const blobPromise = new Promise((resolve) => { mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType })); });
    mr.stop();
    stopStream();
    setRecorder(null);
    const blob = await blobPromise;
    const ext = kind === 'video' ? 'webm' : 'webm';
    const file = new File([blob], `${kind === 'video' ? 'video' : 'ovozli'}-xabar-${Date.now()}.${ext}`, { type: blob.type || (kind === 'video' ? 'video/webm' : 'audio/webm') });
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, kind === 'video' ? 'video' : 'audio', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  function addMember(userName) {
    setChannelMembers(prev => ({
      ...prev,
      [channel]: [...new Set([...(prev[channel] || []), userName])],
    }));
  }

  function removeMember(userName) {
    setChannelMembers(prev => ({
      ...prev,
      [channel]: (prev[channel] || []).filter(n => n !== userName),
    }));
  }

  const currentMembers = channelMembers[channel] || [];
  const availableUsers = allUsers.filter(u => 
    !currentMembers.includes(u.full_name) && 
    u.full_name !== user.full_name &&
    (!memberSearch.trim() || u.full_name.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  async function deleteItem(it) {
    if (!confirm('Rostdan o\'chirmoqchimisiz?')) return;
    await api.del(`/chat_rooms/${it.roomId}`).catch(() => {});
    if (channel === it.key) setChannel(tab === 'channels' ? 'Umumiy' : groupItems[0]?.key || '');
    await load();
  }

  async function addNew() {
    if (!newName.trim()) return;
    try {
      await api.post('/chat_rooms', {
        type: tab === 'channels' ? 'channel' : 'group',
        name: newName.trim(),
        icon: tab === 'channels' ? '#️⃣' : '👥',
        created_by: user.full_name,
        date: new Date().toISOString().slice(0, 10),
      });
      setChannel(newName.trim());
      setShowNew(false); setNewName('');
      await load();
    } catch (e) { alert(e.message); }
  }

  const displayChannel = tab === 'private'
    ? channel.replace('DM:', '').split(':').find(n => n !== user.full_name) || channel
    : channel;

  const msgCount = ch => (messages || []).filter(m => m.channel === ch).length;

  if (messages === null) return <Spinner />;

  return (
    <div className="card overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="flex h-full">
        {/* Chap panel */}
        <div className="w-64 shrink-0 border-r border-navy-100 bg-navy-50/30 flex flex-col">
          <div className="flex border-b border-navy-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearchQ(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition ${
                  tab === t.key ? 'text-gold-600 border-b-2 border-gold bg-white' : 'text-navy-400 hover:text-navy-600'}`}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          <div className="px-2 py-1.5 border-b border-navy-100">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-navy-300" />
              <input className="input !py-1 !pl-7 text-xs" placeholder="Qidirish..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filteredItems.map(it => {
              const on = channel === it.key;
              const locked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(it.key);
              const count = msgCount(it.key);
              return (
                <div key={it.key} role="button" tabIndex={0} onClick={() => setChannel(it.key)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChannel(it.key)}
                  className={`group w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition cursor-pointer ${
                    on ? 'bg-[#E9E9EB]' : 'hover:bg-navy-100/50'}`}>
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-white shadow-sm text-lg shrink-0">{it.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1c1c1e] truncate">{it.label || it.key}</div>
                    {it.role && <div className="text-[10px] text-navy-400 truncate">{it.role}</div>}
                    {it.teacher && <div className="text-[10px] text-navy-400 truncate">{it.teacher}</div>}
                  </div>
                  {locked && <Lock size={12} className="text-navy-300 shrink-0" />}
                  {count > 0 && (
                    <span className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0A84FF] text-white text-[9px] font-bold shrink-0">{count}</span>
                  )}
                  {isAdmin && it.roomId && (
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(it); }}
                      className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 shrink-0" title="O'chirish">
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {tab !== 'private' && (
            <div className="p-1.5 border-t border-navy-100">
              {showNew ? (
                <div className="p-1.5">
                  <input className="input !py-1 text-xs mb-1.5" placeholder="Nom..." autoFocus
                    value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNew()} />
                  <div className="flex gap-1">
                    <button onClick={() => setShowNew(false)} className="btn-ghost flex-1 text-[10px] !py-1">Bekor</button>
                    <button onClick={addNew} className="btn-gold flex-1 text-[10px] !py-1">Yaratish</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNew(true)}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 px-2 py-1.5 text-[10px] text-navy-500 hover:border-gold hover:text-gold-600 transition">
                  <Plus size={12} /> Yangi {tab === 'channels' ? 'kanal' : 'guruh'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2.5 border-b border-navy-100 flex items-center gap-3 bg-white/50">
            <div className="flex-1">
              <div className="font-bold text-navy-800">{displayChannel}</div>
              <div className="text-[10px] text-navy-400">{filtered.length} xabar · {members.length} a'zo</div>
            </div>
            {tab === 'groups' && isStaff && groups.some(g => g.name === channel) && (
              <button onClick={() => setShowCode(!showCode)} className="chip bg-gold/10 text-gold-700 hover:bg-gold/20 transition shrink-0" title="Taklif kodi">
                <KeyRound size={11} className="inline -mt-0.5 mr-1" />
                {showCode ? (groups.find(g => g.name === channel)?.invite_code || '—') : 'Kodni ko\'rsatish'}
              </button>
            )}
            {pinnedInChannel.length > 0 && (
              <button onClick={() => setPinnedOpen(!pinnedOpen)} className="chip bg-navy-50 text-navy-600 hover:bg-navy-100 transition shrink-0" title="Qadalgan xabarlar">
                <Pin size={11} className="inline -mt-0.5 mr-1" />
                {pinnedInChannel.length} ta {pinnedOpen ? <ChevronUp size={11} className="inline -mt-0.5" /> : <ChevronDown size={11} className="inline -mt-0.5" />}
              </button>
            )}
            <button onClick={() => setShowMembers(!showMembers)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition" title="A'zolar">
              <UserPlus size={16} />
            </button>
            {isAdmin && <span className="chip bg-gold/10 text-gold-700 text-[9px]">Moderator</span>}
          </div>

          {pinnedOpen && pinnedInChannel.length > 0 && (
            <div className="border-b border-navy-100 bg-amber-50/60 max-h-32 overflow-y-auto">
              {pinnedInChannel.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-amber-100/70 last:border-0">
                  <Pin size={11} className="text-amber-500 shrink-0" />
                  <span className="font-semibold text-navy-700 shrink-0">{m.sender}:</span>
                  <span className="text-navy-500 truncate flex-1">{m.text || (m.media_name || 'media')}</span>
                  <button onClick={() => togglePin(m)} className="text-navy-300 hover:text-red-500 shrink-0" title="Qadashni bekor qilish"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}

          {isLocked ? (
            <div className="flex-1 grid place-items-center p-6">
              <div className="max-w-sm w-full text-center animate-fade">
                <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gold-400/15 to-gold-100/5 text-gold-500 mb-4 mx-auto shadow-sm">
                  <Lock size={28} />
                </div>
                <h3 className="font-display text-xl text-navy-800 mb-1">"{channel}" guruhi yopiq</h3>
                <p className="text-sm text-navy-400 mb-5">Ushbu guruh chatiga kirish uchun o'qituvchingizdan taklif kodini so'rang va shu yerga kiriting.</p>
                <div className="flex gap-2">
                  <input className="input !py-2.5 text-center tracking-wider font-mono" placeholder="Taklif kodi..." value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinGroup()} />
                  <button onClick={joinGroup} disabled={!joinCode.trim() || joining} className="btn-gold shrink-0">
                    <KeyRound size={16} /> Kirish
                  </button>
                </div>
                {joinErr && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{joinErr}</div>}
              </div>
            </div>
          ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Xabarlar */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-white">
              {filtered.length === 0 ? (
                <div className="text-center text-navy-400 text-sm py-20">Hali xabar yo'q</div>
              ) : filtered.map((m, i) => {
                const isMe = m.sender === user.full_name;
                const isBot = m.sender === BOT_NAME;
                const mediaType = m.media_type;
                const prev = filtered[i - 1];
                const next = filtered[i + 1];
                const sameAsPrev = prev && prev.sender === m.sender;
                const sameAsNext = next && next.sender === m.sender;
                const showHeader = !sameAsPrev; // ism/vaqt faqat ketma-ket guruhning birinchi xabarida
                const mentionsMe = m.text && m.text.includes(`@${user.full_name}`);
                const groups = reactionGroups(m);
                return (
                  <div key={m.id} className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-3' : ''} animate-fade`}>
                    <div className="w-7 shrink-0">
                      {!sameAsNext && (
                        <div className={`grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br ${isBot ? 'from-violet-500 to-violet-700' : avatarColor(m.sender)} text-white text-[9px] font-bold`}>
                          {isBot ? '🤖' : m.sender?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={`max-w-[70%] relative ${isMe ? 'text-right' : ''}`}>
                      {showHeader && (
                        <div className={`flex items-center gap-1.5 mb-0.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-semibold text-navy-600">{isMe ? 'Siz' : m.sender}</span>
                          <span className="text-[9px] text-navy-300">{timeAgo(m.timestamp)}</span>
                          {m.pinned && <Pin size={9} className="text-amber-500" />}
                        </div>
                      )}

                      {/* Hover harakat paneli — Javob / Qadash / Reaksiya */}
                      <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 bg-white shadow-sm border border-navy-100 rounded-full px-1 py-0.5 z-10`}>
                        <button onClick={() => setReplyingTo({ id: m.id, sender: m.sender, text: m.text || m.media_name || 'media' })} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Javob berish"><Reply size={12} /></button>
                        <button onClick={() => togglePin(m)} className={`p-1 rounded-full hover:bg-navy-50 ${m.pinned ? 'text-amber-500' : 'text-navy-400'}`} title={m.pinned ? 'Qadashni bekor qilish' : 'Qadash'}><Pin size={12} /></button>
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Reaksiya"><SmilePlus size={12} /></button>
                      </div>
                      {reactionPickerFor === m.id && (
                        <div className={`absolute top-6 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-white shadow-md border border-navy-100 rounded-full px-1.5 py-1 z-20`}>
                          {QUICK_REACTIONS.map(e => (
                            <button key={e} onClick={() => toggleReaction(m, e)} className="text-base hover:scale-125 transition">{e}</button>
                          ))}
                        </div>
                      )}

                      {m.reply_to && (
                        <div className={`text-[11px] text-navy-400 border-l-2 border-navy-200 pl-1.5 mb-0.5 truncate max-w-[220px] ${isMe ? 'ml-auto' : ''}`}>
                          <span className="font-semibold text-navy-500">{m.reply_sender}:</span> {m.reply_snippet}
                        </div>
                      )}

                      {mediaType === 'image' ? (
                        <a href={api.fileUrl(m.media_url)} target="_blank" rel="noreferrer" className="inline-block overflow-hidden shadow-sm" style={{ borderRadius: 14 }}>
                          <img src={api.fileUrl(m.media_url)} alt={m.media_name || 'rasm'} className="max-w-[220px] max-h-[280px] object-cover block" />
                        </a>
                      ) : mediaType === 'audio' ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-2.5 ${isMe ? 'bg-[#0A84FF]' : 'bg-[#E9E9EB]'}`} style={{ borderRadius: 18 }}>
                          <Mic size={15} className={isMe ? 'text-white' : 'text-navy-500'} />
                          <audio controls src={api.fileUrl(m.media_url)} className="h-8" style={{ maxWidth: 200 }} />
                        </div>
                      ) : mediaType === 'video' ? (
                        <video controls src={api.fileUrl(m.media_url)} className="max-w-[240px] max-h-[280px] shadow-sm" style={{ borderRadius: 14 }} />
                      ) : mediaType === 'file' ? (
                        <a href={api.fileUrl(m.media_url)} target="_blank" rel="noreferrer"
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 ${isMe ? 'bg-[#0A84FF] text-white' : 'bg-[#E9E9EB] text-[#1c1c1e]'}`} style={{ borderRadius: 18 }}>
                          <FileText size={16} className="shrink-0" />
                          <span className="text-[13px] font-medium truncate max-w-[150px]">{m.media_name || 'Fayl'}</span>
                          <Download size={13} className="shrink-0 opacity-70" />
                        </a>
                      ) : (
                        <div className={`inline-block px-3.5 py-2 text-[14px] leading-snug ${
                          isBot ? 'bg-violet-50 text-violet-900 border border-violet-100' :
                          isMe ? 'bg-[#0A84FF] text-white' :
                          mentionsMe ? 'bg-amber-50 text-[#1c1c1e] border border-amber-200' :
                          'bg-[#E9E9EB] text-[#1c1c1e]'
                        }`}
                          style={{
                            borderRadius: 18,
                            borderBottomRightRadius: isMe && !sameAsNext ? 4 : 18,
                            borderTopRightRadius: isMe && sameAsPrev ? 4 : 18,
                            borderBottomLeftRadius: !isMe && !sameAsNext ? 4 : 18,
                            borderTopLeftRadius: !isMe && sameAsPrev ? 4 : 18,
                          }}
                        >{renderWithMentions(m.text, allUsers, user.full_name)}</div>
                      )}

                      {groups.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                          {groups.map(([emoji, senders]) => (
                            <button key={emoji} onClick={() => toggleReaction(m, emoji)}
                              className={`flex items-center gap-0.5 text-[11px] rounded-full px-1.5 py-0.5 border transition ${
                                senders.includes(user.full_name) ? 'bg-gold/10 border-gold/40' : 'bg-navy-50 border-navy-100 hover:bg-navy-100'
                              }`} title={senders.join(', ')}>
                              <span>{emoji}</span><span className="text-navy-500 font-semibold">{senders.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {botTyping && isBotChannel && (
                <div className="flex gap-2 mt-3 animate-fade">
                  <div className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-[9px] font-bold shrink-0">🤖</div>
                  <div className="inline-block px-4 py-3 bg-[#E9E9EB]" style={{ borderRadius: 18, borderBottomLeftRadius: 4 }}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* A'zolar paneli */}
            {showMembers && (
              <div className="w-56 border-l border-navy-100 bg-navy-50/20 flex flex-col">
                {/* Tab: A'zolar / Qo'shish */}
                <div className="flex border-b border-navy-100">
                  <button onClick={() => setShowAddMember(false)}
                    className={`flex-1 py-2 text-[10px] font-bold ${!showAddMember ? 'text-gold-600 border-b-2 border-gold' : 'text-navy-400'}`}>
                    A'zolar
                  </button>
                  {isAdmin && (
                    <button onClick={() => setShowAddMember(true)}
                      className={`flex-1 py-2 text-[10px] font-bold ${showAddMember ? 'text-gold-600 border-b-2 border-gold' : 'text-navy-400'}`}>
                      + Qo'shish
                    </button>
                  )}
                </div>

                {!showAddMember ? (
                  <div className="flex-1 overflow-y-auto p-2">
                    {/* Qo'shilgan a'zolar */}
                    {currentMembers.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[9px] font-bold text-gold-600 px-2 py-0.5">Qo'shilganlar ({currentMembers.length})</div>
                        {currentMembers.map(name => {
                          const u = allUsers.find(x => x.full_name === name);
                          return (
                            <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-navy-100/50 group">
                              <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(name)} text-white text-[7px] font-bold`}>{name[0]}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold text-navy-700 truncate">{name}</div>
                                <div className="text-[8px] text-navy-400">{u?.role_label || ''}</div>
                              </div>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {isAdmin && (
                                <button onClick={() => removeMember(name)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600" title="Chiqarish">
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Faol yozganlar */}
                    <div className="text-[9px] font-bold text-navy-500 px-2 py-0.5">Faol ({members.length})</div>
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-navy-100/50">
                        <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(m.full_name)} text-white text-[7px] font-bold`}>{m.full_name[0]}</div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-navy-700 truncate">{m.full_name}</div>
                          <div className="text-[8px] text-navy-400">{m.role_label}</div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-2">
                    <input className="input !py-1 text-xs mb-2" placeholder="Ism qidirish..."
                      value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                    <div className="space-y-0.5">
                      {availableUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-emerald-50 cursor-pointer transition"
                          onClick={() => addMember(u.full_name)}>
                          <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(u.full_name)} text-white text-[7px] font-bold`}>{u.full_name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-navy-700 truncate">{u.full_name}</div>
                            <div className="text-[8px] text-navy-400">{u.role_label}</div>
                          </div>
                          <Plus size={12} className="text-emerald-500 shrink-0" />
                        </div>
                      ))}
                      {availableUsers.length === 0 && (
                        <div className="text-center text-[10px] text-navy-400 py-4">Hamma qo'shilgan</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Input */}
          {!isLocked && (
          <div className="px-3 py-2.5 border-t border-navy-100 bg-white/90 backdrop-blur">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-navy-50 rounded-xl border-l-2 border-gold">
                <Reply size={13} className="text-navy-400 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-navy-600">{replyingTo.sender}:</span>{' '}
                  <span className="text-navy-400 truncate">{replyingTo.text}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-navy-300 hover:text-red-500 shrink-0"><X size={13} /></button>
              </div>
            )}

            {mentionSuggestions.length > 0 && !recorder && (
              <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-navy-50 rounded-xl">
                {mentionSuggestions.map(u => (
                  <button key={u.id} onClick={() => pickMention(u)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-navy-100 hover:border-gold text-xs transition">
                    <span className={`w-4 h-4 rounded-full grid place-items-center bg-gradient-to-br ${avatarColor(u.full_name)} text-white text-[7px] font-bold`}>{u.full_name[0]}</span>
                    {u.full_name}
                  </button>
                ))}
              </div>
            )}

            {showEmoji && !recorder && (
              <div className="flex flex-wrap gap-1 mb-2 p-2 bg-navy-50 rounded-2xl">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition">{e}</button>
                ))}
              </div>
            )}

            {recorder ? (
              <div className="flex items-center gap-3">
                {recorder.kind === 'video' && (
                  <video ref={videoRef} muted className="w-20 h-14 rounded-xl object-cover bg-navy-900 shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-sm font-semibold text-navy-700 tabular-nums">
                    {String(Math.floor(recorder.seconds / 60)).padStart(2, '0')}:{String(recorder.seconds % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-navy-400">{recorder.kind === 'video' ? 'Video yozilmoqda...' : 'Ovoz yozilmoqda...'}</span>
                </div>
                <button onClick={cancelRecording} className="grid place-items-center w-9 h-9 rounded-full hover:bg-red-50 text-red-500 transition shrink-0" title="Bekor qilish">
                  <Trash2 size={17} />
                </button>
                <button onClick={finishRecording} className="grid place-items-center w-9 h-9 rounded-full bg-[#0A84FF] text-white shadow-sm shrink-0" title="Yuborish">
                  <ArrowUp size={17} strokeWidth={2.5} />
                </button>
              </div>
            ) : uploadingMedia ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-navy-400">
                <div className="w-4 h-4 border-2 border-navy-300 border-t-[#0A84FF] rounded-full animate-spin" /> Yuborilmoqda...
              </div>
            ) : (
              <div className="flex gap-1 items-center">
                <button onClick={() => setShowEmoji(!showEmoji)} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Emoji">
                  <Smile size={19} />
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                <button onClick={() => fileRef.current?.click()} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Fayl yuklash">
                  <Paperclip size={18} />
                </button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <button onClick={() => imgRef.current?.click()} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Rasm yuklash">
                  <Image size={18} />
                </button>
                <input ref={inputRef}
                  className="flex-1 !rounded-full border border-navy-200 bg-[#F2F2F7] px-4 py-2 text-[14px] outline-none focus:border-[#0A84FF] focus:bg-white transition"
                  placeholder="Xabar..."
                  value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' || e.shiftKey) return;
                    e.preventDefault();
                    if (mentionSuggestions.length > 0) pickMention(mentionSuggestions[0]);
                    else send();
                  }} />
                {text.trim() ? (
                  <button onClick={() => send()} disabled={sending}
                    className="grid place-items-center w-8 h-8 rounded-full bg-[#0A84FF] text-white shadow-sm transition disabled:opacity-30 shrink-0">
                    <ArrowUp size={17} strokeWidth={2.5} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => startRecording('video')} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Video xabar">
                      <VideoIcon size={18} />
                    </button>
                    <button onClick={() => startRecording('audio')} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Ovozli xabar">
                      <Mic size={18} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
