import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, DoorOpen, Package, Users, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { RESOURCES } from '../config/resources.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { statusStyle } from '../lib/format.js';

const ADD_TYPES = { branches: 'Yangi filial', rooms: 'Yangi xona', inventory: 'Yangi inventar' };

export default function Branches() {
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [branches, rooms, inventory] = await Promise.all([
      api.get('/branches').catch(() => []),
      api.get('/rooms').catch(() => []),
      api.get('/inventory').catch(() => []),
    ]);
    setD({ branches: branches || [], rooms: rooms || [], inventory: inventory || [] });
  }
  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => {
    if (!d) return [];
    return d.branches.map((b) => {
      const myRooms = d.rooms.filter((r) => r.branch === b.name);
      const myInventory = d.inventory.filter((i) => i.location === b.name);
      return {
        ...b, myRooms, myInventory,
        totalCapacity: myRooms.reduce((a, r) => a + (r.capacity || 0), 0),
        busyRooms: myRooms.filter((r) => r.status === 'busy').length,
      };
    });
  }, [d]);

  function openCreate(type) {
    const cfg = RESOURCES[type];
    const init = {};
    cfg.fields.forEach((f) => { init[f.key] = f.type === 'number' ? 0 : ''; });
    if (type === 'rooms') init.branch = d?.branches[0]?.name || '';
    setForm(init); setErr(''); setModal({ type });
  }

  async function removeBranch(b) {
    if (!confirm(`"${b.name}" filiali o'chirilsinmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    await api.del(`/branches/${b.id}`).catch(() => {});
    await load();
  }

  async function removeRoom(r) {
    if (!confirm(`"${r.name}" xonasi o'chirilsinmi?`)) return;
    await api.del(`/rooms/${r.id}`).catch(() => {});
    await load();
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
      setModal(null); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (!d) return <Spinner />;

  const totals = {
    students: d.branches.reduce((a, b) => a + (b.students_count || 0), 0),
    rooms: d.rooms.length,
    inventory: d.inventory.reduce((a, i) => a + (i.qty || 0), 0),
  };

  return (
    <div>
      <PageHeader icon={Building2} title="Filiallar" subtitle={`${d.branches.length} ta filial · ${totals.students} o'quvchi · ${totals.rooms} xona`}
        actions={<>
          <button className="btn-ghost" onClick={() => openCreate('rooms')}><Plus size={16} /> Xona</button>
          <button className="btn-gold" onClick={() => openCreate('branches')}><Plus size={16} /> Yangi filial</button>
        </>} />

      {d.branches.length === 0 ? (
        <Empty icon={Building2} title="Filial yo'q" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {enriched.map((b, idx) => (
            <div key={b.id} className="card p-5 animate-fade group relative" style={{ animationDelay: `${idx * 40}ms` }}>
              <button onClick={() => removeBranch(b)} title="Filialni o'chirish"
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 transition"><Trash2 size={15} /></button>
              <div className="flex items-start justify-between mb-3 pr-6">
                <div className="min-w-0">
                  <div className="font-display text-lg text-navy-800 truncate">{b.name}</div>
                  <div className="text-xs text-navy-400 truncate">{b.address}</div>
                </div>
                <span className={`chip text-[10px] shrink-0 ${statusStyle(b.status)}`}>{b.status}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl bg-navy-50/60 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-navy-800 font-display text-lg"><Users size={14} className="text-gold" />{b.students_count || 0}</div>
                  <div className="text-[9px] text-navy-400">O'quvchi</div>
                </div>
                <div className="rounded-xl bg-navy-50/60 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-navy-800 font-display text-lg"><DoorOpen size={14} className="text-gold" />{b.myRooms.length}</div>
                  <div className="text-[9px] text-navy-400">Xona</div>
                </div>
                <div className="rounded-xl bg-navy-50/60 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-navy-800 font-display text-lg"><Package size={14} className="text-gold" />{b.myInventory.length}</div>
                  <div className="text-[9px] text-navy-400">Inventar</div>
                </div>
              </div>

              {b.myRooms.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-1.5">Xonalar ({b.busyRooms} band / {b.myRooms.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.myRooms.map((r) => (
                      <span key={r.id} className={`chip text-[9px] gap-1 ${r.status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {r.name} · {r.capacity}
                        <button onClick={() => removeRoom(r)} className="opacity-50 hover:opacity-100 transition" title="Xonani o'chirish">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
                {modal.type === 'rooms' && f.key === 'branch' ? (
                  <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">— tanlang —</option>
                    {d.branches.map((br) => <option key={br.id} value={br.name}>{br.name}</option>)}
                  </select>
                ) : f.type === 'select' ? (
                  <select className="input !py-2.5" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">— tanlang —</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
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
