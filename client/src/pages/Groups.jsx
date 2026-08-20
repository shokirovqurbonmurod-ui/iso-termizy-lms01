import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus, Search, Pencil, Trash2, Download, Copy, Check, Users, MapPin, Clock, GraduationCap, TrendingUp, TrendingDown, Minus, Coins, Flame, CalendarDays, Wallet, Link2, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Modal, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import GroupAttendanceCalendar from './GroupAttendanceCalendar.jsx';

const cfg = RESOURCES.groups;

const LEVEL_COLOR = {
  Starter: 'bg-slate-100 text-slate-600', A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700', B2: 'bg-indigo-100 text-indigo-700', 'B2+': 'bg-violet-100 text-violet-700', C1: 'bg-gold/20 text-gold-700',
};

function attendanceFor(analytics, groupName) {
  return analytics.find((a) => a.group_name === groupName)
    || analytics.find((a) => groupName.startsWith(a.group_name) || a.group_name.startsWith(groupName));
}

const TREND_ICON = { yuqori: TrendingUp, "o'sish": TrendingUp, pasayish: TrendingDown, stabil: Minus };

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const readOnly = ['student', 'parent'].includes(user.role);

  const [groups, setGroups] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [modal, setModal] = useState(null); // {mode:'create'|'edit'}
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [detailId, setDetailId] = useState(null); // batafsil ko'rinish ochilgan guruh id
  const [calendarGroup, setCalendarGroup] = useState(null); // davomat kalendari ochilgan guruh
  const [groupMsg, setGroupMsg] = useState('');
  const [groupMsgSending, setGroupMsgSending] = useState(false);

  async function load() {
    setGroups(null);
    const [g, st, aa] = await Promise.all([
      api.get('/groups').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/attendance_analytics').catch(() => []),
    ]);
    setGroups(g || []);
    setStudents(st || []);
    setAttendance(aa || []);
  }
  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => {
    if (!groups) return [];
    return groups.map((g) => {
      const mine = students.filter((s) => s.group_name === g.name);
      const avgProgress = mine.length ? Math.round(mine.reduce((a, s) => a + (s.progress || 0), 0) / mine.length) : 0;
      const att = attendanceFor(attendance, g.name);
      return { ...g, actualCount: mine.length, avgProgress, attendance: att };
    });
  }, [groups, students, attendance]);

  const levels = useMemo(() => [...new Set((groups || []).map((g) => g.level).filter(Boolean))], [groups]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (levelFilter !== 'all') list = list.filter((g) => g.level === levelFilter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((g) => `${g.name} ${g.teacher} ${g.room}`.toLowerCase().includes(needle));
    }
    return list;
  }, [enriched, levelFilter, q]);

  const detailGroup = useMemo(() => enriched.find((g) => g.id === detailId) || null, [enriched, detailId]);
  const roster = useMemo(() => detailGroup ? students.filter((s) => s.group_name === detailGroup.name) : [], [students, detailGroup]);

  const totals = useMemo(() => ({
    groups: enriched.length,
    students: enriched.reduce((a, g) => a + g.actualCount, 0),
    fillPct: enriched.length ? Math.round(enriched.reduce((a, g) => a + Math.min(100, g.students_count ? (g.actualCount / g.students_count) * 100 : 0), 0) / enriched.length) : 0,
    avgAttendance: (() => {
      const withAtt = enriched.filter((g) => g.attendance);
      return withAtt.length ? Math.round(withAtt.reduce((a, g) => a + g.attendance.rate, 0) / withAtt.length) : null;
    })(),
  }), [enriched]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    setForm(init); setErr(''); setModal({ mode: 'create' });
  }
  function openEdit(g) {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = g[f.key] ?? ''; });
    setForm({ ...init, id: g.id }); setErr(''); setModal({ mode: 'edit' });
  }
  async function save() {
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      if (modal.mode === 'create') await api.post('/groups', payload);
      else await api.put(`/groups/${form.id}`, payload);
      setModal(null); load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(g) {
    if (!confirm(`"${g.name}" guruhini o'chirasizmi?`)) return;
    try { await api.del(`/groups/${g.id}`); load(); }
    catch (e) { alert(e.message); }
  }

  function randomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

  async function copyInviteLink(g) {
    let code = g.invite_code;
    if (!code) {
      code = randomCode();
      try { await api.put(`/groups/${g.id}`, { invite_code: code }); await load(); }
      catch { return; }
    }
    const link = `${window.location.origin}/app/group-chat?g=${encodeURIComponent(g.name)}&code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(g.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function sendGroupMessage() {
    if (!groupMsg.trim() || !detailGroup) return;
    setGroupMsgSending(true);
    try {
      await api.post('/bot/group-message', { group_name: detailGroup.name, text: groupMsg.trim() });
      setGroupMsg('');
    } catch (e) { alert(e.message); }
    setGroupMsgSending(false);
  }

  function exportCsv() {
    if (!filtered.length) return;
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ["Guruh,O'qituvchi,Daraja,Xona,Kunlar,O'quvchilar (haqiqiy/reja),Davomat %,Taklif kodi"];
    for (const g of filtered) lines.push([g.name, g.teacher, g.level, g.room, g.days, `${g.actualCount}/${g.students_count || 0}`, g.attendance?.rate ?? '', g.invite_code].map(escape).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guruhlar.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader icon={Boxes} title="Guruhlar" subtitle={groups ? `${totals.groups} ta guruh · ${totals.students} ta o'quvchi${totals.avgAttendance !== null ? ` · o'rtacha davomat ${totals.avgAttendance}%` : ''}` : '...'}
        actions={<>
          {groups && groups.length > 0 && (
            <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> Yuklab olish</button>
          )}
          {!readOnly && (
            <button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi guruh</button>
          )}
        </>}
      />

      {groups && groups.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            ['📦', 'Jami guruh', totals.groups, ''],
            ['👥', "Jami o'quvchi", totals.students, ''],
            ['📊', "O'rtacha to'ldirilganlik", totals.fillPct + '%', ''],
            ['✅', "O'rtacha davomat", totals.avgAttendance !== null ? totals.avgAttendance + '%' : '—', totals.avgAttendance >= 85 ? 'text-emerald-600' : ''],
          ].map(([ic, label, val, cls], i) => (
            <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="text-2xl mb-2">{ic}</div>
              <div className={`font-display text-2xl text-navy-800 ${cls}`}>{val}</div>
              <div className="text-sm text-navy-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="input pl-9" placeholder="Qidirish (guruh, o'qituvchi, xona)..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setLevelFilter('all')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${levelFilter === 'all' ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
            Barchasi
          </button>
          {levels.map((lv) => (
            <button key={lv} onClick={() => setLevelFilter(lv)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${levelFilter === lv ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
              {lv}
            </button>
          ))}
        </div>
        <span className="text-sm text-navy-400 ml-auto">{filtered.length} ta ko'rsatilmoqda</span>
      </div>

      {groups === null ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon={Boxes} title="Guruh topilmadi" hint={q ? "Qidiruv bo'yicha hech narsa topilmadi" : "\"Yangi guruh\" tugmasi orqali qo'shing"} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((g, idx) => {
            const capPct = g.students_count ? Math.min(100, Math.round((g.actualCount / g.students_count) * 100)) : null;
            const TrendIcon = g.attendance ? (TREND_ICON[g.attendance.trend] || Minus) : null;
            const isArchived = g.status === 'archived';
            return (
              <div key={g.id} onClick={() => setDetailId(g.id)}
                className={`card p-5 animate-fade cursor-pointer hover:-translate-y-0.5 transition-transform duration-150 ${isArchived ? 'opacity-60' : ''}`} style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg text-navy-800 truncate">{g.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`chip text-[10px] ${LEVEL_COLOR[g.level] || 'bg-navy-100 text-navy-600'}`}>{g.level || '—'}</span>
                      <span className={`chip text-[10px] ${isArchived ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{isArchived ? 'Arxiv' : 'Faol'}</span>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(g)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={14} /></button>
                      <button onClick={() => remove(g)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-navy-600 mb-4">
                  <div className="flex items-center gap-2"><GraduationCap size={14} className="text-navy-300 shrink-0" /> {g.teacher || '—'}</div>
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-navy-300 shrink-0" /> {g.room || '—'}</div>
                  <div className="flex items-center gap-2"><Clock size={14} className="text-navy-300 shrink-0" /> {g.days || '—'}</div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-navy-400 mb-1.5">
                    <span className="flex items-center gap-1"><Users size={12} /> O'quvchilar</span>
                    <span className="font-semibold text-navy-600">{g.actualCount}{g.students_count ? ` / ${g.students_count}` : ''}</span>
                  </div>
                  {capPct !== null && (
                    <div className="h-1.5 rounded-full bg-navy-100 overflow-hidden">
                      <div className={`h-full rounded-full ${capPct >= 90 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : capPct >= 60 ? 'bg-gradient-to-r from-gold-400 to-gold-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} style={{ width: `${capPct}%` }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-navy-50">
                  {g.attendance ? (
                    <span className={`chip text-[10px] flex items-center gap-1 ${g.attendance.rate >= 85 ? 'bg-emerald-100 text-emerald-700' : g.attendance.rate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {TrendIcon && <TrendIcon size={11} />} Davomat {g.attendance.rate}%
                    </span>
                  ) : <span className="text-[10px] text-navy-300">Davomat ma'lumoti yo'q</span>}

                  <button onClick={(e) => { e.stopPropagation(); copyInviteLink(g); }} className="flex items-center gap-1 text-[10px] font-bold text-navy-400 hover:text-gold-600 transition shrink-0">
                    {copiedId === g.id ? <><Check size={11} /> Nusxalandi</> : <><Link2 size={11} /> Link olish</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? 'Yangi guruh' : 'Guruhni tahrirlash'}
        onClose={() => setModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save}>Saqlash</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
              {f.type === 'select' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— tanlang —</option>
                  {f.options.map((o) => typeof o === 'object'
                    ? <option key={o.v} value={o.v}>{o.t}</option>
                    : <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input !py-2.5" type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!detailGroup} title={detailGroup?.name || ''} onClose={() => setDetailId(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setDetailId(null)}>Yopish</button>
          <button className="btn-gold" onClick={() => setCalendarGroup(detailGroup)}><CalendarDays size={16} /> Davomat kalendari</button>
        </>}
      >
        {detailGroup && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <DetailStat label="O'quvchilar" value={`${detailGroup.actualCount}${detailGroup.students_count ? `/${detailGroup.students_count}` : ''}`} />
              <DetailStat label="O'rtacha progress" value={`${detailGroup.avgProgress}%`} />
              <DetailStat label="Davomat" value={detailGroup.attendance ? `${detailGroup.attendance.rate}%` : '—'} />
              <DetailStat label="Xona" value={detailGroup.room || '—'} />
            </div>

            <div className="space-y-1.5 text-sm text-navy-600 mb-5">
              <div className="flex items-center gap-2"><GraduationCap size={14} className="text-navy-300 shrink-0" /> {detailGroup.teacher || '—'}</div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-navy-300 shrink-0" /> {detailGroup.days || '—'}</div>
            </div>

            <div className="rounded-xl bg-navy-50/60 px-3.5 py-3 mb-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600 mb-2">
                <Send size={12} />
                {detailGroup.telegram_chat_id ? (
                  <span className="text-emerald-600">Telegram ulangan — savol-javob/davomat shu mavzuga yuboriladi</span>
                ) : (
                  <span className="text-navy-400">Telegram ulanmagan — bot guruhga qo'shilib, topic ichida <code>/settopic {detailGroup.name}</code> yozing</span>
                )}
              </div>
              {detailGroup.telegram_chat_id && (
                <div className="flex items-center gap-2">
                  <input className="input !py-2 text-xs flex-1" placeholder="Guruhga xabar yuborish..." value={groupMsg}
                    onChange={(e) => setGroupMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGroupMessage()} />
                  <button onClick={sendGroupMessage} disabled={groupMsgSending || !groupMsg.trim()} className="btn-gold !py-2 !px-3 text-xs shrink-0">
                    {groupMsgSending ? '...' : <Send size={13} />}
                  </button>
                </div>
              )}
            </div>

            <div className="label mb-2">O'quvchilar ro'yxati ({roster.length}) <span className="font-normal normal-case text-navy-300">— balansini ko'rish uchun bosing</span></div>
            {roster.length === 0 ? (
              <p className="text-sm text-navy-400">Bu guruhda hali o'quvchi yo'q.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {roster.map((s) => (
                  <div key={s.id} onClick={() => navigate(`/app/students/${s.id}`)} className="flex items-center gap-2.5 rounded-xl bg-navy-50/60 px-3 py-2 cursor-pointer hover:bg-gold/5 transition">
                    <div className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(s.full_name || '?')[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-800 truncate">{s.full_name}</div>
                      <div className="text-[10px] text-navy-400">{s.level || '—'} · {s.progress || 0}% progress</div>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold shrink-0 ${(s.balance ?? 0) < 0 ? 'text-red-500' : 'text-navy-500'}`}><Wallet size={11} /> {(s.balance ?? 0).toLocaleString('en-US').replace(/,/g, ' ')}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gold-600 font-bold shrink-0"><Coins size={11} /> {s.coins ?? 0}</span>
                    <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold shrink-0"><Flame size={11} /> {s.streak ?? 0}</span>
                    <span className={`chip text-[9px] shrink-0 ${s.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{s.paid ? "To'langan" : 'Qarzdor'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {calendarGroup && (
        <GroupAttendanceCalendar
          group={calendarGroup}
          students={students.filter((s) => s.group_name === calendarGroup.name)}
          onClose={() => setCalendarGroup(null)}
        />
      )}
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-xl bg-navy-50/60 px-3 py-2.5 text-center">
      <div className="font-display text-lg text-navy-800">{value}</div>
      <div className="text-[10px] text-navy-400">{label}</div>
    </div>
  );
}
