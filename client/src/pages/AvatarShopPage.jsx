import { useEffect, useState } from 'react';
import { Star, Plus, Pencil, Trash2, Check, User } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const CATEGORIES = ['Avatar ramkasi', 'Fon', 'Belgi', 'Unvon'];
const emptyForm = { item_name: '', cost_coins: 100, category: CATEGORIES[0], status: 'active' };

export default function AvatarShopPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [items, setItems] = useState(null);
  const [students, setStudents] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [it, s, p] = await Promise.all([
      api.get('/avatar_shop?limit=500').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/avatar_purchases?limit=2000').catch(() => []),
    ]);
    setItems((it || []).filter((x) => x.status !== 'archived'));
    setStudents(s || []); setPurchases(p || []);
  }
  useEffect(() => { load(); }, []);

  const me = students.find((s) => s.full_name === user.full_name);
  const myCoins = me ? Number(me.coins) || 0 : 0;
  const myPurchases = purchases.filter((p) => p.student === user.full_name);

  function owned(itemId) { return myPurchases.find((p) => String(p.item_id) === String(itemId)); }

  function openAdd() { setEditing(null); setForm(emptyForm); setModal(true); }
  function openEdit(it) { setEditing(it); setForm({ item_name: it.item_name, cost_coins: it.cost_coins, category: it.category || CATEGORIES[0], status: it.status || 'active' }); setModal(true); }

  async function save() {
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, cost_coins: Number(form.cost_coins) || 0 };
      if (editing) await api.put(`/avatar_shop/${editing.id}`, payload);
      else await api.post('/avatar_shop', payload);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(it) {
    if (!confirm(`"${it.item_name}" o'chirilsinmi?`)) return;
    await api.del(`/avatar_shop/${it.id}`).catch(() => {});
    await load();
  }

  async function buy(it) {
    const cost = Number(it.cost_coins) || 0;
    if (myCoins < cost) { alert(`Coin yetarli emas. Sizda: ${myCoins}, kerak: ${cost}`); return; }
    setBusyId(it.id);
    try {
      await api.post('/avatar-shop/buy', { item_id: it.id });
      await load();
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function equip(it) {
    const mine = owned(it.id);
    if (!mine) return;
    setBusyId(it.id);
    try {
      await api.post('/avatar-shop/equip', { purchase_id: mine.id });
      await load();
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (items === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Star} title="Avatar shop" subtitle="Coinlaringiz bilan profilingizni bezating"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Mahsulot qo'shish</button>} />

      {!canManage && me && (
        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xl font-bold shadow"><User size={22} /></div>
          <div>
            <div className="font-bold text-navy-800">{me.full_name}</div>
            <div className="text-sm text-navy-400">{myPurchases.length} ta mahsulot</div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-display text-3xl text-gold-600">🪙 {myCoins.toLocaleString()}</div>
            <div className="text-xs text-navy-400">Mavjud coin</div>
          </div>
        </div>
      )}

      {items.length === 0 ? <Empty icon={Star} title="Hozircha mahsulot yo'q" /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => {
            const cost = Number(it.cost_coins) || 0;
            const mine = owned(it.id);
            const canBuy = !canManage && myCoins >= cost && !mine;
            return (
              <div key={it.id} className="card p-4 text-center relative">
                {canManage && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => openEdit(it)} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-blue-50 text-navy-300 hover:text-blue-600 transition"><Pencil size={12} /></button>
                    <button onClick={() => remove(it)} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-red-50 text-navy-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                  </div>
                )}
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 mx-auto mb-2">
                  <Star size={24} className="text-violet-500" />
                </div>
                <div className="text-xs font-bold text-navy-800 mb-1 min-h-[2rem] flex items-center justify-center">{it.item_name}</div>
                <span className="chip text-[9px] bg-navy-50 text-navy-500 mb-2 inline-block">{it.category}</span>
                <div className="chip bg-gradient-to-r from-gold-100 to-gold-50 text-gold-700 shadow-sm mb-3 text-xs mx-auto w-fit">🪙 {cost.toLocaleString()}</div>
                {!canManage && (
                  mine ? (
                    <button onClick={() => equip(it)} disabled={busyId === it.id || mine.equipped === 'yes'}
                      className={`w-full text-xs !py-1.5 rounded-xl font-bold transition ${mine.equipped === 'yes' ? 'bg-emerald-50 text-emerald-600' : 'btn-ghost'}`}>
                      {mine.equipped === 'yes' ? <span className="flex items-center justify-center gap-1"><Check size={13} /> Kiyilgan</span> : 'Kiyish'}
                    </button>
                  ) : (
                    <button onClick={() => buy(it)} disabled={!canBuy || busyId === it.id}
                      className={`btn-gold w-full text-xs !py-1.5 ${!canBuy ? 'opacity-30 cursor-not-allowed !shadow-none' : ''}`}>
                      {busyId === it.id ? '...' : 'Sotib olish'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title={editing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}
      >
        <label className="label">Mahsulot nomi</label>
        <input className="input !py-2.5 mb-4" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Turkum</label>
            <select className="input !py-2.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Narxi (coin)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.cost_coins} onChange={(e) => setForm({ ...form, cost_coins: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
