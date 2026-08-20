import { store } from './db.js';
import { notifyForStudent } from './telegram.js';

const monthKey = (d = new Date()) => d.toISOString().slice(0, 7); // YYYY-MM
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/,/g, ' ');

// Har bir faol, tarifi belgilangan o'quvchidan oylik to'lovni balansdan avtomatik yechadi —
// bir oyda faqat bir marta (allaqachon shu oy uchun yechilgan bo'lsa qayta yechilmaydi).
export async function runMonthlyBilling() {
  const thisMonth = monthKey();
  const students = store.all('students').filter((s) => s.status === 'active' && Number(s.tariff_price) > 0);

  for (const s of students) {
    const alreadyCharged = store.where('student_balance_ledger', (l) =>
      l.student_id === s.id && l.type === 'debit' && l.reason === "Oylik to'lov" && (l.date || '').slice(0, 7) === thisMonth
    ).length > 0;
    if (alreadyCharged) continue;

    const price = Number(s.tariff_price);
    const newBalance = (Number(s.balance) || 0) - price;
    const today = new Date().toISOString().slice(0, 10);
    store.update('students', s.id, { balance: newBalance });
    store.insert('student_balance_ledger', {
      student_id: s.id, student_name: s.full_name,
      type: 'debit', amount: price, reason: "Oylik to'lov",
      date: today, staff: 'Tizim', at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    if (newBalance < 0) {
      notifyForStudent(s.id, `⚠️ ${s.full_name} — oylik to'lov (${fmt(price)} so'm) balansdan yechildi. Joriy balans: ${fmt(newBalance)} so'm (manfiy). Iltimos to'lovni amalga oshiring.`).catch(() => {});
    }
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startBillingScheduler() {
  runMonthlyBilling().catch((e) => console.error('Billing xatosi:', e.message));
  setInterval(() => { runMonthlyBilling().catch((e) => console.error('Billing xatosi:', e.message)); }, DAY_MS);
}
