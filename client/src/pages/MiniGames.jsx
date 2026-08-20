import { useState, useEffect, useRef, useMemo } from 'react';
import { Gamepad2, Trophy, Clock, Star, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';

const WORDS = [
  { en: 'apple', uz: 'olma' }, { en: 'book', uz: 'kitob' }, { en: 'water', uz: 'suv' },
  { en: 'school', uz: 'maktab' }, { en: 'teacher', uz: "o'qituvchi" }, { en: 'student', uz: "o'quvchi" },
  { en: 'house', uz: 'uy' }, { en: 'family', uz: 'oila' }, { en: 'friend', uz: "do'st" },
  { en: 'morning', uz: 'ertalab' }, { en: 'evening', uz: 'kechqurun' }, { en: 'sun', uz: 'quyosh' },
  { en: 'moon', uz: 'oy' }, { en: 'star', uz: 'yulduz' }, { en: 'city', uz: 'shahar' },
  { en: 'country', uz: 'mamlakat' }, { en: 'language', uz: 'til' }, { en: 'music', uz: 'musiqa' },
  { en: 'garden', uz: "bog'" }, { en: 'bread', uz: 'non' }, { en: 'milk', uz: 'sut' },
  { en: 'river', uz: "daryo" }, { en: 'mountain', uz: "tog'" }, { en: 'bird', uz: 'qush' },
];

const MATH_OPS = ['+', '-', '*'];

const GAMES = [
  { id: 'word', name: "So'z tarjimasi", icon: '🔤', desc: 'Inglizcha so\'zni o\'zbekchaga tarjima qiling', reward: 15, color: 'from-blue-500 to-blue-600' },
  { id: 'math', name: 'Tezkor hisob', icon: '🔢', desc: 'Matematik misolni 10 soniyada yeching', reward: 10, color: 'from-emerald-500 to-emerald-600' },
  { id: 'scramble', name: "Aralash harflar", icon: '🔀', desc: "Aralashgan harflardan so'z tuzing", reward: 20, color: 'from-violet-500 to-violet-600' },
  { id: 'memory', name: 'Xotira o\'yini', icon: '🧠', desc: "Raqamlarni eslang va takrorlang", reward: 25, color: 'from-amber-500 to-amber-600' },
  { id: 'reaction', name: 'Reaksiya tezligi', icon: '⚡', desc: "Yashil bo'lganda bosing!", reward: 10, color: 'from-rose-500 to-rose-600' },
  { id: 'quiz', name: 'Bilim viktorinasi', icon: '🧩', desc: 'Umumiy bilim savollari', reward: 15, color: 'from-cyan-500 to-cyan-600' },
  { id: 'word', name: 'Antonimlar', icon: '🔄', desc: "So'zning aksini toping", reward: 15, color: 'from-indigo-500 to-indigo-600' },
  { id: 'math', name: 'Foiz hisoblash', icon: '📐', desc: 'Foizli misollar yeching', reward: 20, color: 'from-pink-500 to-pink-600' },
  { id: 'scramble', name: 'Jumla tuzing', icon: '📝', desc: "Aralash so'zlardan gap tuzing", reward: 25, color: 'from-teal-500 to-teal-600' },
  { id: 'reaction', name: 'Rang toping', icon: '🎨', desc: 'RGB rang kodini toping', reward: 10, color: 'from-fuchsia-500 to-fuchsia-600' },
  { id: 'memory', name: 'Bayroq toping', icon: '🏳️', desc: 'Mamlakat bayrogini toping', reward: 15, color: 'from-lime-500 to-lime-600' },
  { id: 'quiz', name: 'IT Quiz', icon: '💻', desc: 'Dasturlash savollari', reward: 20, color: 'from-gray-500 to-gray-600' },
  { id: 'word', name: 'Idiomalar', icon: '💬', desc: 'Ingliz tilidagi iboralar', reward: 20, color: 'from-orange-500 to-orange-600' },
  { id: 'math', name: 'Tezlik sinovi', icon: '🏎️', desc: 'Eng tez javob bering', reward: 30, color: 'from-red-600 to-red-700' },
  { id: 'typing', name: 'Tez yozish', icon: '⌨️', desc: 'Gapni tez va xatosiz yozing', reward: 20, color: 'from-sky-500 to-sky-600' },
  { id: 'colormatch', name: 'Rang chalkashligi', icon: '🌈', desc: "So'z rangini toping, mazmunini emas", reward: 15, color: 'from-fuchsia-500 to-fuchsia-600' },
  { id: 'typing', name: 'Maqol yozish', icon: '✍️', desc: "O'zbek maqollarini tez yozing", reward: 25, color: 'from-cyan-600 to-cyan-700' },
  { id: 'colormatch', name: 'Reaksiya rang', icon: '🎯', desc: "To'g'ri rangni tezroq toping", reward: 10, color: 'from-purple-500 to-purple-600' },
  { id: 'tarix', name: 'Tarix bilimdoni', icon: '🏛️', desc: "O'zbekiston va jahon tarixi savollari", reward: 15, color: 'from-amber-600 to-amber-700' },
  { id: 'tarix', name: 'Buyuk siymolar', icon: '👑', desc: 'Tarixiy shaxslar haqida savollar', reward: 20, color: 'from-yellow-600 to-yellow-700' },
  { id: 'tarix', name: 'Qadimgi davrlar', icon: '🏺', desc: 'Qadimgi tarix bo’yicha bilim sinovi', reward: 10, color: 'from-orange-700 to-orange-800' },
  { id: 'tarix', name: 'Mustaqillik yillari', icon: '🇺🇿', desc: "O'zbekiston tarixi savollari", reward: 25, color: 'from-blue-700 to-blue-800' },
  { id: 'tarix', name: 'Jahon tarixi', icon: '🌍', desc: 'Dunyo tarixidan qiziqarli savollar', reward: 15, color: 'from-teal-700 to-teal-800' },
  { id: 'huquq', name: "Huquq asoslari", icon: '⚖️', desc: 'Fuqarolik huquqi savollari', reward: 15, color: 'from-slate-600 to-slate-700' },
  { id: 'huquq', name: 'Konstitutsiya bilimi', icon: '📜', desc: 'Asosiy qonun bo’yicha savollar', reward: 20, color: 'from-indigo-600 to-indigo-700' },
  { id: 'huquq', name: 'Fuqarolik huquqlari', icon: '🛡️', desc: 'Har bir fuqaro bilishi kerak bo’lgan huquqlar', reward: 10, color: 'from-red-700 to-red-800' },
  { id: 'huquq', name: "Yosh yurist", icon: '👨‍⚖️', desc: 'Huquqiy bilim sinovi', reward: 25, color: 'from-gray-700 to-gray-800' },
  { id: 'huquq', name: 'Bolalar huquqi', icon: '🧒', desc: "O'quvchilar uchun huquq savollari", reward: 15, color: 'from-slate-700 to-slate-800' },
  { id: 'matematika', name: 'Geometriya sinovi', icon: '📐', desc: 'Shakllar va formulalar bo’yicha savollar', reward: 15, color: 'from-emerald-600 to-emerald-700' },
  { id: 'matematika', name: 'Matematik bilimdon', icon: '➗', desc: 'Umumiy matematik bilim savollari', reward: 20, color: 'from-green-600 to-green-700' },
  { id: 'matematika', name: 'Formulalar sinovi', icon: '🧮', desc: 'Asosiy formulalarni biling', reward: 10, color: 'from-lime-600 to-lime-700' },
  { id: 'matematika', name: "Sonlar dunyosi", icon: '🔟', desc: 'Sonlar haqida qiziqarli savollar', reward: 25, color: 'from-cyan-700 to-cyan-800' },
  { id: 'matematika', name: 'Mantiq sinovi', icon: '🧠', desc: 'Matematik mantiq savollari', reward: 15, color: 'from-teal-600 to-teal-700' },
  { id: 'ingliz', name: 'Grammatika sinovi', icon: '📗', desc: 'Ingliz tili grammatikasi savollari', reward: 15, color: 'from-blue-500 to-blue-700' },
  { id: 'ingliz', name: 'So’z turkumlari', icon: '🔠', desc: 'Ingliz tili qoidalari savollari', reward: 20, color: 'from-sky-600 to-sky-700' },
  { id: 'ingliz', name: 'Zamonlar sinovi', icon: '⏳', desc: 'Ingliz tili zamonlari bo’yicha savollar', reward: 10, color: 'from-indigo-500 to-indigo-600' },
  { id: 'ingliz', name: 'English Master', icon: '🇬🇧', desc: 'Ingliz tili umumiy bilim sinovi', reward: 25, color: 'from-violet-600 to-violet-700' },
  { id: 'ingliz', name: 'Grammar Pro', icon: '📖', desc: 'Chuqurlashtirilgan grammatika savollari', reward: 15, color: 'from-blue-600 to-blue-800' },
  { id: 'koreys', name: 'Koreys tili asoslari', icon: '🇰🇷', desc: 'Boshlang’ich koreyscha so’zlar', reward: 15, color: 'from-rose-500 to-rose-600' },
  { id: 'koreys', name: 'Hangul sinovi', icon: '가', desc: 'Koreys alifbosi va so’zlari', reward: 20, color: 'from-pink-600 to-pink-700' },
  { id: 'koreys', name: 'Kundalik koreyscha', icon: '💬', desc: 'Kundalik muloqot so’zlari', reward: 10, color: 'from-red-500 to-red-600' },
  { id: 'koreys', name: 'K-so’zlar', icon: '🎤', desc: 'Koreys tili so’z boyligi', reward: 25, color: 'from-fuchsia-600 to-fuchsia-700' },
  { id: 'koreys', name: 'Koreyscha muloqot', icon: '🗣️', desc: 'Oddiy koreyscha jumlalar', reward: 15, color: 'from-rose-600 to-rose-700' },
  { id: 'nemis', name: 'Nemis tili asoslari', icon: '🇩🇪', desc: 'Boshlang’ich nemischa so’zlar', reward: 15, color: 'from-neutral-600 to-neutral-700' },
  { id: 'nemis', name: 'Deutsch sinovi', icon: '📘', desc: 'Nemis tili grammatikasi savollari', reward: 20, color: 'from-stone-600 to-stone-700' },
  { id: 'nemis', name: 'Kundalik nemischa', icon: '💬', desc: 'Kundalik muloqot so’zlari', reward: 10, color: 'from-zinc-600 to-zinc-700' },
  { id: 'nemis', name: 'Deutsch Wörter', icon: '📕', desc: 'Nemis tili so’z boyligi', reward: 25, color: 'from-neutral-700 to-neutral-800' },
  { id: 'nemis', name: 'Nemischa muloqot', icon: '🗣️', desc: 'Oddiy nemischa jumlalar', reward: 15, color: 'from-stone-700 to-stone-800' },
  { id: 'memory', name: 'Super xotira', icon: '🧩', desc: 'Uzun raqamlar ketma-ketligini eslang', reward: 30, color: 'from-amber-700 to-amber-800' },
  { id: 'reaction', name: 'Chaqqonlik sinovi', icon: '🏃', desc: "Eng tez reaksiya ko'rsating", reward: 20, color: 'from-rose-700 to-rose-800' },
];

const SENTENCES = [
  'Men bugun maktabga boraman', "Kitob o'qish foydali odat", 'She sells sea shells',
  'Practice makes perfect', "Til o'rganish sabr talab qiladi", 'The quick brown fox jumps',
  'Bilim kuchdir', 'Never give up on your dreams', "Har kuni biroz o'qing",
  'Time is money',
];

const COLOR_SET = [
  { name: 'Qizil', hex: '#ef4444' }, { name: 'Yashil', hex: '#10b981' }, { name: "Ko'k", hex: '#3b82f6' },
  { name: 'Sariq', hex: '#f59e0b' }, { name: 'Binafsha', hex: '#8b5cf6' }, { name: 'Pushti', hex: '#ec4899' },
];

const TARIX_BANK = [
  { q: "Amir Temur qachon tug'ilgan?", a: '1336', opts: ['1206', '1336', '1370', '1405'] },
  { q: "Sohibqiron laqabi kimga tegishli?", a: 'Amir Temur', opts: ['Bobur', 'Amir Temur', 'Ulug’bek', 'Shayboniyxon'] },
  { q: "O'zbekiston mustaqilligi qachon e'lon qilingan?", a: '1991', opts: ['1989', '1990', '1991', '1992'] },
  { q: "Ulug'bek observatoriyasi qaysi shaharda?", a: 'Samarqand', opts: ['Buxoro', 'Xiva', 'Samarqand', 'Termiz'] },
  { q: "Ikkinchi jahon urushi qachon tugagan?", a: '1945', opts: ['1943', '1944', '1945', '1946'] },
  { q: "Buyuk ipak yo'li nimani bog'lagan?", a: 'Sharq va G’arbni', opts: ['Faqat Xitoyni', 'Sharq va G’arbni', 'Yevropani', 'Afrikani'] },
  { q: "Termiz shahri qaysi daryo bo'yida?", a: 'Amudaryo', opts: ['Sirdaryo', 'Amudaryo', 'Zarafshon', 'Volga'] },
  { q: "Bobur qaysi imperiyaga asos solgan?", a: 'Boburiylar', opts: ['Usmoniylar', 'Boburiylar', 'Safaviylar', 'Rim'] },
];

const HUQUQ_BANK = [
  { q: "O'zbekistonda fuqarolik yoshi necha yoshdan boshlanadi?", a: '18', opts: ['16', '18', '21', '25'] },
  { q: "Asosiy qonun qanday nomlanadi?", a: 'Konstitutsiya', opts: ['Kodeks', 'Konstitutsiya', 'Farmon', 'Nizom'] },
  { q: "Mehnat shartnomasi kim bilan tuziladi?", a: 'Ish beruvchi bilan', opts: ['Do’st bilan', 'Ish beruvchi bilan', 'Qo’shni bilan', 'Hech kim bilan'] },
  { q: "Jinoyat sodir etgan shaxs qanday javobgar bo'ladi?", a: 'Jinoiy javobgarlikka', opts: ['Faqat jarima', 'Jinoiy javobgarlikka', 'Hech narsa', 'Maqtov'] },
  { q: "Ta'lim olish huquqi qaysi hujjatda kafolatlangan?", a: 'Konstitutsiyada', opts: ['Shartnomada', 'Konstitutsiyada', 'Chekda', 'Bilet'] },
  { q: "Nikoh yoshi (qiz) necha yosh?", a: '18', opts: ['15', '16', '18', '20'] },
  { q: "Fuqaro huquqlari buzilganda qayerga murojaat qilinadi?", a: 'Sudga', opts: ['Do’konga', 'Sudga', 'Maktabga', 'Bozorga'] },
  { q: "Mualliflik huquqi nimani himoya qiladi?", a: 'Ijodiy asarlarni', opts: ['Avtomobilni', 'Ijodiy asarlarni', 'Uy-joyni', 'Yerni'] },
];

const MATEMATIKA_BANK = [
  { q: "Doira yuzi formulasi?", a: 'πr²', opts: ['2πr', 'πr²', 'r²', 'πd'] },
  { q: "To'g'ri burchak necha gradus?", a: '90', opts: ['45', '60', '90', '180'] },
  { q: "Uchburchak burchaklari yig'indisi?", a: '180°', opts: ['90°', '180°', '270°', '360°'] },
  { q: "5 ning kvadrati nechaga teng?", a: '25', opts: ['10', '15', '20', '25'] },
  { q: "Kvadratning barcha tomonlari qanday?", a: 'Teng', opts: ['Teng', 'Har xil', 'Parallel emas', 'Egri'] },
  { q: "Sonlar ketma-ketligida 0 eng kichik butun son bo'lishi mumkinmi?", a: "Yo'q, manfiylar bor", opts: ["Ha, doim", "Yo'q, manfiylar bor", "Faqat matematikada", "Har doim"] },
  { q: "1 metr necha santimetr?", a: '100', opts: ['10', '100', '1000', '10000'] },
  { q: "Foiz nima?", a: 'Yuzdan bir ulush', opts: ['Yuzdan bir ulush', 'Mingdan bir', 'Butun son', 'Kasr emas'] },
];

const INGLIZ_BANK = [
  { q: "'Beautiful' so'zi qaysi so'z turkumi?", a: 'Sifat', opts: ['Ot', 'Fe’l', 'Sifat', 'Ravish'] },
  { q: "Present Simple qachon ishlatiladi?", a: 'Odatiy harakat', opts: ['O’tgan payt', 'Odatiy harakat', 'Kelasi payt', 'Shart mayli'] },
  { q: "'Go' fe'lining 2-formasi?", a: 'Went', opts: ['Goed', 'Went', 'Gone', 'Going'] },
  { q: "Ko'plik son qo'shimchasi odatda qaysi harf?", a: '-s', opts: ['-s', '-ed', '-ing', '-er'] },
  { q: "'I ___ a student' bo'shliqqa mos so'z?", a: 'am', opts: ['am', 'is', 'are', 'be'] },
  { q: "'Quickly' qaysi turkumga kiradi?", a: 'Ravish', opts: ['Ot', 'Sifat', 'Ravish', 'Old qo’shimcha'] },
  { q: "'Their' so'zi nimani bildiradi?", a: 'Egalik olmoshi', opts: ['Fe’l', 'Egalik olmoshi', 'Bog’lovchi', 'Undov'] },
  { q: "'Yesterday' qaysi zamon bilan ishlatiladi?", a: 'Past Simple', opts: ['Present Simple', 'Past Simple', 'Future Simple', 'Present Continuous'] },
];

const KOREYS_BANK = [
  { q: "Koreyscha 'salom' qanday aytiladi?", a: '안녕하세요', opts: ['감사합니다', '안녕하세요', '죄송합니다', '네'] },
  { q: "'Rahmat' koreyschada?", a: '감사합니다', opts: ['안녕', '감사합니다', '네', '아니요'] },
  { q: "Koreys alifbosi qanday nomlanadi?", a: 'Xangul', opts: ['Kanji', 'Xangul', 'Xiragana', 'Pinyin'] },
  { q: "'Ha' so'zi koreyschada?", a: '네', opts: ['아니요', '네', '안녕', '몰라요'] },
  { q: "'Men' olmoshi koreyschada?", a: '저', opts: ['너', '저', '우리', '그'] },
  { q: "'Maktab' so'zi koreyschada?", a: '학교', opts: ['집', '학교', '병원', '회사'] },
  { q: "Janubiy Koreya poytaxti?", a: 'Seul', opts: ['Busan', 'Seul', 'Inchon', 'Daegu'] },
  { q: "'Kechirasiz' koreyschada?", a: '죄송합니다', opts: ['감사합니다', '죄송합니다', '안녕', '네'] },
];

const NEMIS_BANK = [
  { q: "Nemischa 'salom' qanday?", a: 'Hallo', opts: ['Hallo', 'Tschuss', 'Danke', 'Bitte'] },
  { q: "'Rahmat' nemischada?", a: 'Danke', opts: ['Danke', 'Hallo', 'Bitte', 'Ja'] },
  { q: "Germaniya poytaxti?", a: 'Berlin', opts: ['Myunxen', 'Berlin', 'Gamburg', 'Kyoln'] },
  { q: "'Ha' nemischada?", a: 'Ja', opts: ['Nein', 'Ja', 'Vielleicht', 'Bitte'] },
  { q: "'Men' olmoshi nemischada?", a: 'Ich', opts: ['Du', 'Ich', 'Er', 'Wir'] },
  { q: "'Maktab' so'zi nemischada?", a: 'Schule', opts: ['Haus', 'Schule', 'Auto', 'Buch'] },
  { q: "Nemis tilida otlar qanday yoziladi?", a: 'Katta harf bilan', opts: ['Katta harf bilan', 'Kichik harf bilan', 'Farqi yo’q', 'Kursiv bilan'] },
  { q: "'Iltimos' nemischada?", a: 'Bitte', opts: ['Danke', 'Bitte', 'Tschuss', 'Hallo'] },
];

// Admin tomonidan qo'shilgan savollar shu yerga "quiz_questions" API'dan yuklanadi (mavzu bo'yicha guruhlangan).
const EXTRA_QUESTIONS = {};

const QUIZ = [
  { q: "Angliya poytaxti?", a: 'London', opts: ['London', 'Paris', 'Berlin', 'Madrid'] },
  { q: "H2O nima?", a: 'Suv', opts: ['Suv', 'Havo', 'Yer', 'Olov'] },
  { q: "'Apple' qaysi kompaniya?", a: 'Texnologiya', opts: ['Oziq-ovqat', 'Texnologiya', 'Transport', 'Bank'] },
  { q: "Quyosh tizimida nechta sayyora?", a: '8', opts: ['7', '8', '9', '10'] },
  { q: "IELTS necha bandli?", a: '9', opts: ['5', '7', '9', '10'] },
  { q: "Python nima?", a: 'Dasturlash tili', opts: ['Ilon', 'Dasturlash tili', 'Mashina', "O'yin"] },
  { q: "O'zbekiston poytaxti?", a: 'Toshkent', opts: ['Samarqand', 'Toshkent', 'Buxoro', 'Namangan'] },
  { q: "1 kilometr necha metr?", a: '1000', opts: ['100', '500', '1000', '10000'] },
];

function WordGame({ onWin, onLose }) {
  const [word, setWord] = useState(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [time, setTime] = useState(6);

  useEffect(() => { nextWord(); }, []);
  useEffect(() => {
    if (time <= 0) { if (score >= 4) onWin(score); else onLose(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  function nextWord() {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setInput(''); setRound(r => r + 1); setTime(6);
  }
  function check() {
    if (input.toLowerCase().trim() === word.uz.toLowerCase()) {
      setScore(s => s + 1);
      if (round >= 4) { onWin(score + 1); return; }
      nextWord();
    } else { setInput(''); }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-blue-100 text-blue-700">Raund {round}/5</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
        <span className={`chip ${time <= 3 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-navy-100 text-navy-600'}`}>⏱ {time}s</span>
      </div>
      <div className="text-5xl font-display text-navy-800 my-8">{word?.en}</div>
      <p className="text-navy-400 text-sm mb-4">O'zbekchaga tarjima qiling</p>
      <input className="input !py-3 text-center text-lg mb-4" placeholder="Tarjima..." autoFocus
        value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
      <button onClick={check} className="btn-gold w-full">Tekshirish</button>
    </div>
  );
}

function MathGame({ onWin, onLose }) {
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [time, setTime] = useState(6);

  function gen() {
    const op = MATH_OPS[Math.floor(Math.random() * 3)];
    let a = Math.floor(Math.random() * 50) + 1;
    let b = Math.floor(Math.random() * 20) + 1;
    if (op === '*') { a = Math.floor(Math.random() * 12) + 2; b = Math.floor(Math.random() * 12) + 2; }
    if (op === '-' && a < b) [a, b] = [b, a];
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ a, b, op, ans }); setInput(''); setRound(r => r + 1); setTime(6);
  }
  useEffect(() => { gen(); }, []);
  useEffect(() => {
    if (time <= 0) { if (score >= 4) onWin(score); else onLose(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  function check() {
    if (Number(input) === problem.ans) {
      setScore(s => s + 1);
      if (round >= 5) { onWin(score + 1); return; }
      gen();
    } else { setInput(''); }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-emerald-100 text-emerald-700">Raund {round}/5</span>
        <span className="chip bg-blue-100 text-blue-700">✅ {score}</span>
        <span className={`chip ${time <= 3 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-navy-100 text-navy-600'}`}>⏱ {time}s</span>
      </div>
      <div className="text-5xl font-display text-navy-800 my-8">
        {problem?.a} {problem?.op} {problem?.b} = ?
      </div>
      <input className="input !py-3 text-center text-lg mb-4" type="number" placeholder="Javob..." autoFocus
        value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
      <button onClick={check} className="btn-gold w-full">Tekshirish</button>
    </div>
  );
}

function ScrambleGame({ onWin, onLose }) {
  const [word, setWord] = useState(null);
  const [scrambled, setScrambled] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [time, setTime] = useState(9);

  function gen() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)].en;
    const arr = w.split(''); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    setWord(w); setScrambled(arr.join('')); setInput(''); setRound(r => r + 1); setTime(9);
  }
  useEffect(() => { gen(); }, []);
  useEffect(() => {
    if (time <= 0) { if (score >= 4) onWin(score); else onLose(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  function check() {
    if (input.toLowerCase().trim() === word) {
      setScore(s => s + 1);
      if (round >= 5) { onWin(score + 1); return; }
      gen();
    }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-violet-100 text-violet-700">Raund {round}/5</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
        <span className={`chip ${time <= 3 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-navy-100 text-navy-600'}`}>⏱ {time}s</span>
      </div>
      <div className="flex justify-center gap-2 my-8">
        {scrambled.split('').map((c, i) => (
          <div key={i} className="w-12 h-14 rounded-xl bg-gradient-to-b from-violet-100 to-violet-50 border-2 border-violet-200 flex items-center justify-center text-2xl font-bold text-violet-700 shadow-sm">{c.toUpperCase()}</div>
        ))}
      </div>
      <input className="input !py-3 text-center text-lg mb-4" placeholder="So'zni yozing..." autoFocus
        value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} />
      <button onClick={check} className="btn-gold w-full">Tekshirish</button>
    </div>
  );
}

function ReactionGame({ onWin, onLose }) {
  const [phase, setPhase] = useState('wait');
  const [startTime, setStartTime] = useState(0);
  const [times, setTimes] = useState([]);
  const [round, setRound] = useState(0);
  const timerRef = useRef(null);

  function start() {
    setPhase('red');
    const delay = 1500 + Math.random() * 3000;
    timerRef.current = setTimeout(() => { setPhase('green'); setStartTime(Date.now()); }, delay);
  }
  useEffect(() => { start(); return () => clearTimeout(timerRef.current); }, []);

  function click() {
    if (phase === 'red') { clearTimeout(timerRef.current); setPhase('early'); return; }
    if (phase === 'green') {
      const t = Date.now() - startTime;
      const newTimes = [...times, t];
      setTimes(newTimes);
      setRound(r => r + 1);
      if (newTimes.length >= 5) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        if (avg < 350) onWin(5); else if (avg < 550) onWin(3); else onWin(1);
        return;
      }
      setPhase('wait');
      setTimeout(start, 500);
    }
  }

  const bg = phase === 'red' ? 'bg-red-500' : phase === 'green' ? 'bg-emerald-500' : phase === 'early' ? 'bg-amber-500' : 'bg-navy-200';

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-rose-100 text-rose-700">Raund {round + 1}/5</span>
        {times.length > 0 && <span className="chip bg-emerald-100 text-emerald-700">Oxirgi: {times[times.length - 1]}ms</span>}
      </div>
      <button onClick={click} className={`w-full h-48 rounded-2xl ${bg} text-white text-2xl font-bold transition-all shadow-lg`}>
        {phase === 'wait' ? 'Tayyorlaning...' : phase === 'red' ? "YASHIL BO'LSIN..." : phase === 'green' ? 'BOSING!' : 'Erta bosdingiz! 😅'}
      </button>
      {phase === 'early' && <button onClick={() => { setPhase('wait'); setTimeout(start, 300); }} className="btn-ghost mt-4">Qayta urinish</button>}
      {times.length > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          {times.map((t, i) => (
            <div key={i} className={`chip ${t < 400 ? 'bg-emerald-100 text-emerald-700' : t < 600 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{t}ms</div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizGame({ onWin, onLose }) {
  const [q, setQ] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState('');
  const used = useRef(new Set());

  function next() {
    const bank = [...QUIZ, ...(EXTRA_QUESTIONS.umumiy || [])];
    let idx;
    do { idx = Math.floor(Math.random() * bank.length); } while (used.current.has(idx) && used.current.size < bank.length);
    used.current.add(idx);
    setQ(bank[idx]); setRound(r => r + 1); setFeedback('');
  }
  useEffect(() => { next(); }, []);

  function answer(opt) {
    if (opt === q.a) {
      setScore(s => s + 1); setFeedback('✅');
      if (round >= 6) { setTimeout(() => onWin(score + 1), 500); return; }
    } else { setFeedback('❌ ' + q.a); }
    setTimeout(next, 800);
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-cyan-100 text-cyan-700">Savol {round}/6</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
      </div>
      <div className="text-xl font-bold text-navy-800 my-6">{q?.q}</div>
      <div className="grid grid-cols-2 gap-3">
        {q?.opts.map(opt => (
          <button key={opt} onClick={() => answer(opt)}
            className="rounded-xl border-2 border-navy-100 px-4 py-4 text-sm font-bold text-navy-700 hover:border-gold hover:bg-gold/5 transition">{opt}</button>
        ))}
      </div>
      {feedback && <div className="mt-4 text-lg font-bold">{feedback}</div>}
    </div>
  );
}

function MemoryGame({ onWin, onLose }) {
  const [seq, setSeq] = useState([]);
  const [input, setInput] = useState('');
  const [showing, setShowing] = useState(true);
  const [level, setLevel] = useState(4);
  const [score, setScore] = useState(0);

  function gen(len) {
    const s = Array.from({ length: len }, () => Math.floor(Math.random() * 10));
    setSeq(s); setShowing(true); setInput('');
    setTimeout(() => setShowing(false), 1200 + len * 250);
  }
  useEffect(() => { gen(level); }, []);

  function check() {
    if (input === seq.join('')) {
      setScore(s => s + 1);
      if (level >= 9) { onWin(score + 1); return; }
      setLevel(l => l + 1);
      gen(level + 1);
    } else { if (score >= 3) onWin(score); else onLose(); }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-amber-100 text-amber-700">Level {level - 3}/5</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
      </div>
      {showing ? (
        <div className="flex justify-center gap-2 my-8">
          {seq.map((n, i) => (
            <div key={i} className="w-14 h-16 rounded-xl bg-gradient-to-b from-amber-100 to-amber-50 border-2 border-amber-300 flex items-center justify-center text-3xl font-bold text-amber-700 shadow animate-fade" style={{ animationDelay: `${i * 100}ms` }}>{n}</div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-navy-400 mb-4">Raqamlarni eslang va kiriting</p>
          <input className="input !py-3 text-center text-2xl tracking-widest mb-4" autoFocus maxLength={seq.length}
            value={input} onChange={e => setInput(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && check()} />
          <button onClick={check} className="btn-gold w-full">Tekshirish</button>
        </div>
      )}
    </div>
  );
}

function TypingGame({ onWin, onLose }) {
  const [sentence, setSentence] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [time, setTime] = useState(10);

  function next() {
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setInput(''); setRound(r => r + 1); setTime(10);
  }
  useEffect(() => { next(); }, []);
  useEffect(() => {
    if (time <= 0) { if (score >= 3) onWin(score); else onLose(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  function check(val) {
    setInput(val);
    if (val.trim() === sentence) {
      setScore(s => s + 1);
      if (round >= 4) { onWin(score + 1); return; }
      next();
    }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-sky-100 text-sky-700">Raund {round}/5</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
        <span className={`chip ${time <= 4 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-navy-100 text-navy-600'}`}>⏱ {time}s</span>
      </div>
      <div className="text-xl font-bold text-navy-800 my-6 leading-relaxed">{sentence}</div>
      <input className="input !py-3 text-center text-base mb-4" placeholder="Shu yerga yozing..." autoFocus
        value={input} onChange={e => check(e.target.value)} />
    </div>
  );
}

function ColorMatchGame({ onWin, onLose }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [word, setWord] = useState(null);
  const [ink, setInk] = useState(null);
  const [opts, setOpts] = useState([]);
  const [time, setTime] = useState(6);

  function next() {
    const w = COLOR_SET[Math.floor(Math.random() * COLOR_SET.length)];
    const i = COLOR_SET[Math.floor(Math.random() * COLOR_SET.length)];
    setWord(w); setInk(i);
    let shuffled = [...COLOR_SET].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!shuffled.find(c => c.hex === i.hex)) shuffled[0] = i;
    setOpts(shuffled.sort(() => Math.random() - 0.5));
    setRound(r => r + 1); setTime(6);
  }
  useEffect(() => { next(); }, []);
  useEffect(() => {
    if (time <= 0) { if (score >= 4) onWin(score); else onLose(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  function answer(c) {
    if (c.hex === ink.hex) {
      setScore(s => s + 1);
      if (round >= 6) { onWin(score + 1); return; }
      next();
    } else { setTime(t => Math.max(1, t - 3)); }
  }

  return (
    <div className="text-center">
      <div className="flex justify-between mb-4">
        <span className="chip bg-fuchsia-100 text-fuchsia-700">Raund {round}/6</span>
        <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
        <span className={`chip ${time <= 3 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-navy-100 text-navy-600'}`}>⏱ {time}s</span>
      </div>
      <p className="text-navy-400 text-sm mb-2">So'z rangini toping (mazmunini emas!)</p>
      <div className="text-4xl font-display my-6" style={{ color: ink?.hex }}>{word?.name}</div>
      <div className="grid grid-cols-4 gap-3">
        {opts.map((c, i) => (
          <button key={i} onClick={() => answer(c)} className="h-14 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-transform" style={{ background: c.hex }} />
        ))}
      </div>
    </div>
  );
}

function createSubjectQuiz(subjectKey, baseBank, chipClass) {
  return function SubjectQuizGame({ onWin, onLose }) {
    const [q, setQ] = useState(null);
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(0);
    const [feedback, setFeedback] = useState('');
    const used = useRef(new Set());

    function next() {
      const bank = [...baseBank, ...(EXTRA_QUESTIONS[subjectKey] || [])];
      let idx;
      do { idx = Math.floor(Math.random() * bank.length); } while (used.current.has(idx) && used.current.size < bank.length);
      used.current.add(idx);
      setQ(bank[idx]); setRound(r => r + 1); setFeedback('');
    }
    useEffect(() => { next(); }, []);

    function answer(opt) {
      if (opt === q.a) {
        setScore(s => s + 1); setFeedback('✅');
        if (round >= 6) { setTimeout(() => onWin(score + 1), 500); return; }
      } else { setFeedback('❌ ' + q.a); }
      setTimeout(next, 800);
    }

    return (
      <div className="text-center">
        <div className="flex justify-between mb-4">
          <span className={`chip ${chipClass}`}>Savol {round}/6</span>
          <span className="chip bg-emerald-100 text-emerald-700">✅ {score}</span>
        </div>
        <div className="text-xl font-bold text-navy-800 my-6">{q?.q}</div>
        <div className="grid grid-cols-2 gap-3">
          {q?.opts.map(opt => (
            <button key={opt} onClick={() => answer(opt)}
              className="rounded-xl border-2 border-navy-100 px-4 py-4 text-sm font-bold text-navy-700 hover:border-gold hover:bg-gold/5 transition">{opt}</button>
          ))}
        </div>
        {feedback && <div className="mt-4 text-lg font-bold">{feedback}</div>}
      </div>
    );
  };
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.6 + Math.random() * 1.2,
    color: ['#C6A15B', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b'][i % 6],
    rotate: Math.random() * 360,
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-0 w-2 h-3 rounded-sm animate-confetti"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)` }} />
      ))}
    </div>
  );
}

const GAME_MAP = {
  word: WordGame, math: MathGame, scramble: ScrambleGame, memory: MemoryGame, reaction: ReactionGame, quiz: QuizGame,
  typing: TypingGame, colormatch: ColorMatchGame,
  tarix: createSubjectQuiz('tarix', TARIX_BANK, 'bg-amber-100 text-amber-700'),
  huquq: createSubjectQuiz('huquq', HUQUQ_BANK, 'bg-slate-100 text-slate-700'),
  matematika: createSubjectQuiz('matematika', MATEMATIKA_BANK, 'bg-emerald-100 text-emerald-700'),
  ingliz: createSubjectQuiz('ingliz', INGLIZ_BANK, 'bg-blue-100 text-blue-700'),
  koreys: createSubjectQuiz('koreys', KOREYS_BANK, 'bg-rose-100 text-rose-700'),
  nemis: createSubjectQuiz('nemis', NEMIS_BANK, 'bg-neutral-100 text-neutral-700'),
};

export default function MiniGames() {
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    api.get('/quiz_questions').then((rows) => {
      for (const key of Object.keys(EXTRA_QUESTIONS)) delete EXTRA_QUESTIONS[key];
      for (const row of rows || []) {
        if (row.status === 'archived') continue;
        const subject = row.subject || 'umumiy';
        if (!EXTRA_QUESTIONS[subject]) EXTRA_QUESTIONS[subject] = [];
        EXTRA_QUESTIONS[subject].push({
          q: row.question, a: row.answer,
          opts: [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean),
        });
      }
    }).catch(() => {});
  }, []);

  const MIN_COINS_PER_PLAY = 5;
  const MAX_COINS_PER_PLAY = 10;
  async function handleWin(score) {
    const game = GAMES.find(g => g.id === active);
    const coins = Math.max(MIN_COINS_PER_PLAY, Math.min(game.reward * score, MAX_COINS_PER_PLAY));
    setResult({ won: true, coins, score });
    setTotalCoins(t => t + coins);
    try {
      const students = await api.get('/students').catch(() => []);
      const me = (students || []).find(s => s.full_name === user.full_name);
      if (me) await api.post('/coins/give', { student_id: me.id, amount: coins, reason: game.name + ' — ' + score + ' ball' }).catch(() => {});
    } catch {}
  }

  function handleLose() { setResult({ won: false, coins: 0, score: 0 }); }

  const GameComponent = active ? GAME_MAP[active] : null;

  return (
    <div>
      <PageHeader icon={Gamepad2} title="Mini o'yinlar" subtitle={`O'ynab coin yuting! Bugun: 🪙 ${totalCoins}`} />

      {!active ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g, i) => (
            <button key={`${g.id}-${i}`} onClick={() => { setActive(g.id); setResult(null); }}
              className="card p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all animate-fade" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br ${g.color} text-3xl mb-4 shadow-lg`}>{g.icon}</div>
              <div className="font-display text-lg text-navy-800 mb-1">{g.name}</div>
              <div className="text-sm text-navy-400 mb-3">{g.desc}</div>
              <div className="chip bg-gold/10 text-gold-700">🪙 +{g.reward} coin/to'g'ri</div>
            </button>
          ))}
        </div>
      ) : result ? (
        <div className="relative max-w-md mx-auto card p-8 text-center animate-fade overflow-hidden">
          {result.won && <Confetti />}
          <div className="text-6xl mb-4 animate-bounce">{result.won ? '🎉' : '😔'}</div>
          <div className="font-display text-2xl text-navy-800 mb-2">{result.won ? 'Tabriklaymiz!' : 'Qayta urinib ko\'ring!'}</div>
          {result.won && (
            <div className="rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold/20 p-4 my-4 animate-pulse-gold">
              <div className="text-sm text-navy-500">Yutilgan coin</div>
              <div className="font-display text-3xl text-gold-600">🪙 +{result.coins}</div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setActive(null)} className="btn-ghost flex-1"><RotateCcw size={16} /> Bosh menyu</button>
            <button onClick={() => setResult(null)} className="btn-gold flex-1"><Star size={16} /> Qayta o'ynash</button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <button onClick={() => setActive(null)} className="btn-ghost mb-4 text-sm">← Orqaga</button>
          <div className="card p-6">
            <GameComponent onWin={handleWin} onLose={handleLose} />
          </div>
        </div>
      )}
    </div>
  );
}
