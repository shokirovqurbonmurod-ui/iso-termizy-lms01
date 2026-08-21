import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Hash, Users, User, Search, Plus, Smile, Paperclip, Image, UserPlus, X, Lock, KeyRound, Mic, Video as VideoIcon, Trash2, Download, FileText, Reply, Pin, SmilePlus, ChevronDown, ChevronUp, Crown, Copy, Bot, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCall } from '../hooks/useCall.js';
import CallOverlay from '../components/CallOverlay.jsx';
import { useGroupCall } from '../hooks/useGroupCall.js';
import GroupCallPanel from '../components/GroupCallPanel.jsx';

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

const EMOJIS = ['😊','👍','❤️','🔥','👏','💪','✅','⭐','🎉','😂','🙏','💯','📚','✍️','🏆','💡','🎓','👋','😍','🤔',
  '😁','🥳','😢','😮','🤝','👌','💥','🌟','🎊','🚀','☕','🍀','🎁','📌','⏰','💤','😴','🤗','😎','👑'];
const QUICK_REACTIONS = ['👍','❤️','😂','🔥','😮','🙏'];
const ROOM_ICONS = ['#️⃣','👥','📚','🎓','💬','🎯','🎨','⚽','🎵','🔬','🌟','🏆','🎮','💻','🇺🇸','🇰🇷','📝','🧮'];

const BOT_NAME = 'ISO Termizy AI';
const PREMIUM_PLANS = [
  { key: '1m', label: '1 oy', coins: 300 },
  { key: '3m', label: '3 oy', coins: 800, save: "11% chegirma" },
  { key: '6m', label: '6 oy', coins: 1500, save: "17% chegirma", popular: true },
  { key: '12m', label: '1 yil', coins: 2700, save: "25% chegirma" },
];

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

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
  const [whoReacted, setWhoReacted] = useState(null); // { msgId, emoji }
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [recorder, setRecorder] = useState(null); // { kind: 'audio'|'video', seconds }
  const [newIcon, setNewIcon] = useState(ROOM_ICONS[0]);
  const [customEmojis, setCustomEmojis] = useState([]);
  const [newEmojiInput, setNewEmojiInput] = useState('');
  const [premiumMembers, setPremiumMembers] = useState([]);
  const [showPremium, setShowPremium] = useState(false);
  const [buyingPremium, setBuyingPremium] = useState(false);
  const [premiumErr, setPremiumErr] = useState('');
  const [people, setPeople] = useState([]);
  const [chatBots, setChatBots] = useState([]);
  const [showAddBot, setShowAddBot] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotIcon, setNewBotIcon] = useState('🤖');
  const [newBotPersona, setNewBotPersona] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const isAdmin = ['founder','director','super_admin','branch_manager','admin','academic_manager','head_teacher'].includes(user.role);
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const myStudentRole = user.role === 'student';

  async function load() {
    const [msgs, users, gr, mem, rooms, emojis, premium, people, bots] = await Promise.all([
      api.get('/chat_messages').catch(() => []),
      api.get('/staff').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/group_memberships').catch(() => []),
      api.get('/chat_rooms').catch(() => []),
      api.get('/chat_custom_emojis').catch(() => []),
      api.get('/chat_premium').catch(() => []),
      api.get('/people').catch(() => []),
      api.get('/chat_bots').catch(() => []),
    ]);
    setMessages(msgs || []);
    setAllUsers(users || []);
    setGroups(gr || []);
    setMemberships((mem || []).map(m => m.group_name));
    setChatRooms(rooms || []);
    setCustomEmojis(emojis || []);
    setPremiumMembers(premium || []);
    setPeople(people || []);
    setChatBots(bots || []);
  }

  const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const isPremium = (name) => premiumMembers.some(p => p.student === name && p.expires_at > nowStr());
  const allEmojis = useMemo(() => [...EMOJIS, ...customEmojis.map(e => e.emoji).filter(Boolean)], [customEmojis]);
  const personByName = useMemo(() => {
    const map = {};
    for (const p of people) map[p.full_name] = p;
    return map;
  }, [people]);
  const avatarUrlFor = (name) => personByName[name]?.avatar_url || '';
  const bioFor = (name) => personByName[name]?.bio || '';

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

  // Kiruvchi qo'ng'iroq bannerida "Ochish" bosilganda (?dm=Ism) shu shaxsiy suhbatga o'tkazadi.
  useEffect(() => {
    const dm = searchParams.get('dm');
    if (!dm) return;
    setSearchParams({}, { replace: true });
    setTab('private');
    setChannel(`DM:${[user.full_name, dm].sort().join(':')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleChannels = useMemo(() =>
    DEF_CHANNELS.filter(c => !c.staffOnly || isStaff), [isStaff]);

  const groupItems = useMemo(() => groups.map(g => ({
    key: g.name, icon: '👥', teacher: g.teacher, id: g.id,
  })), [groups]);

  const botKey = useMemo(() => `DM:${[user.full_name, BOT_NAME].sort().join(':')}`, [user.full_name]);

  // Asosiy ISO Termizy AI + admin qo'shgan qo'shimcha botlar — barchasi "Shaxsiy" bo'limida DM sifatida chiqadi.
  const botEntries = useMemo(() => {
    const defaultBot = { key: botKey, icon: '🤖', label: BOT_NAME, role: 'AI yordamchi', isBot: true, persona: null, botId: null };
    const extra = chatBots.map((b) => ({
      key: `DM:${[user.full_name, b.name].sort().join(':')}`, icon: b.icon || '🤖', label: b.name,
      role: 'AI bot', isBot: true, persona: b.persona, botId: b.id,
    }));
    return [defaultBot, ...extra];
  }, [chatBots, botKey, user.full_name]);

  const customChannels = useMemo(() => chatRooms.filter(r => r.type === 'channel').map(r => ({ key: r.name, icon: r.icon || '#️⃣', roomId: r.id, inviteCode: r.invite_code, createdBy: r.created_by })), [chatRooms]);
  const customGroups = useMemo(() => chatRooms.filter(r => r.type === 'group').map(r => ({ key: r.name, icon: r.icon || '👥', roomId: r.id, inviteCode: r.invite_code, createdBy: r.created_by })), [chatRooms]);

  const items = useMemo(() => {
    if (tab === 'channels') return [...visibleChannels, ...customChannels];
    if (tab === 'groups') return [...groupItems, ...customGroups];
    const humans = allUsers.filter(u2 => u2.full_name !== user.full_name)
      .map(u2 => ({ key: `DM:${[user.full_name, u2.full_name].sort().join(':')}`, icon: '👤', label: u2.full_name, role: u2.role_label, avatarUrl: u2.avatar_url }));
    return [...botEntries, ...humans];
  }, [tab, allUsers, customChannels, customGroups, user, visibleChannels, groupItems, botEntries]);

  const activeBot = useMemo(() => botEntries.find((b) => b.key === channel), [botEntries, channel]);
  const isBotChannel = tab === 'private' && !!activeBot;
  const botIconByName = useMemo(() => {
    const map = {};
    for (const b of botEntries) map[b.label] = b.icon;
    return map;
  }, [botEntries]);

  const customGroupRoom = useMemo(() => chatRooms.find(r => r.type === 'group' && r.name === channel), [chatRooms, channel]);
  const isLocked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(channel)
    && customGroupRoom?.created_by !== user.full_name
    && (groups.some(g => g.name === channel) || !!customGroupRoom);
  const currentInviteCode = groups.find(g => g.name === channel)?.invite_code || customGroupRoom?.invite_code;

  // Guruh egasi (yaratuvchi) yoki u tayinlagan "guruh admin"i — shu guruh doirasida xabar
  // o'chirish/a'zolarni boshqarish huquqiga ega, lekin butun tizim admini emas.
  const isRoomOwner = !!customGroupRoom && customGroupRoom.created_by === user.full_name;
  const isRoomAdmin = isRoomOwner || (Array.isArray(customGroupRoom?.admins) && customGroupRoom.admins.includes(user.full_name));
  const canModerate = isAdmin || isRoomAdmin;

  async function toggleRoomAdmin(name) {
    if (!customGroupRoom) return;
    const currentlyAdmin = Array.isArray(customGroupRoom.admins) && customGroupRoom.admins.includes(name);
    try {
      if (currentlyAdmin) await api.del(`/chat_rooms/${customGroupRoom.id}/admins/${encodeURIComponent(name)}`);
      else await api.post(`/chat_rooms/${customGroupRoom.id}/admins`, { user_name: name });
      await load();
    } catch (e) { alert(e.message); }
  }

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
    const bot = activeBot;
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
      if (bot) {
        setBotTyping(true);
        const history = (messages || [])
          .filter((m) => m.channel === bot.key)
          .slice(-12)
          .map((m) => ({ role: m.sender === bot.label ? 'assistant' : 'user', text: m.text }));
        let reply = '';
        try {
          await api.aiChatStream({ message: msg, history, session: `chat-bot-${bot.botId || 'default'}-${user.full_name}`, persona: bot.persona || undefined }, (full) => { reply = full; });
        } catch (e) { reply = "Kechirasiz, hozir javob bera olmadim. Birozdan so'ng qayta urinib ko'ring."; }
        await api.post('/chat_messages', {
          channel: bot.key, sender: bot.label, sender_role: 'bot',
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

  const myPremiumActive = isPremium(user.full_name);

  async function buyPremium(planKey) {
    setPremiumErr(''); setBuyingPremium(planKey);
    try {
      await api.post('/chat-premium/buy', { plan: planKey });
      await load();
    } catch (e) { setPremiumErr(e.message); }
    setBuyingPremium(false);
  }

  async function deleteMessage(m) {
    if (!confirm("Xabarni o'chirmoqchimisiz?")) return;
    await api.del(`/chat_messages/${m.id}`).catch(() => {});
    if (m.media_url) {
      const filename = m.media_url.split('/').pop();
      await api.del(`/uploads/${filename}`).catch(() => {});
    }
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
      // Video xabarlar Telegramdek maksimum 2 daqiqa bilan cheklangan — vaqt tugaganda avtomatik yuboriladi.
      timerRef.current = setInterval(() => setRecorder((r) => {
        if (!r) return r;
        const next = r.seconds + 1;
        if (kind === 'video' && next >= 120) { setTimeout(() => finishRecording(), 0); return r; }
        return { ...r, seconds: next };
      }), 1000);
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
        icon: newIcon,
        created_by: user.full_name,
        date: new Date().toISOString().slice(0, 10),
        invite_code: genInviteCode(),
      });
      setChannel(newName.trim());
      setShowNew(false); setNewName(''); setNewIcon(ROOM_ICONS[0]);
      await load();
    } catch (e) { alert(e.message); }
  }

  const displayChannel = tab === 'private'
    ? channel.replace('DM:', '').split(':').find(n => n !== user.full_name) || channel
    : channel;

  // Qo'ng'iroq faqat shaxsiy (bot bo'lmagan) suhbatlarda mumkin.
  const callPeerName = (tab === 'private' && !isBotChannel && channel.startsWith('DM:')) ? displayChannel : null;
  const call = useCall({ channel, peerName: callPeerName, myName: user.full_name, enabled: !!callPeerName });
  const groupCallEnabled = (tab === 'channels' || tab === 'groups') && !isLocked;
  const groupCall = useGroupCall({ channel, myName: user.full_name, enabled: groupCallEnabled });

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
                  {it.avatarUrl ? (
                    <img src={api.fileUrl(it.avatarUrl)} alt={it.label} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0" />
                  ) : (
                    <span className="grid place-items-center w-10 h-10 rounded-full bg-white shadow-sm text-lg shrink-0">{it.icon}</span>
                  )}
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
                  {isAdmin && it.botId && (
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Botni o'chirmoqchimisiz?")) return;
                      await api.del(`/chat_bots/${it.botId}`).catch(() => {});
                      await load();
                    }} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 shrink-0" title="Botni o'chirish">
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
                  <div className="flex flex-wrap gap-1 mb-1.5 p-1.5 bg-navy-50 rounded-xl">
                    {ROOM_ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewIcon(ic)}
                        className={`grid place-items-center w-6 h-6 rounded-lg text-sm transition ${newIcon === ic ? 'bg-gold/20 ring-1 ring-gold' : 'hover:bg-white'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
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

          {tab === 'private' && isAdmin && (
            <div className="p-1.5 border-t border-navy-100">
              {showAddBot ? (
                <div className="p-1.5">
                  <div className="flex flex-wrap gap-1 mb-1.5 p-1.5 bg-navy-50 rounded-xl">
                    {['🤖','🧠','📖','✍️','🗣️','🎯','💡','🌟'].map(ic => (
                      <button key={ic} onClick={() => setNewBotIcon(ic)}
                        className={`grid place-items-center w-6 h-6 rounded-lg text-sm transition ${newBotIcon === ic ? 'bg-gold/20 ring-1 ring-gold' : 'hover:bg-white'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input className="input !py-1 text-xs mb-1.5" placeholder="Bot nomi..."
                    value={newBotName} onChange={e => setNewBotName(e.target.value)} />
                  <textarea className="input !py-1 text-xs mb-1.5 resize-none" rows={2} placeholder="Persona (masalan: Siz grammatikadan yordam beruvchi qat'iy o'qituvchisiz...)"
                    value={newBotPersona} onChange={e => setNewBotPersona(e.target.value)} />
                  <div className="flex gap-1">
                    <button onClick={() => setShowAddBot(false)} className="btn-ghost flex-1 text-[10px] !py-1">Bekor</button>
                    <button onClick={async () => {
                      if (!newBotName.trim()) return;
                      await api.post('/chat_bots', { name: newBotName.trim(), icon: newBotIcon, persona: newBotPersona.trim(), created_by: user.full_name, date: new Date().toISOString().slice(0, 10) }).catch((e) => alert(e.message));
                      setShowAddBot(false); setNewBotName(''); setNewBotPersona(''); setNewBotIcon('🤖');
                      await load();
                    }} className="btn-gold flex-1 text-[10px] !py-1">Yaratish</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddBot(true)}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 px-2 py-1.5 text-[10px] text-navy-500 hover:border-gold hover:text-gold-600 transition">
                  <Plus size={12} /> Yangi bot
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2.5 border-b border-navy-100 flex items-center gap-3 bg-white/50">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-800">{displayChannel}</div>
              {tab === 'private' && !isBotChannel && bioFor(displayChannel) ? (
                <div className="text-[10px] text-navy-400 truncate">{bioFor(displayChannel)}</div>
              ) : (
                <div className="text-[10px] text-navy-400">{filtered.length} xabar · {members.length} a'zo</div>
              )}
            </div>
            {tab === 'groups' && (isStaff || customGroupRoom?.created_by === user.full_name) && (groups.some(g => g.name === channel) || customGroupRoom) && (
              showCode ? (
                <button onClick={() => { navigator.clipboard?.writeText(currentInviteCode || ''); setShowCode(false); }}
                  className="chip bg-gold/10 text-gold-700 hover:bg-gold/20 transition shrink-0" title="Nusxalash">
                  <Copy size={11} className="inline -mt-0.5 mr-1" /> {currentInviteCode || '—'}
                </button>
              ) : (
                <button onClick={() => setShowCode(true)} className="chip bg-gold/10 text-gold-700 hover:bg-gold/20 transition shrink-0" title="Taklif kodi">
                  <KeyRound size={11} className="inline -mt-0.5 mr-1" /> Kodni ko'rsatish
                </button>
              )
            )}
            <button onClick={() => setShowPremium(true)} className="chip bg-gradient-to-r from-amber-400/20 to-yellow-300/20 text-amber-700 hover:from-amber-400/30 hover:to-yellow-300/30 transition shrink-0" title="Chat Premium">
              <Crown size={11} className="inline -mt-0.5 mr-1" /> Premium
            </button>
            {pinnedInChannel.length > 0 && (
              <button onClick={() => setPinnedOpen(!pinnedOpen)} className="chip bg-navy-50 text-navy-600 hover:bg-navy-100 transition shrink-0" title="Qadalgan xabarlar">
                <Pin size={11} className="inline -mt-0.5 mr-1" />
                {pinnedInChannel.length} ta {pinnedOpen ? <ChevronUp size={11} className="inline -mt-0.5" /> : <ChevronDown size={11} className="inline -mt-0.5" />}
              </button>
            )}
            {callPeerName && (
              <>
                <button onClick={() => call.startCall('audio')} disabled={call.callState !== 'idle'} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition disabled:opacity-30" title="Ovozli qo'ng'iroq">
                  <Phone size={16} />
                </button>
                <button onClick={() => call.startCall('video')} disabled={call.callState !== 'idle'} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition disabled:opacity-30" title="Video qo'ng'iroq">
                  <VideoIcon size={16} />
                </button>
              </>
            )}
            {groupCallEnabled && !groupCall.inCall && (
              <button onClick={() => groupCall.join('audio')} className="chip bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shrink-0" title="Guruh audio/video chat">
                <Phone size={11} className="inline -mt-0.5 mr-1" /> Video chat{groupCall.remoteCount > 0 ? ` (${groupCall.remoteCount})` : ''}
              </button>
            )}
            <button onClick={() => setShowMembers(!showMembers)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition" title="A'zolar">
              <UserPlus size={16} />
            </button>
            {isAdmin && <span className="chip bg-gold/10 text-gold-700 text-[9px]">Moderator</span>}
          </div>

          {groupCallEnabled && <GroupCallPanel call={groupCall} myName={user.full_name} />}

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
                const isBot = m.sender in botIconByName;
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
                        avatarUrlFor(m.sender) && !isBot ? (
                          <img src={api.fileUrl(avatarUrlFor(m.sender))} alt={m.sender} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className={`grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br ${isBot ? 'from-violet-500 to-violet-700' : avatarColor(m.sender)} text-white text-[9px] font-bold`}>
                            {isBot ? (botIconByName[m.sender] || '🤖') : m.sender?.[0]?.toUpperCase()}
                          </div>
                        )
                      )}
                    </div>
                    <div className={`max-w-[70%] relative ${isMe ? 'text-right' : ''}`}>
                      {showHeader && (
                        <div className={`flex items-center gap-1.5 mb-0.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-semibold text-navy-600">{isMe ? 'Siz' : m.sender}</span>
                          {isPremium(m.sender) && <Crown size={10} className="text-amber-500" title="Chat Premium" />}
                          <span className="text-[9px] text-navy-300">{timeAgo(m.timestamp)}</span>
                          {m.pinned && <Pin size={9} className="text-amber-500" />}
                        </div>
                      )}

                      {/* Hover harakat paneli — Javob / Qadash / Reaksiya */}
                      <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 bg-white shadow-sm border border-navy-100 rounded-full px-1 py-0.5 z-10`}>
                        <button onClick={() => setReplyingTo({ id: m.id, sender: m.sender, text: m.text || m.media_name || 'media' })} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Javob berish"><Reply size={12} /></button>
                        <button onClick={() => togglePin(m)} className={`p-1 rounded-full hover:bg-navy-50 ${m.pinned ? 'text-amber-500' : 'text-navy-400'}`} title={m.pinned ? 'Qadashni bekor qilish' : 'Qadash'}><Pin size={12} /></button>
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Reaksiya"><SmilePlus size={12} /></button>
                        {(isMe || isAdmin) && (
                          <button onClick={() => deleteMessage(m)} className="p-1 rounded-full hover:bg-red-50 text-navy-400 hover:text-red-500" title="O'chirish"><Trash2 size={12} /></button>
                        )}
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
                        <div className={`flex flex-wrap gap-1 mt-1 relative ${isMe ? 'justify-end' : ''}`}>
                          {groups.map(([emoji, senders]) => (
                            <div key={emoji} className="relative">
                              <button onClick={() => toggleReaction(m, emoji)}
                                onMouseEnter={() => setWhoReacted({ msgId: m.id, emoji })}
                                onMouseLeave={() => setWhoReacted((w) => (w?.msgId === m.id && w?.emoji === emoji ? null : w))}
                                className={`flex items-center gap-0.5 text-[11px] rounded-full px-1.5 py-0.5 border transition ${
                                  senders.includes(user.full_name) ? 'bg-gold/10 border-gold/40' : 'bg-navy-50 border-navy-100 hover:bg-navy-100'
                                }`}>
                                <span>{emoji}</span><span className="text-navy-500 font-semibold">{senders.length}</span>
                              </button>
                              {whoReacted?.msgId === m.id && whoReacted?.emoji === emoji && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 bg-navy-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                  {senders.join(', ')}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-800" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {botTyping && isBotChannel && (
                <div className="flex gap-2 mt-3 animate-fade">
                  <div className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-[9px] font-bold shrink-0">{activeBot?.icon || '🤖'}</div>
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
              <div className="mb-2 p-2 bg-navy-50 rounded-2xl">
                <div className="flex flex-wrap gap-1">
                  {allEmojis.map((e, i) => (
                    <button key={e + i} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition">{e}</button>
                  ))}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-navy-200/60">
                    <input value={newEmojiInput} onChange={(e) => setNewEmojiInput(e.target.value)}
                      placeholder="Yangi emoji qo'shish..." maxLength={8}
                      className="input !py-1 text-xs flex-1" />
                    <button onClick={async () => {
                      const emoji = newEmojiInput.trim();
                      if (!emoji) return;
                      await api.post('/chat_custom_emojis', { emoji, added_by: user.full_name, date: new Date().toISOString().slice(0, 10) }).catch((e2) => alert(e2.message));
                      setNewEmojiInput(''); await load();
                    }} className="btn-gold !py-1 !px-2.5 text-[10px] shrink-0">
                      <Plus size={12} className="inline -mt-0.5" /> Qo'shish
                    </button>
                  </div>
                )}
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

      <Modal open={showPremium} title="Chat Premium" onClose={() => setShowPremium(false)}>
        <div className="text-center">
          <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400/20 to-yellow-300/10 text-amber-500 mb-4 mx-auto shadow-sm">
            <Crown size={30} />
          </div>
          <h3 className="font-display text-lg text-navy-800 mb-1">Telegram Premiumga o'xshash imkoniyatlar</h3>
          <p className="text-sm text-navy-400 mb-5">Chatda alohida ajralib turing — tarifni tanlang.</p>
          <ul className="text-left text-sm text-navy-600 space-y-1.5 mb-5 bg-navy-50/60 rounded-2xl p-3.5">
            <li className="flex items-center gap-2"><Crown size={13} className="text-amber-500 shrink-0" /> Ism yonida oltin 👑 belgi — hamma ko'radi</li>
            <li className="flex items-center gap-2"><Smile size={13} className="text-amber-500 shrink-0" /> Emoji reaksiyalarda alohida ajralib turish</li>
            <li className="flex items-center gap-2"><Paperclip size={13} className="text-amber-500 shrink-0" /> Kattaroq fayl/media yuklash ustuvorligi</li>
            <li className="flex items-center gap-2"><Bot size={13} className="text-amber-500 shrink-0" /> ISO Termizy AI bilan cheklovsiz muloqot</li>
          </ul>
          {!myStudentRole ? (
            <p className="text-xs text-navy-400">Chat Premium faqat o'quvchi hisoblari uchun mavjud.</p>
          ) : myPremiumActive ? (
            <div className="text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl py-2.5">✅ Sizda Chat Premium faol</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {PREMIUM_PLANS.map((plan) => (
                  <button key={plan.key} onClick={() => buyPremium(plan.key)} disabled={!!buyingPremium}
                    className={`relative rounded-2xl border p-3 text-left transition disabled:opacity-40 ${
                      plan.popular ? 'border-gold bg-gold/5 hover:bg-gold/10' : 'border-navy-100 hover:border-gold/50 hover:bg-navy-50/60'
                    }`}>
                    {plan.popular && <span className="absolute -top-2 right-2 chip bg-gold text-white text-[8px] !px-1.5 !py-0.5">Mashhur</span>}
                    <div className="text-sm font-bold text-navy-800">{plan.label}</div>
                    <div className="text-xs text-gold-600 font-bold mt-0.5">{plan.coins} 🪙</div>
                    {plan.save && <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{plan.save}</div>}
                    {buyingPremium === plan.key && <div className="text-[10px] text-navy-400 mt-1">Sotib olinmoqda...</div>}
                  </button>
                ))}
              </div>
              {premiumErr && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{premiumErr}</div>}
            </>
          )}
        </div>
      </Modal>

      {callPeerName && <CallOverlay call={call} peerName={callPeerName} />}
    </div>
  );
}
