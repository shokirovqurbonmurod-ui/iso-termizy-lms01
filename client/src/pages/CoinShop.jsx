import { useEffect, useState } from 'react';
import { ShoppingBag, Coins, Eraser, PenTool, Pencil, StickyNote, NotebookPen, Highlighter,
  Paintbrush, CupSoda, Package, Coffee, BookMarked, BookOpen, Usb, Box, Lamp,
  Keyboard, Backpack, Headphones, Gift, Watch, GraduationCap, Speaker,
  Smartphone, Tablet, Laptop, Trophy, Plane, Plus, Trash2, Gem,
  Dumbbell, Bike, Music2, Ruler, Palette, Camera, Rocket, Puzzle, Dices,
  Gamepad2, MapPin, Luggage, Award, Medal, Sparkles, Star, Umbrella,
  Shirt, Glasses, Wrench, Clock, Compass, PenLine,
  Home, Utensils, Pizza, IceCream, Cake, Apple, Carrot, Fish, Bird, Flower2,
  TreePine, Sun, Moon, Cloud, Snowflake, Flame, Droplet, Leaf, Battery, Plug,
  Wifi, Printer, Monitor, Mouse, HardDrive, Cpu, Server, Film, Tv, Ticket,
  Wallet, PiggyBank, Banknote, Diamond, Crown, Anchor, Ship, Car, Train, Bus,
  Mountain, Tent, Map, Globe, Building, School, ShoppingCart, Store, Cookie,
  Candy, Popcorn } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const ICONS = {
  Eraser, PenTool, Pencil, StickyNote, NotebookPen, Highlighter, Paintbrush, CupSoda,
  Package, Coffee, BookMarked, BookOpen, Usb, Box, Lamp, Keyboard, Backpack, Headphones,
  Gift, Watch, GraduationCap, Speaker, Smartphone, Tablet, Laptop, Trophy, Plane,
  Dumbbell, Bike, Music2, Ruler, Palette, Camera, Rocket, Puzzle, Dices,
  Gamepad2, MapPin, Luggage, Award, Medal, Sparkles, Star, Umbrella,
  Shirt, Glasses, Wrench, Clock, Compass, PenLine,
  Home, Utensils, Pizza, IceCream, Cake, Apple, Carrot, Fish, Bird, Flower2,
  TreePine, Sun, Moon, Cloud, Snowflake, Flame, Droplet, Leaf, Battery, Plug,
  Wifi, Printer, Monitor, Mouse, HardDrive, Cpu, Server, Film, Tv, Ticket,
  Wallet, PiggyBank, Banknote, Diamond, Crown, Anchor, Ship, Car, Train, Bus,
  Mountain, Tent, Map, Globe, Building, School, ShoppingCart, Store, Cookie,
  Candy, Popcorn,
};
const ICON_KEYS = Object.keys(ICONS);

const TONE = {
  slate: 'from-slate-100 to-slate-50 border-slate-200',
  blue: 'from-blue-100 to-sky-50 border-blue-200',
  violet: 'from-violet-100 to-fuchsia-50 border-violet-200',
  gold: 'from-amber-100 to-yellow-50 border-gold-200',
};
const TONE_KEYS = Object.keys(TONE);

export default function CoinShop() {
  const { user } = useAuth();
  const [products, setProducts] = useState(null);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState({});

  const canManage = !['student', 'parent', 'guest'].includes(user.role);

  async function load() {
    setProducts(await api.get('/coin_shop').catch(() => []));
  }
  useEffect(() => {
    load();
    api.get('/students').then(s => setStudents(s || [])).catch(() => {});
  }, []);

  const me = students.find(s => s.full_name === user.full_name);
  const myCoins = me ? (me.coins || 0) : 0;
  const isStudent = user.role === 'student';

  async function buy(it) {
    setErr(''); setMsg('');
    if (!isStudent) { setErr("Faqat o'quvchi sotib olishi mumkin"); return; }
    if (!me) { setErr("O'quvchi topilmadi"); return; }
    const cost = Number(it.cost) || 0;
    if (myCoins < cost) { setErr(`Coinlar yetarli emas! Sizda: ${myCoins.toLocaleString()}, kerak: ${cost.toLocaleString()}`); return; }
    try {
      await api.post('/coins/spend', { student_id: me.id, item: it.item, cost });
      setMsg(`✅ "${it.item}" sotib olindi!`);
      const updated = await api.get('/students').catch(() => []);
      setStudents(updated || []);
    } catch (e) { setErr(e.message); }
  }

  function openAdd() {
    setForm({ item: '', icon: 'Gift', cost: 5000, tone: 'slate', status: 'active' });
    setErr(''); setModal('add');
  }
  function openEdit(p) {
    setForm({ id: p.id, item: p.item, icon: p.icon || 'Gift', cost: p.cost, tone: p.tone || 'slate', status: p.status || 'active' });
    setErr(''); setModal('edit');
  }
  async function save() {
    setErr('');
    if (!form.item?.trim()) { setErr('Mahsulot nomini kiriting'); return; }
    if (!form.cost || Number(form.cost) <= 0) { setErr("Narxi 0 dan katta bo'lsin"); return; }
    try {
      if (modal === 'add') await api.post('/coin_shop', form);
      else await api.put(`/coin_shop/${form.id}`, form);
      setModal(null); load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(p) {
    if (!confirm(`"${p.item}"ni o'chirmoqchimisiz?`)) return;
    try { await api.del(`/coin_shop/${p.id}`); load(); } catch (e) { alert(e.message); }
  }

  if (products === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={ShoppingBag} title="Coin Shop" subtitle="Coinlaringiz bilan sovg'alar sotib oling"
        actions={canManage && (
          <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Mahsulot qo'shish</button>
        )} />

      {isStudent && me && (
        <div className="card p-5 mb-5 flex items-center gap-4">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-xl font-bold shadow">{me.full_name[0]}</div>
          <div>
            <div className="font-bold text-navy-800">{me.full_name}</div>
            <div className="text-sm text-navy-400">{me.group_name}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-display text-3xl text-gold-600">🪙 {myCoins.toLocaleString()}</div>
            <div className="text-xs text-navy-400">Mavjud coin</div>
          </div>
        </div>
      )}

      {msg && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3">{msg}</div>}
      {err && !modal && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}

      {products.length === 0 ? (
        <div className="card p-10 text-center text-navy-400">Hozircha mahsulotlar yo'q</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {[...products].sort((a, b) => (Number(a.cost) || 0) - (Number(b.cost) || 0)).map((it, idx) => {
            const Ico = ICONS[it.icon] || Gift;
            const tone = TONE[it.tone] || TONE.slate;
            const cost = Number(it.cost) || 0;
            const canBuy = isStudent && myCoins >= cost;
            return (
              <div key={it.id} className={`relative card p-4 text-center flex flex-col items-center border ${tone.split(' ').pop()} animate-fade`} style={{ animationDelay: `${idx * 20}ms` }}>
                {canManage && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => openEdit(it)} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-blue-50 text-navy-300 hover:text-blue-600 transition" title="Tahrirlash"><Pencil size={12} /></button>
                    <button onClick={() => remove(it)} className="grid place-items-center w-6 h-6 rounded-lg hover:bg-red-50 text-navy-300 hover:text-red-500 transition" title="O'chirish"><Trash2 size={12} /></button>
                  </div>
                )}
                <div className={`grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br ${tone} mb-2`}>
                  <Ico size={26} strokeWidth={1.5} />
                </div>
                <div className="font-bold text-navy-800 text-xs mb-1 min-h-[2rem] flex items-center">{it.item}</div>
                <div className="chip bg-gradient-to-r from-gold-100 to-gold-50 text-gold-700 shadow-sm mb-2 text-xs">
                  🪙 {cost.toLocaleString()}
                </div>
                {isStudent && (
                  <button onClick={() => buy(it)} disabled={!canBuy}
                    className={`btn-gold w-full text-xs mt-auto ${!canBuy ? 'opacity-30 cursor-not-allowed !shadow-none' : ''}`}>
                    Sotib olish
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title={modal === 'add' ? "Yangi mahsulot" : 'Mahsulotni tahrirlash'} onClose={() => setModal(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save}>Saqlash</button>
        </>}>
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        <div className="space-y-4">
          <div>
            <label className="label">Mahsulot nomi <span className="text-red-400">*</span></label>
            <input className="input !py-2.5" placeholder="Masalan: Ryukzak" value={form.item || ''}
              onChange={(e) => setForm({ ...form, item: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Narxi (coin) <span className="text-red-400">*</span></label>
              <input className="input !py-2.5" type="number" min="1" value={form.cost ?? ''}
                onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div>
              <label className="label">Rang toni</label>
              <select className="input !py-2.5" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                {TONE_KEYS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Ikonka</label>
            <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-navy-50">
              {ICON_KEYS.map((key) => {
                const Ico = ICONS[key];
                const active = form.icon === key;
                return (
                  <button key={key} type="button" onClick={() => setForm({ ...form, icon: key })}
                    className={`grid place-items-center w-9 h-9 rounded-xl transition ${active ? 'bg-gold text-white shadow' : 'bg-white text-navy-500 hover:bg-gold/10'}`}
                    title={key}>
                    <Ico size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
