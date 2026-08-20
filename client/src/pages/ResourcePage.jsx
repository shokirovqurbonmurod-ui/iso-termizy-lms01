import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Table, Banknote, QrCode, CheckCircle2, Download, Coins, Flame, TrendingUp, Upload, ArrowUp, ArrowDown, ArrowUpDown, CreditCard, Wallet, Landmark, Smartphone, UserCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { findItem } from '../config/menu.js';
import { PageHeader, Modal, Spinner, Empty } from '../components/ui.jsx';
import { money, statusStyle } from '../lib/format.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { downloadReceiptPdf } from '../lib/receipt.js';

export default function ResourcePage({ resourceKey, menuKey }) {
  const cfg = RESOURCES[resourceKey];
  const item = findItem(menuKey);
  const { user } = useAuth();
  const { t, tm } = useLang();
  const navigate = useNavigate();
  const readOnly = ['student', 'parent'].includes(user.role);

  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', data}
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState({});
  const [payStudent, setPayStudent] = useState(null); // {full_name, group_name} currently accepting payment
  const [saving, setSaving] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const needsGroups = cfg.fields.some((f) => f.type === 'group');
  const needsTeachers = cfg.fields.some((f) => f.type === 'teacher');
  const needsStudents = cfg.fields.some((f) => f.type === 'student');
  const PAYMENT_RESOURCES = ['students', 'payments'];
  const acceptsPayment = PAYMENT_RESOURCES.includes(resourceKey);
  function rowToPayTarget(row) {
    if (resourceKey === 'students') return { id: row.id, full_name: row.full_name, group_name: row.group_name };
    return { id: `payment-${row.id}`, full_name: row.student, group_name: row.group_name };
  }

  async function load() {
    setRows(null);
    try { setRows(await api.get(cfg.endpoint)); }
    catch { setRows([]); }
  }
  useEffect(() => { load(); setQ(''); setStatusFilter(''); setSort({ key: null, dir: 'asc' }); /* reload when resource changes */ }, [resourceKey]);

  // "Guruh" / "O'qituvchi" maydonlari erkin matn emas, haqiqiy ro'yxatdan tanlansin uchun.
  useEffect(() => {
    if (needsGroups) api.get('/groups').then((g) => setGroupOptions(g || [])).catch(() => setGroupOptions([]));
    if (needsTeachers) api.get('/teachers').then((t2) => setTeacherOptions(t2 || [])).catch(() => setTeacherOptions([]));
    if (needsStudents) api.get('/students').then((s2) => setStudentOptions(s2 || [])).catch(() => setStudentOptions([]));
  }, [needsGroups, needsTeachers, needsStudents]);

  // Status/badge ustuni bo'lsa, tez filtrlash uchun chiplar shu ustunga qarab avtomatik chiqadi.
  const filterCol = useMemo(() => cfg.columns.find((c) => c.type === 'status' || c.type === 'badge'), [cfg]);
  const filterCounts = useMemo(() => {
    if (!filterCol || !rows) return [];
    const counts = {};
    for (const r of rows) { const v = r[filterCol.key]; if (v) counts[v] = (counts[v] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows, filterCol]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    let list = rows;
    if (statusFilter && filterCol) list = list.filter((r) => r[filterCol.key] === statusFilter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(needle)));
    }
    if (sort.key) {
      list = [...list].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, q, statusFilter, filterCol, sort]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    setForm(init); setErr(''); setModal({ mode: 'create' });
  }
  function openEdit(row) {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = row[f.key] ?? ''; });
    setForm({ ...init, id: row.id }); setErr(''); setModal({ mode: 'edit' });
  }

  async function save() {
    if (saving) return; // ikki marta bosilganda ikkita bir xil yozuv yaratilishining oldini oladi
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`${t('required')}: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      if (modal.mode === 'create') await api.post(cfg.endpoint, payload);
      else await api.put(`${cfg.endpoint}/${form.id}`, payload);
      setModal(null); load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function handleFileUpload(field, e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading((u) => ({ ...u, [field]: true }));
    setErr('');
    try {
      const res = await api.upload(file);
      setForm((f) => ({ ...f, [field]: res.url, [`${field}_name`]: res.name }));
    } catch (e2) { setErr(e2.message); }
    finally { setUploading((u) => ({ ...u, [field]: false })); }
  }

  async function remove(row) {
    if (!confirm(`${t('del_confirm')}: "${row[cfg.columns[0].key]}"?`)) return;
    try { await api.del(`${cfg.endpoint}/${row.id}`); load(); }
    catch (e) { alert(e.message); }
  }

  function exportCsv() {
    if (!rows || !rows.length) return;
    const headers = cfg.columns.map((c) => c.label);
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    for (const row of filtered) lines.push(cfg.columns.map((c) => escape(row[c.key])).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${resourceKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const Icon = item?.icon || Table;

  return (
    <div>
      <PageHeader icon={Icon} title={tm(menuKey, cfg.title)} subtitle={`${t('total')}: ${rows ? rows.length : '...'} ${t('records')}`}
        actions={<>
          {rows && rows.length > 0 && (
            <button className="btn-ghost" onClick={exportCsv} title="Barchasini yuklab olish (CSV)">
              <Download size={16} /> Yuklab olish
            </button>
          )}
          {!readOnly && (
            <button className="btn-gold" onClick={openCreate}><Plus size={16} /> {t('add')}</button>
          )}
        </>}
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className="input pl-9" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {filterCounts.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setStatusFilter('')}
                className={`chip text-xs transition ${!statusFilter ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
                Barchasi ({rows.length})
              </button>
              {filterCounts.map(([val, count]) => (
                <button key={val} onClick={() => setStatusFilter(statusFilter === val ? '' : val)}
                  className={`chip text-xs transition ${statusFilter === val ? statusStyle(val) + ' ring-2 ring-offset-1 ring-gold/40' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
                  {val} ({count})
                </button>
              ))}
            </div>
          )}
          <span className="text-sm text-navy-400 ml-auto">{filtered.length} {t('showing')}</span>
        </div>

        {rows === null ? <Spinner /> : filtered.length === 0 ? (
          <Empty icon={Icon} title={t('no_data')} hint={q ? t('no_search') : "\"" + t('add') + "\""} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-navy-50/80 to-navy-50/40 border-b border-navy-100">
                  <th className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider whitespace-nowrap">#</th>
                  {cfg.columns.map((c) => (
                    <th key={c.key} onClick={() => toggleSort(c.key)}
                      className="px-4 py-3.5 font-bold text-navy-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gold-600 transition">
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sort.key === c.key ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-30" />}
                      </span>
                    </th>
                  ))}
                  {!readOnly && <th className="px-4 py-3.5 text-right font-bold text-navy-500 text-xs uppercase tracking-wider">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id}
                    onClick={() => acceptsPayment && !readOnly && setPayStudent(rowToPayTarget(row))}
                    className={`border-b border-navy-50/80 hover:bg-gold/[.02] transition-colors animate-fade ${acceptsPayment && !readOnly ? 'cursor-pointer' : ''}`}
                    style={{ animationDelay: `${idx * 20}ms` }}>
                    <td className="px-4 py-3.5 text-navy-300 font-mono text-xs">{idx + 1}</td>
                    {cfg.columns.map((c) => <td key={c.key} className="px-4 py-3.5 whitespace-nowrap"><Cell col={c} value={row[c.key]} /></td>)}
                    {!readOnly && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {resourceKey === 'students' && (
                            <button onClick={() => navigate(`/app/students/${row.id}`)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-gold/10 text-navy-400 hover:text-gold-600 transition" title="Batafsil profil"><UserCircle2 size={14} /></button>
                          )}
                          <button onClick={() => openEdit(row)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={14} /></button>
                          <button onClick={() => remove(row)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-500 transition" title="O'chirish"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? `Yangi: ${cfg.title}` : `Tahrirlash: ${cfg.title}`}
        onClose={() => setModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? '...' : t('save')}</button>
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
              ) : f.type === 'group' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— guruh tanlang —</option>
                  {groupOptions.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              ) : f.type === 'teacher' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— o'qituvchi tanlang —</option>
                  {teacherOptions.map((tc) => <option key={tc.id} value={tc.full_name}>{tc.full_name}</option>)}
                </select>
              ) : f.type === 'student' ? (
                <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">— o'quvchi tanlang —</option>
                  {studentOptions.map((s2) => <option key={s2.id} value={s2.full_name}>{s2.full_name} — {s2.group_name}</option>)}
                </select>
              ) : f.type === 'upload' ? (
                <div>
                  <input type="file" accept=".pdf,.epub,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp" className="hidden" id={`upload-${f.key}`}
                    onChange={(e) => handleFileUpload(f.key, e)} />
                  <label htmlFor={`upload-${f.key}`}
                    className="input !py-2.5 cursor-pointer flex items-center gap-2 text-navy-500 hover:border-gold transition">
                    <Upload size={14} />
                    {uploading[f.key] ? 'Yuklanmoqda...' : (form[f.key] ? (form[`${f.key}_name`] || "Fayl yuklandi ✓") : 'Fayl tanlang...')}
                  </label>
                </div>
              ) : (
                <input
                  className="input !py-2.5"
                  type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || f.label + '...'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>

      {acceptsPayment && payStudent && (
        <StudentPaymentModal student={payStudent} onClose={() => { setPayStudent(null); load(); }} />
      )}
    </div>
  );
}

const PAYMENT_METHODS = [
  { key: 'Naqd', icon: Banknote },
  { key: 'Visa', icon: CreditCard },
  { key: 'Plastik karta', icon: CreditCard },
  { key: 'Alif', icon: Smartphone },
  { key: 'Payme', icon: Smartphone },
  { key: 'Click', icon: Smartphone },
  { key: 'Xazna', icon: Landmark },
  { key: 'Uzum', icon: Wallet },
  { key: 'Uzum Nasiya', icon: Wallet },
  { key: 'Paynet', icon: QrCode },
];
const CASH_METHODS = ['Naqd', 'Xazna'];

function paymentMethodIcon(m) { return PAYMENT_METHODS.find((p) => p.key === m)?.icon || Banknote; }

function StudentPaymentModal({ student, onClose }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Naqd');
  const [cardNumber, setCardNumber] = useState('');
  const [history, setHistory] = useState(null);
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);

  async function loadHistory() {
    try {
      const [all, students] = await Promise.all([api.get('/payments'), api.get('/students').catch(() => [])]);
      setHistory(all.filter((p) => p.student === student.full_name));
      setProfile((students || []).find((s) => s.full_name === student.full_name) || null);
    } catch { setHistory([]); }
  }
  useEffect(() => { loadHistory(); }, [student.id]);

  async function submit() {
    setErr(''); setLastPayment(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr("To'g'ri summa kiriting"); return; }
    if (amt < 1000 && !confirm(`Summa juda kichik (${amt} so'm) — noto'g'ri kiritilmadimi? Shu summa bilan davom etasizmi?`)) return;
    setSaving(true);
    try {
      const created = await api.post('/payments', {
        student: student.full_name,
        group_name: student.group_name || '',
        amount: amt,
        date: new Date().toISOString().slice(0, 10),
        method,
        status: 'paid',
        card_number: CASH_METHODS.includes(method) ? '' : cardNumber.trim(),
      });
      setAmount(''); setCardNumber('');
      setLastPayment(created);
      await loadHistory();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const initials = student.full_name?.[0]?.toUpperCase() || '?';

  return (
    <Modal open title={`O'quvchi profili — ${student.full_name}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Yopish</button>
        <button className="btn-gold" onClick={submit} disabled={saving}><CheckCircle2 size={16} /> To'lovni qabul qilish</button>
      </>}
    >
      <div className="flex items-center gap-4 mb-5 rounded-2xl bg-gradient-to-br from-navy-50 to-white border border-navy-100 p-4">
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xl font-bold shadow">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg text-navy-800 truncate">{student.full_name}</div>
          <div className="text-xs text-navy-400">{profile?.group_name || student.group_name || '—'}</div>
        </div>
        {profile && (
          <div className="flex gap-4 text-center">
            <div>
              <div className="flex items-center gap-1 justify-center text-gold-600 font-bold"><Coins size={13} /> {profile.coins ?? 0}</div>
              <div className="text-[10px] text-navy-400">Coin</div>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-center text-blue-600 font-bold"><TrendingUp size={13} /> {profile.points ?? 0}</div>
              <div className="text-[10px] text-navy-400">Ball</div>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-center text-rose-600 font-bold"><Flame size={13} /> {profile.streak ?? 0}</div>
              <div className="text-[10px] text-navy-400">Streak</div>
            </div>
          </div>
        )}
      </div>

      {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}

      {lastPayment && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center justify-between gap-3 animate-fade">
          <span className="text-sm text-emerald-700 font-semibold">✅ To'lov qabul qilindi — {money(lastPayment.amount)}</span>
          <button onClick={() => downloadReceiptPdf(lastPayment, profile || student)} className="btn-gold !py-1.5 !px-3 text-xs shrink-0">
            <Download size={13} /> Chek (PDF)
          </button>
        </div>
      )}

      <div className="mb-4">
        <label className="label">To'lov summasi</label>
        <input className="input !py-2.5" type="number" placeholder="Summani kiriting"
          value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()} />
      </div>

      <div className="mb-5">
        <label className="label">To'lov usuli</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold text-center transition ${method === m.key ? 'border-gold bg-gold/10 text-gold-700' : 'border-navy-100 text-navy-500 hover:bg-navy-50'}`}>
                <Icon size={16} /> {m.key}
              </button>
            );
          })}
        </div>
        {!CASH_METHODS.includes(method) && (
          <input className="input !py-2.5 mt-3 font-mono" placeholder="Karta/tranzaksiya raqami (ixtiyoriy)"
            value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} maxLength={25} />
        )}
      </div>

      <div>
        <div className="label mb-2">To'lovlar tarixi</div>
        {history === null ? <Spinner /> : history.length === 0 ? (
          <div className="text-sm text-navy-400">To'lovlar yo'q</div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm">
                <span className="font-bold text-navy-800 tabular-nums">{money(p.amount)}</span>
                <span className="text-navy-400 text-xs">{p.date}</span>
                {p.card_number && <span className="text-navy-400 text-xs font-mono">💳 {p.card_number}</span>}
                <span className={`chip shrink-0 ${CASH_METHODS.includes(p.method) ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {(() => { const Icon = paymentMethodIcon(p.method); return <Icon size={12} className="inline -mt-0.5 mr-1" />; })()}
                  {p.method || 'Naqd'}
                </span>
                <button onClick={() => downloadReceiptPdf(p, profile || student)} className="grid place-items-center w-7 h-7 rounded-lg hover:bg-gold/10 text-navy-400 hover:text-gold-600 transition shrink-0" title="Chek (PDF)">
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Cell({ col, value }) {
  const t = col.type;
  if (t === 'money') return <span className="font-bold text-navy-800 tabular-nums">{money(value)}</span>;
  if (t === 'badge') return <span className="chip bg-gradient-to-r from-navy-100 to-navy-50 text-navy-600 shadow-sm">{value || '—'}</span>;
  if (t === 'status') return <span className={`chip shadow-sm ${statusStyle(value)}`}>{value || '—'}</span>;
  if (t === 'check') return value ? <span className="chip bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 shadow-sm">✓ Ha</span> : <span className="chip bg-red-50 text-red-400">✕ Yo'q</span>;
  if (t === 'number') return <span className="tabular-nums font-semibold text-navy-700">{value ?? 0}</span>;
  if (t === 'link') return value ? <a href={api.fileUrl(value)} target="_blank" rel="noreferrer" className="chip bg-blue-100 text-blue-700 hover:bg-blue-200 transition" onClick={(e)=>e.stopPropagation()}>📎 Ochish</a> : <span className="text-navy-300 text-xs">—</span>;
  if (t === 'download') return value ? <a href={api.fileUrl(value)} download className="chip bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition" onClick={(e)=>e.stopPropagation()}>⬇️ Yuklab olish</a> : <span className="text-navy-300 text-xs">—</span>;
  if (t === 'progress') return (
    <div className="flex items-center gap-2.5 w-32">
      <div className="flex-1 h-2 rounded-full bg-navy-100 overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all" style={{ width: `${Math.min(100, value || 0)}%` }} />
      </div>
      <span className="text-xs text-navy-500 tabular-nums font-semibold w-8">{value || 0}%</span>
    </div>
  );
  return <span className="text-navy-700">{value || '—'}</span>;
}
