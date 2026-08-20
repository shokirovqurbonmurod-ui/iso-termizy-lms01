import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const empty = { period: '', score: 0, respondents: 0, date: new Date().toISOString().slice(0, 10) };

function npsTone(score) {
  if (score >= 50) return 'text-emerald-600';
  if (score >= 0) return 'text-amber-600';
  return 'text-red-500';
}

export default function NpsScoresPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get('/nps_scores?limit=500').catch(() => []);
    setRows((r || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  }
  useEffect(() => { load(); }, []);

  const latest = useMemo(() => rows?.[0], [rows]);

  function openAdd() { setForm(empty); setModal(true); }

  async function save() {
    if (!form.period.trim()) return;
    setSaving(true);
    try { await api.post('/nps_scores', { ...form, score: Number(form.score) || 0, respondents: Number(form.respondents) || 0 }); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={BarChart3} title="NPS ballari" subtitle="Ota-onalar va o'quvchilarning tavsiya darajasi (Net Promoter Score)"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Ball qo'shish</button>} />

      {latest && (
        <div className="card p-6 mb-6 max-w-xs text-center">
          <div className={`font-display text-5xl ${npsTone(latest.score)}`}>{latest.score >= 0 ? '+' : ''}{latest.score}</div>
          <div className="text-sm text-navy-400 mt-1">{latest.period} · {latest.respondents} javob</div>
        </div>
      )}

      {rows.length === 0 ? <Empty icon={BarChart3} title="NPS ma'lumoti yo'q" /> : (
        <div className="space-y-1.5 max-w-md">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5">
              <span className="text-sm font-semibold text-navy-800">{r.period}</span>
              <span className="text-xs text-navy-400">{r.respondents} javob</span>
              <span className={`font-bold ${npsTone(r.score)}`}>{r.score >= 0 ? '+' : ''}{r.score}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="NPS ball qo'shish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Davr</label>
        <input className="input !py-2.5 mb-4" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Masalan: 2026 Q3" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">NPS ball (-100..100)</label>
            <input className="input !py-2.5" type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
          </div>
          <div>
            <label className="label">Respondentlar</label>
            <input className="input !py-2.5" type="number" value={form.respondents} onChange={(e) => setForm({ ...form, respondents: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
