import { useEffect, useState } from 'react';
import { Swords, Plus, Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BossFightPage() {
  const { user } = useAuth();
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const isStudent = user.role === 'student';
  const [boss, setBoss] = useState(undefined);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [hp, setHp] = useState(1000);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastDamage, setLastDamage] = useState(null);

  async function load() {
    setBoss(await api.get('/boss-fight/current').catch(() => null));
  }
  useEffect(() => { load(); }, []);

  async function attack() {
    setErr(''); setBusy(true); setLastDamage(null);
    try {
      const res = await api.post('/boss-fight/attack', {});
      setLastDamage(res.damage);
      if (res.defeated) setTimeout(() => alert("🎉 Boss mag'lub etildi! Jamoadagi hammaga coin berildi."), 300);
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function createBoss() {
    setErr('');
    if (!title.trim() || Number(hp) <= 0) { setErr('Nom va HP kiriting.'); return; }
    setBusy(true);
    try {
      await api.post('/boss-fight/create', { title: title.trim(), total_hp: Number(hp) });
      setModal(false); setTitle(''); setHp(1000);
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  if (boss === undefined) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Swords} title="Boss Fight" subtitle="Jamoa bo'lib bossga hujum qiling — mag'lub etsangiz hammaga coin!"
        actions={isStaff && !boss && <button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Yangi boss</button>} />

      {!boss ? (
        <Empty icon={Swords} title="Hozir faol boss yo'q" hint={isStaff ? "Yangi boss yaratish uchun yuqoridagi tugmani bosing." : 'Xodim yangi boss yaratishini kuting.'} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-8 text-center">
            <div className="text-6xl mb-3">👹</div>
            <h2 className="font-display text-2xl text-navy-800 mb-1">{boss.title}</h2>
            <p className="text-xs text-navy-400 mb-5">{boss.contributors} o'quvchi hujum qildi</p>

            <div className="w-full h-6 rounded-full bg-navy-100 overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-700" style={{ width: `${boss.percent}%` }} />
            </div>
            <div className="text-sm font-bold text-navy-600 mb-6">{boss.remaining_hp} / {boss.total_hp} HP</div>

            {isStudent && (
              <>
                <button onClick={attack} disabled={busy || boss.attackedToday || boss.status !== 'active'}
                  className={`rounded-2xl py-4 px-8 text-lg font-bold shadow-lg transition-all ${
                    boss.attackedToday || boss.status !== 'active' ? 'bg-navy-200 text-navy-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:-translate-y-1'
                  }`}>
                  ⚔️ {busy ? 'Hujum qilinmoqda...' : 'HUJUM QILISH'}
                </button>
                {boss.attackedToday && <p className="text-xs text-amber-600 mt-3">Bugungi hujumingiz qilingan — ertaga qayta urining!</p>}
                {lastDamage !== null && <p className="text-sm font-bold text-red-600 mt-3">-{lastDamage} zarba urdingiz!</p>}
              </>
            )}
            {!isStudent && <p className="text-xs text-navy-400">Faqat o'quvchilar hujum qila oladi.</p>}
            {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg text-navy-800 mb-4 flex items-center gap-2"><Trophy size={16} className="text-gold" /> Eng ko'p zarar berganlar</h3>
            {boss.leaderboard.length === 0 ? <p className="text-sm text-navy-400">Hali hujum qilinmagan</p> : (
              <div className="space-y-2">
                {boss.leaderboard.map((l, i) => (
                  <div key={l.student} className="flex items-center gap-2 rounded-lg bg-navy-50/60 px-3 py-2">
                    <span className="text-xs text-navy-400 font-bold w-4">#{i + 1}</span>
                    <span className="text-sm font-semibold text-navy-800 flex-1 truncate">{l.student}</span>
                    <span className="text-xs font-bold text-red-500">{l.damage} 💥</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={modal} title="Yangi boss yaratish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={createBoss} disabled={busy}>{busy ? 'Yaratilmoqda...' : 'Yaratish'}</button>
        </>}>
        <label className="label">Boss nomi</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Iyul oyi bossi" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="label">Jami HP</label>
        <input type="number" className="input !py-2.5" onWheel={(e) => e.target.blur()} value={hp} onChange={(e) => setHp(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
