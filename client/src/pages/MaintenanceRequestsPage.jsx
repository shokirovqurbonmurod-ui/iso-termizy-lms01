import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const empty = { location: '', issue: '', date: new Date().toISOString().slice(0, 10), status: 'open' };

export default function MaintenanceRequestsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/maintenance_requests?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const open = useMemo(() => (rows || []).filter((r) => r.status !== 'done'), [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.issue.trim()) return;
    setSaving(true);
    try { await api.post('/maintenance_requests', { ...form, reported_by: user?.full_name || '' }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function markDone(row) {
    await api.put(`/maintenance_requests/${row.id}`, { status: 'done' }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={AlertTriangle} title="Ta'mir so'rovlari" subtitle={`${open.length} ta hal qilinmagan`}
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> So'rov qo'shish</button>} />

      {rows.length === 0 ? <Empty icon={AlertTriangle} title="So'rov yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.location}</div>
                <div className="text-xs text-navy-600">{r.issue}</div>
                <div className="text-[11px] text-navy-400">{r.reported_by && `${r.reported_by} · `}{r.date}</div>
              </div>
              {r.status !== 'done'
                ? <button onClick={() => markDone(r)} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><Check size={13} /> Bajarildi</button>
                : <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 shrink-0">bajarildi</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Ta'mir so'rovi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">Joylashuv (xona/hudud)</label>
        <input className="input !py-2.5 mb-4" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <label className="label">Muammo</label>
        <textarea className="input !py-2.5" rows={3} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
      </Modal>
    </div>
  );
}
