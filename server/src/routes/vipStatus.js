// VIP daraja o'quvchining joriy coin balansidan AVTOMATIK hisoblanadi — admin qo'lda belgilamaydi.
// "since_date" (shu darajada qachondan beri) `vip_status` jadvalida saqlanadi va daraja
// o'zgargandagina yangilanadi, shunda "necha kundan beri Gold" kabi ma'lumot yo'qolmaydi.
import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);

export const VIP_TIERS = [
  { name: 'Bronza', min: 0, icon: '🥉', color: '#B08D57', perks: ["Coin Shop'da standart narxlar"] },
  { name: 'Kumush', min: 300, icon: '🥈', color: '#9CA3AF', perks: ['Coin Shopda 5% chegirma', 'Profilida Kumush belgisi'] },
  { name: 'Oltin', min: 800, icon: '🥇', color: '#D4AF37', perks: ['Coin Shopda 10% chegirma', 'Profilida Oltin belgisi', 'Omad g\'ildiragida qo\'shimcha bonus segment'] },
  { name: 'Platina', min: 2000, icon: '💎', color: '#60A5FA', perks: ['Coin Shopda 20% chegirma', 'Profilida Platina belgisi', 'TOP 100 reytingda maxsus ranglash', 'Haftalik VIP mystery box'] },
];

function tierFor(coins) {
  let tier = VIP_TIERS[0];
  for (const t of VIP_TIERS) if (coins >= t.min) tier = t;
  return tier;
}
function nextTier(coins) {
  const idx = VIP_TIERS.findIndex((t) => t.name === tierFor(coins).name);
  return VIP_TIERS[idx + 1] || null;
}

// Har bir o'quvchi uchun joriy darajani hisoblaydi va o'zgargan bo'lsa vip_status'ni yangilaydi.
function syncStudent(s) {
  const tier = tierFor(Number(s.coins) || 0);
  const existing = store.where('vip_status', (v) => v.student === s.full_name)[0];
  if (!existing || existing.tier !== tier.name) {
    const payload = { student: s.full_name, tier: tier.name, since_date: today(), perks: tier.perks.join('; ') };
    return existing ? store.update('vip_status', existing.id, payload) : store.insert('vip_status', payload);
  }
  return existing;
}

r.get('/board', (req, res) => {
  const students = store.all('students');
  const board = students.map((s) => {
    const coins = Number(s.coins) || 0;
    const tier = tierFor(coins);
    const next = nextTier(coins);
    const synced = syncStudent(s);
    return {
      student_id: s.id, student: s.full_name, group_name: s.group_name, coins,
      tier: tier.name, icon: tier.icon, color: tier.color, perks: tier.perks,
      since_date: synced?.since_date || today(),
      next_tier: next ? { name: next.name, coins_needed: next.min - coins } : null,
    };
  }).sort((a, b) => b.coins - a.coins);
  res.json(board);
});

r.get('/tiers', (_req, res) => res.json(VIP_TIERS));

export default r;
