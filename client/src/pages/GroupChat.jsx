import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Hash, Users, User, Search, Plus, Smile, Paperclip, Image, UserPlus, X, Lock, KeyRound } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { roleLabel, roleColor } from '../config/roles.js';

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
  const [customItems, setCustomItems] = useState({ channels: [], groups: [] });
  const [joinCode, setJoinCode] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = ['founder','director','super_admin','branch_manager','admin','academic_manager','head_teacher'].includes(user.role);
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);

  async function load() {
    const [msgs, users, gr, mem] = await Promise.all([
      api.get('/chat_messages').catch(() => []),
      api.get('/staff').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/group_memberships').catch(() => []),
    ]);
    setMessages(msgs || []);
    setAllUsers(users || []);
    setGroups(gr || []);
    setMemberships((mem || []).map(m => m.group_name));
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

  const items = useMemo(() => {
    if (tab === 'channels') return [...visibleChannels, ...customItems.channels];
    if (tab === 'groups') return [...groupItems, ...customItems.groups];
    return allUsers.filter(u2 => u2.full_name !== user.full_name)
      .map(u2 => ({ key: `DM:${[user.full_name, u2.full_name].sort().join(':')}`, icon: '👤', label: u2.full_name, role: u2.role_label }));
  }, [tab, allUsers, customItems, user, visibleChannels, groupItems]);

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

  // Kanal a'zolari
  const members = useMemo(() => {
    const senders = [...new Set(filtered.map(m => m.sender))];
    return allUsers.filter(u => senders.includes(u.full_name) || u.full_name === user.full_name);
  }, [filtered, allUsers, user]);

  async function send(extraText) {
    const msg = extraText || text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      await api.post('/chat_messages', {
        channel, sender: user.full_name, sender_role: user.role,
        text: msg,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });
      setText('');
      setShowEmoji(false);
      await load();
    } catch (e) { console.error(e); }
    setSending(false);
    inputRef.current?.focus();
  }

  function addEmoji(e) { setText(prev => prev + e); }

  const fileRef = useRef(null);
  const imgRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const size = (file.size / 1024).toFixed(0);
    send('📎 Fayl: ' + file.name + ' (' + size + ' KB)');
    e.target.value = '';
  }

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const size = (file.size / 1024).toFixed(0);
    send('🖼️ Rasm: ' + file.name + ' (' + size + ' KB)');
    e.target.value = '';
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

  function deleteItem(key) {
    if (!confirm('Rostdan o\'chirmoqchimisiz?')) return;
    setCustomItems(prev => ({
      ...prev,
      [tab]: prev[tab].filter(it => it.key !== key),
    }));
    if (channel === key) setChannel(tab === 'channels' ? 'Umumiy' : groupItems[0]?.key || '');
  }

  function addNew() {
    if (!newName.trim()) return;
    setCustomItems(prev => ({
      ...prev,
      [tab]: [...prev[tab], { key: newName.trim(), icon: tab === 'channels' ? '#️⃣' : '👥' }],
    }));
    setChannel(newName.trim());
    setShowNew(false); setNewName('');
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

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {filteredItems.map(it => {
              const on = channel === it.key;
              const locked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(it.key);
              return (
                <button key={it.key} onClick={() => setChannel(it.key)}
                  className={`group w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                    on ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-sm' : 'hover:bg-navy-100/60 text-navy-700'}`}>
                  <span className="text-sm">{it.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold truncate ${on ? 'text-white' : ''}`}>{it.label || it.key}</div>
                    {it.role && <div className={`text-[9px] ${on ? 'text-white/60' : 'text-navy-400'}`}>{it.role}</div>}
                    {it.teacher && <div className={`text-[9px] ${on ? 'text-white/60' : 'text-navy-400'}`}>{it.teacher}</div>}
                  </div>
                  {locked && <Lock size={11} className={on ? 'text-white/70' : 'text-navy-300'} />}
                  {msgCount(it.key) > 0 && <span className={`text-[8px] font-bold rounded-full px-1 ${on ? 'bg-white/20' : 'bg-gold/15 text-gold-700'}`}>{msgCount(it.key)}</span>}
                  {isAdmin && customItems[tab]?.some(c => c.key === it.key) && (
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(it.key); }}
                      className={`opacity-0 group-hover:opacity-100 text-[10px] ${on ? 'text-white/60 hover:text-white' : 'text-red-400 hover:text-red-600'}`} title="O'chirish">
                      <X size={12} />
                    </button>
                  )}
                </button>
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
            <button onClick={() => setShowMembers(!showMembers)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition" title="A'zolar">
              <UserPlus size={16} />
            </button>
            {isAdmin && <span className="chip bg-gold/10 text-gold-700 text-[9px]">Moderator</span>}
          </div>

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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gradient-to-b from-navy-50/20 to-white">
              {filtered.length === 0 ? (
                <div className="text-center text-navy-400 text-sm py-20">Hali xabar yo'q</div>
              ) : filtered.map(m => {
                const isMe = m.sender === user.full_name;
                const isFile = m.text?.startsWith('📎');
                const isImg = m.text?.startsWith('🖼️');
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} animate-fade`}>
                    <div className={`grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br ${avatarColor(m.sender)} text-white text-[9px] font-bold shrink-0`}>
                      {m.sender?.[0]?.toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-1 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] font-bold text-navy-700">{m.sender}</span>
                        <span className={`text-[8px] rounded-full px-1 ${roleColor(m.sender_role)}`}>{roleLabel(m.sender_role)}</span>
                        <span className="text-[9px] text-navy-300">{timeAgo(m.timestamp)}</span>
                      </div>
                      <div className={`inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        isFile ? 'bg-blue-50 border border-blue-200 text-blue-700 rounded-lg' :
                        isImg ? 'bg-violet-50 border border-violet-200 text-violet-700 rounded-lg' :
                        isMe ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white rounded-br-sm' :
                        'bg-white border border-navy-100 text-navy-800 rounded-bl-sm shadow-sm'
                      }`}>{m.text}</div>
                    </div>
                  </div>
                );
              })}
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
          <div className="px-3 py-2 border-t border-navy-100 bg-white">
            {showEmoji && (
              <div className="flex flex-wrap gap-1 mb-2 p-2 bg-navy-50 rounded-xl">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition">{e}</button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-50 text-navy-400 transition" title="Emoji">
                <Smile size={18} />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} className="grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-50 text-navy-400 transition" title="Fayl yuklash">
                <Paperclip size={18} />
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <button onClick={() => imgRef.current?.click()} className="grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-50 text-navy-400 transition" title="Rasm yuklash">
                <Image size={18} />
              </button>
              <input ref={inputRef} className="input !py-2 flex-1 !rounded-2xl text-sm" placeholder="Xabar..."
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())} />
              <button onClick={() => send()} disabled={!text.trim() || sending}
                className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md hover:shadow-lg transition disabled:opacity-30">
                <Send size={16} />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
