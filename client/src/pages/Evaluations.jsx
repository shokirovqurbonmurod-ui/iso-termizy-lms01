import { useEffect, useMemo, useState } from 'react';
import { Medal, Plus, Trophy, TrendingDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';

const cfg = RESOURCES.evaluations;

function scoreColor(score) {
  if (score >= 90) return 'from-emerald-400 to-emerald-500';
  if (score >= 70) return 'from-gold-400 to-gold-500';
  return 'from-red-400 to-red-500';
}

export default function Evaluations() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() { setRows(await api.get('/evaluations').catch(() => [])); }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows || !rows.length) return null;
    const avg = Math.round(rows.reduce((a, r) => a + (Number(r.score) || 0), 0) / rows.length);
    const sorted = [...rows].sort((a, b) => (b.score || 0) - (a.score || 0));
    return { avg, best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [rows]);

  function openCreate() {
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    setForm(init); setErr(''); setModal(true);
  }

  async function save() {
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      await api.post(cfg.endpoint, payload); setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (!rows) return <Spinner />;
  const sorted = [...rows].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div>
      <PageHeader icon={Medal} title="Xodim baho" subtitle={`${rows.length} ta baholash${stats ? ` · o'rtacha ${stats.avg} ball` : ''}`}
        actions={<button className="btn-gold" onClick={openCreate}><Plus size={16} /> Yangi baholash</button>} />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card stat-glow p-5">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-display text-2xl text-navy-800">{stats.avg}</div>
            <div className="text-sm text-navy-400">O'rtacha ball</div>
          </div>
          <div className="card stat-glow p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2"><Trophy size={20} /></div>
            <div className="font-display text-lg text-navy-800 truncate">{stats.best.staff}</div>
            <div className="text-sm text-navy-400">Eng yuqori — {stats.best.score} ball</div>
          </div>
          <div className="card stat-glow p-5">
            <div className="flex items-center gap-2 text-red-500 mb-2"><TrendingDown size={20} /></div>
            <div className="font-display text-lg text-navy-800 truncate">{stats.worst.staff}</div>
            <div className="text-sm text-navy-400">E'tibor talab — {stats.worst.score} ball</div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-display text-lg text-navy-800 mb-4">🏆 Reyting</h3>
        {sorted.length === 0 ? <Empty icon={Medal} title="Baholash yo'q" /> : (
          <div className="space-y-3">
            {sorted.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <div className="w-7 text-center font-display text-navy-400 text-sm shrink-0">{i + 1}</div>
                <div className="w-40 shrink-0 text-sm font-semibold text-navy-700 truncate">{r.staff}</div>
                <div className="flex-1 h-6 rounded-lg bg-navy-50 overflow-hidden">
                  <div className={`h-full rounded-lg bg-gradient-to-r ${scoreColor(r.score)} flex items-center justify-end px-2`} style={{ width: `${Math.max(6, r.score)}%` }}>
                    <span className="text-[10px] font-bold text-white">{r.score}</span>
                  </div>
                </div>
                <div className="w-20 shrink-0 text-[11px] text-navy-400">{r.period}</div>
                {r.note && <div className="w-48 shrink-0 text-[11px] text-navy-400 truncate italic" title={r.note}>{r.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} title="Yangi baholash" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</label>
              <input className="input !py-2.5" type={f.type === 'number' ? 'number' : 'text'}
                placeholder={f.placeholder || f.label + '...'} value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
