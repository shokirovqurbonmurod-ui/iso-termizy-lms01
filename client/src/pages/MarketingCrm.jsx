import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, Target, Phone, Megaphone, ArrowRight, CalendarClock, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { money, compactMoney, statusStyle } from '../lib/format.js';

const STAGES = ['Qiziqish', 'Demo dars', 'Shartnoma', "To'lov"];
const SOURCE_COLOR = { Instagram: 'bg-pink-400', Telegram: 'bg-sky-400', Facebook: 'bg-blue-500', Tavsiya: 'bg-emerald-400' };

// Har bir "+ Qo'shish" tugmasi shu resurslardan birini ochadi — maydonlar resources.js dan olinadi.
const ADD_TYPES = {
  leads: 'Yangi lid',
  sales_pipeline: 'Yangi bitim',
  follow_ups: 'Yangi follow-up',
  campaigns: 'Yangi kampaniya',
};

export default function MarketingCrm() {
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null); // {type: 'leads'|'sales_pipeline'|'follow_ups'|'campaigns'}
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [leads, pipeline, followUps, campaigns, waiting] = await Promise.all([
      api.get('/leads').catch(() => []),
      api.get('/sales_pipeline').catch(() => []),
      api.get('/follow_ups').catch(() => []),
      api.get('/campaigns').catch(() => []),
      api.get('/waiting_list').catch(() => []),
    ]);
    setD({ leads: leads || [], pipeline: pipeline || [], followUps: followUps || [], campaigns: campaigns || [], waiting: waiting || [] });
  }
  useEffect(() => { load(); }, []);

  function openCreate(type) {
    const cfg = RESOURCES[type];
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    setForm(init); setErr(''); setModal({ type });
  }

  async function save() {
    const cfg = RESOURCES[modal.type];
    const required = cfg.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim());
    if (required.length) { setErr(`To'ldirish shart: ${required.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      cfg.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0; });
      await api.post(cfg.endpoint, payload);
      setModal(null);
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  const stats = useMemo(() => {
    if (!d) return null;
    const activeValue = d.pipeline.filter((p) => p.status === 'active').reduce((a, p) => a + (Number(p.value) || 0), 0);
    const won = d.leads.filter((l) => l.status === 'won').length;
    const lost = d.leads.filter((l) => l.status === 'lost').length;
    const decided = won + lost;
    const conversion = decided ? Math.round((won / decided) * 100) : 0;
    const pendingFollowUps = d.followUps.filter((f) => f.status !== 'done');
    return { activeValue, conversion, pendingFollowUps, won };
  }, [d]);

  const bySource = useMemo(() => {
    if (!d) return [];
    const counts = {};
    for (const l of d.leads) counts[l.source] = (counts[l.source] || 0) + 1;
    const total = d.leads.length || 1;
    return Object.entries(counts).map(([source, count]) => ({ source, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [d]);

  if (!d || !stats) return <Spinner />;

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Marketing CRM" subtitle={`${d.leads.length} ta lid · ${d.pipeline.filter((p) => p.status === 'active').length} ta faol bitim · ${d.waiting.length} ta kutish ro'yxatida`}
        actions={<button className="btn-gold" onClick={() => openCreate('leads')}><Plus size={16} /> Yangi lid</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          [Users, 'Jami lidlar', d.leads.length, 'gold'],
          [Target, 'Faol pipeline qiymati', compactMoney(stats.activeValue), 'blue'],
          [TrendingUp, 'Konversiya', stats.conversion + '%', 'green'],
          [Phone, 'Kutilayotgan follow-up', stats.pendingFollowUps.length, 'rose'],
        ].map(([Icon, label, val, tone], i) => (
          <div key={label} className="card stat-glow p-5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`grid place-items-center w-11 h-11 rounded-2xl mb-3 bg-gradient-to-br ${
              tone === 'gold' ? 'from-gold-400/20 to-gold-100/10 text-gold-600' :
              tone === 'blue' ? 'from-blue-400/20 to-blue-100/10 text-blue-600' :
              tone === 'green' ? 'from-emerald-400/20 to-emerald-100/10 text-emerald-600' :
              'from-rose-400/20 to-rose-100/10 text-rose-600'}`}>
              <Icon size={20} />
            </div>
            <div className="font-display text-2xl text-navy-800">{val}</div>
            <div className="text-sm text-navy-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Sales pipeline — kanban */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Target size={18} className="text-gold" /> Sales Pipeline</h3>
          <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('sales_pipeline')}><Plus size={13} /> Yangi bitim</button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAGES.map((stage, si) => {
            const deals = d.pipeline.filter((p) => p.stage === stage);
            const stageValue = deals.reduce((a, p) => a + (Number(p.value) || 0), 0);
            return (
              <div key={stage} className="rounded-2xl bg-navy-50/50 p-3 min-h-[120px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy-600">
                    {si > 0 && <ArrowRight size={11} className="text-navy-300" />} {stage}
                  </div>
                  <span className="text-[10px] text-navy-400">{deals.length}</span>
                </div>
                <div className="space-y-2">
                  {deals.length === 0 ? (
                    <p className="text-[11px] text-navy-300 px-1">Bo'sh</p>
                  ) : deals.map((p) => (
                    <div key={p.id} className={`rounded-xl bg-white border p-2.5 shadow-sm ${p.status === 'won' ? 'border-emerald-200' : 'border-navy-100'}`}>
                      <div className="text-xs font-semibold text-navy-800 truncate">{p.lead}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-bold text-gold-700">{compactMoney(p.value)}</span>
                        <span className="text-[10px] text-navy-400">{p.probability}%</span>
                      </div>
                      {p.next_action && <div className="text-[10px] text-navy-400 mt-1 truncate" title={p.next_action}>→ {p.next_action}</div>}
                      {p.status === 'won' && <span className="chip bg-emerald-100 text-emerald-700 text-[9px] mt-1.5">✓ Yutildi</span>}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-navy-400 mt-2 px-1 font-semibold">{money(stageValue)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Follow-up rejasi */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><CalendarClock size={18} className="text-gold" /> Follow-up rejasi</h3>
            <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('follow_ups')}><Plus size={13} /> Qo'shish</button>
          </div>
          {stats.pendingFollowUps.length === 0 ? (
            <p className="text-sm text-navy-400">Kutilayotgan follow-up yo'q 👍</p>
          ) : (
            <div className="space-y-2">
              {[...stats.pendingFollowUps].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-[10px] font-bold shrink-0">{(f.lead || '?')[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{f.lead}</div>
                    <div className="text-[11px] text-navy-400 truncate">{f.action} · {f.assigned_to}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-bold text-navy-600">{f.date}</div>
                    <span className={`chip text-[9px] ${statusStyle(f.status)}`}>{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lid manbalari */}
        <div className="card p-5">
          <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Users size={18} className="text-gold" /> Lid manbalari</h3>
          {bySource.length === 0 ? <p className="text-sm text-navy-400">Ma'lumot yo'q</p> : (
            <div className="space-y-3">
              {bySource.map((s) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-navy-700">{s.source}</span>
                    <span className="text-navy-400">{s.count} ta · {s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                    <div className={`h-full rounded-full ${SOURCE_COLOR[s.source] || 'bg-navy-400'}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kampaniyalar samaradorligi */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-navy-100 flex items-center justify-between">
          <h3 className="font-display text-lg text-navy-800 flex items-center gap-2"><Megaphone size={18} className="text-gold" /> Kampaniyalar samaradorligi</h3>
          <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => openCreate('campaigns')}><Plus size={13} /> Yangi kampaniya</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-navy-50/50 border-b border-navy-100">
                {['Kampaniya', 'Kanal', 'Byudjet', 'Lidlar', "Lid narxi", 'Holat'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold text-navy-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-navy-50/80 hover:bg-gold/[.02] transition">
                  <td className="px-4 py-3 font-semibold text-navy-800">{c.name}</td>
                  <td className="px-4 py-3 text-navy-500">{c.channel}</td>
                  <td className="px-4 py-3 tabular-nums text-navy-700">{money(c.budget)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-navy-700">{c.leads}</td>
                  <td className="px-4 py-3 tabular-nums text-navy-500">{c.leads ? money(Math.round(c.budget / c.leads)) : '—'}</td>
                  <td className="px-4 py-3"><span className={`chip ${statusStyle(c.status)}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} title={modal ? ADD_TYPES[modal.type] : ''} onClose={() => setModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade">{err}</div>}
        {modal && (
          <div className="grid sm:grid-cols-2 gap-4">
            {RESOURCES[modal.type].fields.map((f) => (
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
        )}
      </Modal>
    </div>
  );
}
