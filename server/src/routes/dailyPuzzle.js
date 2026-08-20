// Kunlik topishmoq — har kuni BARCHA o'quvchilarga bir xil savol chiqadi (sana bo'yicha deterministik
// tanlanadi), kuniga bitta javob berish mumkin, to'g'ri topsa coin beriladi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const REWARD_COINS = 15;

const QUESTIONS = [
  { q: "O'zbekistonning poytaxti qaysi shahar?", options: ['Samarqand', 'Toshkent', 'Buxoro', 'Andijon'], correct: 1 },
  { q: '5 + 7 × 2 nechiga teng?', options: ['24', '19', '17', '14'], correct: 1 },
  { q: '"Apple" so\'zi ingliz tilidan tarjimasi?', options: ['Banan', 'Olma', 'Uzum', 'Nok'], correct: 1 },
  { q: 'Bir haftada nechta kun bor?', options: ['5', '6', '7', '8'], correct: 2 },
  { q: 'Suvning kimyoviy formulasi?', options: ['CO2', 'O2', 'H2O', 'NaCl'], correct: 2 },
  { q: 'Eng katta sayyora qaysi?', options: ['Yer', 'Mars', 'Yupiter', 'Venera'], correct: 2 },
  { q: '"Kitob" so\'zining ingliz tilidagi tarjimasi?', options: ['Pen', 'Book', 'Table', 'Chair'], correct: 1 },
  { q: '100 ning yarmi nechiga teng?', options: ['25', '40', '50', '60'], correct: 2 },
  { q: 'Bir yilda nechta oy bor?', options: ['10', '11', '12', '13'], correct: 2 },
  { q: 'Inson tanasida nechta asosiy his a\'zosi bor?', options: ['3', '4', '5', '6'], correct: 2 },
  { q: '"Rahmat" so\'zining ingliz tilidagi tarjimasi?', options: ['Sorry', 'Thanks', 'Please', 'Hello'], correct: 1 },
  { q: '9 ning kvadrati nechiga teng?', options: ['18', '72', '81', '99'], correct: 2 },
  { q: 'Qaysi hayvon "hayvonlar shohi" deb ataladi?', options: ['Fil', 'Sher', "Yo'lbars", 'Ayiq'], correct: 1 },
  { q: 'Muzlagan suv nima deb ataladi?', options: ['Bug\'', 'Muz', 'Yomg\'ir', 'Qor'], correct: 1 },
  { q: 'Bir soatda nechta daqiqa bor?', options: ['50', '60', '70', '100'], correct: 1 },
];

function dayIndex() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % QUESTIONS.length;
}

function myStudent(req) {
  if (req.user.role !== 'student') return null;
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

r.get('/today', (req, res) => {
  const idx = dayIndex();
  const puzzle = QUESTIONS[idx];
  const student = myStudent(req);
  const mine = student ? store.where('daily_puzzle', (p) => p.student === student.full_name && p.date === today())[0] : null;
  res.json({
    date: today(), question: puzzle.q, options: puzzle.options,
    answered: !!mine, correct: mine ? !!mine.correct : null,
    reward: REWARD_COINS,
  });
});

r.post('/answer', (req, res) => {
  const student = myStudent(req);
  if (!student) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  if (store.where('daily_puzzle', (p) => p.student === student.full_name && p.date === today()).length) {
    return res.status(409).json({ error: 'Bugungi topishmoqqa allaqachon javob berdingiz.' });
  }
  const { choice } = req.body || {};
  const puzzle = QUESTIONS[dayIndex()];
  const isCorrect = Number(choice) === puzzle.correct;

  if (isCorrect) {
    const newBalance = (Number(student.coins) || 0) + REWARD_COINS;
    store.update('students', student.id, { coins: newBalance, points: (Number(student.points) || 0) + REWARD_COINS });
    store.insert('coin_log', { student: student.full_name, amount: REWARD_COINS, reason: 'Kunlik topishmoq', given_by: 'system', at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  }
  const row = store.insert('daily_puzzle', { student: student.full_name, date: today(), correct: isCorrect ? 1 : 0, reward: isCorrect ? REWARD_COINS : 0 });
  logAudit(student.full_name, 'daily puzzle answer', isCorrect ? 'correct' : 'wrong');
  if (isCorrect) {
    notifyForStudent(student.id, `🧩 Farzandingiz ${student.full_name} bugungi kunlik topishmoqni to'g'ri topdi va ${REWARD_COINS} coin yutdi!`).catch(() => {});
  }
  res.json({ correct: isCorrect, correctIndex: puzzle.correct, reward: isCorrect ? REWARD_COINS : 0, row });
});

export default r;
