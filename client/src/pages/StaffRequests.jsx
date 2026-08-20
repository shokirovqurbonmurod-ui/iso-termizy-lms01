import { useEffect, useState } from 'react';
import { Wallet, Receipt, Plus, Check, X, Paperclip } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { money } from '../lib/format.js';

const STATUS_STYLE = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600' };
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };

export default function StaffRequests({ kind }) {
  const { user } = useAuth();
  const isExpense = kind === 'expense';
  const canDecide = ['founder', 'director', 'super_admin', 'admin', 'branch_manager', 'hr'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ amount: '', reason: '', file: null });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  async function load() { setRows(await api.get(`/staff-requests/${kind}`).catch(() => [])); }
  useEffect(() => { load(); }, [kind]);

  function openRequest() {
    setForm({ amount: '', reason: '', file: null }); setErr(''); setModal(true);
  }

  async function submit() {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setErr("Summani to'g'ri kiriting"); return; }
    setSaving(true);
    try {
      let receipt_url = null;
      if (form.file) {
        const up = await api.upload(form.file);
        receipt_url = up.url;
      }
      await api.post(`/staff-requests/${kind}`, { amount: amt, reason: form.reason, receipt_url });
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function decide(row, status) {
    setDecidingId(row.id);
    try { await api.put(`/staff-requests/${kind}/${row.id}/decide`, { status }); await load(); }
    catch (e) { alert(e.message); }
    setDecidingId(null);
  }

  if (rows === null) return <Spinner />;
  const pending = rows.filter((r) => r.status === 'pending');
  const decided = rows.filter((r) => r.status !== 'pending');
  const Icon = isExpense ? Receipt : Wallet;
  const title = isExpense ? 'Xarajat hisoboti' : 'Avans so\'rash';

  return (
    <div>
      <PageHeader icon={Icon} title={title}
        subtitle={isExpense ? "Ishlab chiqarish xarajatlarini qoplash so'rovlari" : "Oylikdan avans olish so'rovlari"}
        actions={<button className="btn-gold" onClick={openRequest}><Plus size={16} /> Yangi so'rov</button>} />

      <div className="card p-5 mb-6">
        <h3 className="font-display text-lg text-navy-800 mb-4">Kutilayotgan so'rovlar ({pending.length})</h3>
        {pending.length === 0 ? <Empty icon={Icon} title="Kutilayotgan so'rov yo'q" /> : (
          <div className="space-y-2">
            {pending.map((row) => (
              <div key={row.id} className="rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="text-sm font-bold text-navy-800">{row.staff} — {money(row.amount)}</div>
                  <span className={`chip text-[10px] ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                </div>
                <div className="text-xs text-navy-500 mb-2">{row.date} {row.reason && `· ${row.reason}`}
                  {row.receipt_url && <a href={api.fileUrl(row.receipt_url)} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline ml-2"><Paperclip size={11} className="inline -mt-0.5" /> chek</a>}
                </div>
                {canDecide && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => decide(row, 'approved')} disabled={decidingId === row.id} className="btn-gold !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Tasdiqlash</button>
                    <button onClick={() => decide(row, 'rejected')} disabled={decidingId === row.id} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0 !border-red-200 !text-red-500"><X size={13} /> Rad etish</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4">Tarix</h3>
        {decided.length === 0 ? <p className="text-sm text-navy-400">Hali qaror qabul qilinmagan</p> : (
          <div className="space-y-1.5">
            {decided.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/60 px-3 py-2">
                <span className="text-navy-700">{row.staff} — {money(row.amount)} ({row.date})</span>
                <span className={`chip text-[9px] shrink-0 ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} title={`Yangi ${title.toLowerCase()} so'rovi`} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submit} disabled={saving}>{saving ? 'Yuborilmoqda...' : "So'rov yuborish"}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <label className="label">Summa (so'm)</label>
        <input className="input !py-2.5 mb-4" type="number" onWheel={(e) => e.target.blur()} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <label className="label">Sabab</label>
        <textarea className="input !py-2.5 mb-4" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        {isExpense && (
          <>
            <label className="label">Chek/hujjat (ixtiyoriy)</label>
            <input type="file" className="input !py-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
          </>
        )}
      </Modal>
    </div>
  );
}
