import bcrypt from 'bcryptjs';
import { store } from './db.js';
import { EXTRA_TABLES, EXTRA_COLUMNS } from './seedExtras.js';

const HASH = bcrypt.hashSync('123456', 8); // all demo accounts share password 123456
const BRANCH = 'Sherobod — Bosh filial';

// helper: map tuple rows -> objects with sequential ids
function rows(cols, tuples, extra = {}) {
  return tuples.map((t, i) => {
    const o = { id: i + 1 };
    cols.forEach((c, j) => { o[c] = t[j]; });
    return { ...o, ...extra };
  });
}

// ── 30 demo accounts across all 18 roles ──
const userTuples = [
  ['998993212141', 'director', 'Husniddin Khayitov', ''],
  ['998900000002', 'super_admin', 'Aziza Karimova', ''],
  ['998900000003', 'admin', 'Bobur Aliyev', ''],
  ['998900000004', 'academic_manager', 'Dilshod Rahimov', ''],
  ['998900000005', 'reception', 'Gulnoza Islomova', ''],
  ['998900000006', 'reception', 'Shahnoza Yuldosheva', ''],
  ['998900000007', 'hr', 'Feruza Abdullayeva', ''],
  ['998900000008', 'accountant', 'Otabek Saidov', ''],
  ['998900000009', 'cashier', 'Nodira Umarova', ''],
  ['998900000010', 'marketing', 'Jasur Toshmatov', ''],
  ['998900000011', 'smm', 'Kamola Nazarova', ''],
  ['998900000012', 'call_center', 'Sardor Qodirov', ''],
  ['998900000013', 'methodologist', 'Malika Tosheva', ''],
  ['998900000014', 'librarian', 'Ozoda Yusupova', ''],
  ['998900000015', 'it_admin', 'Jumayev Baxtbek', ''],
  ['998900000016', 'senior_teacher', 'Jasurbek Boboqulov', 'Ingliz tili (CEFR)'],
  ['998900000017', 'teacher', 'Sardorbek Ergashev', 'Ingliz tili A1 — Ertalabki'],
  ['998900000018', 'teacher', 'Nigora Qodirova', 'Ingliz tili B1 — Kechki'],
  ['998900000019', 'teacher', 'Baxtiyor Karimov', 'Matematika'],
  ['998900000020', 'teacher', 'Elena Petrova', 'Rus tili A2'],
  ['998900000021', 'teacher', 'Ozoda Kim', 'Koreys tili A1'],
  ['998900000022', 'teacher', 'Madina Karimova', 'IELTS'],
  ['998900000023', 'teacher', "Akmal Yo'ldoshev", 'Tarix'],
  ['998900000024', 'teacher', 'Dilnoza Sattorova', 'Huquq'],
  ['998900000025', 'parent', 'Azizov Otabek', ''],
  ['998900000026', 'parent', 'Karimova Nilufar', ''],
  ['998900000027', 'student', 'Diyorbek Azizov', 'Ingliz tili A1 — Ertalabki'],
  ['998900000028', 'student', 'Sevara Karimova', 'Ingliz tili B1 — Kechki'],
  ['998900000029', 'student', 'Bexruz Sobirov', 'IT — Olimpiada'],
  ['998900000030', 'student', 'Madina Yuldosheva', 'IELTS'],
  ['998900000060', 'founder', 'Xurshid Toshmatov', ''],
  ['998900000061', 'branch_manager', 'Sherzod Karimov', 'Termiz filiali'],
  ['998900000062', 'head_teacher', 'Barno Ergasheva', ''],
  ['998900000063', 'assistant_teacher', 'Laziz Sobirov', 'Ingliz tili A1'],
  ['998900000064', 'mentor', 'Sanjar Aliyev', 'IT / Olimpiada'],
  ['998900000065', 'qa_manager', 'Zilola Tursunova', ''],
  ['998900000066', 'guest', 'Mehmon User', ''],
];
const users = userTuples.map((t, i) => ({
  id: i + 1, phone: t[0], password_hash: HASH, role: t[1], full_name: t[2],
  group_name: t[3], branch: BRANCH, active: 1,
}));

const students = rows(
  ['full_name', 'phone', 'group_name', 'teacher', 'lang', 'level', 'coins', 'points', 'streak', 'progress', 'paid', 'status'],
  [
    ['Diyorbek Azizov', '+998900000027', 'Ingliz tili A1 — Ertalabki', 'Sardorbek Ergashev', 'Ingliz tili', 'A1', 120, 5200, 7, 55, 1, 'active'],
    ['Sevara Karimova', '+998900000028', 'Ingliz tili B1 — Kechki', 'Nigora Qodirova', 'Ingliz tili', 'B1', 200, 7100, 12, 78, 1, 'active'],
    ['Jahongir Toshmatov', '+998900000031', 'Ingliz tili — CEFR', 'Jasurbek Boboqulov', 'Ingliz tili', 'B2', 90, 3800, 3, 45, 0, 'active'],
    ['Madina Yuldosheva', '+998900000030', 'IELTS', 'Madina Karimova', 'IELTS', 'B2', 160, 6400, 9, 70, 1, 'active'],
    ['Ulugbek Rahimov', '+998900000032', 'Koreys tili A1', 'Ozoda Kim', 'Koreys tili', 'A1', 60, 1900, 2, 25, 0, 'active'],
    ['Kamola Ismoilova', '+998900000033', 'Rus tili A2', 'Elena Petrova', 'Rus tili', 'A2', 110, 4200, 5, 60, 1, 'active'],
    ['Bexruz Sobirov', '+998900000029', 'IT / Olimpiada', 'Jumayev Baxtbek', 'IT', 'Pro', 230, 9200, 15, 85, 1, 'active'],
    ['Oysha Nazarova', '+998900000034', 'Matematika — Abituriyent', 'Baxtiyor Karimov', 'Matematika', '—', 140, 5600, 6, 66, 1, 'active'],
    ['Sarvar Qodirov', '+998900000035', 'Ingliz tili B1 — Kechki', 'Nigora Qodirova', 'Ingliz tili', 'B1', 130, 4900, 6, 62, 1, 'active'],
    ['Nilufar Ergasheva', '+998900000036', 'IELTS', 'Madina Karimova', 'IELTS', 'B1', 180, 6800, 11, 73, 1, 'active'],
    ['Doston Murodov', '+998900000037', 'Tarix — Abituriyent', "Akmal Yo'ldoshev", 'Tarix', '—', 75, 2700, 1, 38, 0, 'active'],
    ['Zarina Halimova', '+998900000038', 'Huquq — Abituriyent', 'Dilnoza Sattorova', 'Huquq', '—', 95, 3300, 4, 42, 1, 'active'],
    ['Asadbek Yusupov', '+998900000039', 'IT / Olimpiada', 'Jumayev Baxtbek', 'IT', 'Pro', 260, 11200, 18, 92, 1, 'active'],
    ['Feruza Sattorova', '+998900000040', 'Matematika — Abituriyent', 'Baxtiyor Karimov', 'Matematika', '—', 50, 1600, 3, 30, 1, 'active'],
    ['Farrux Toshmatov', '+998900000041', 'IELTS', 'Madina Karimova', 'IELTS', 'B2', 170, 6100, 8, 68, 1, 'active'],
    ['Dilshoda Ergasheva', '+998900000042', 'Ingliz tili A1 — Ertalabki', 'Sardorbek Ergashev', 'Ingliz tili', 'A1', 80, 2800, 4, 35, 1, 'active'],
    ['Otabek Jumayev', '+998900000043', 'Matematika — Abituriyent', 'Baxtiyor Karimov', 'Matematika', '—', 115, 4500, 7, 58, 1, 'active'],
    ['Shahlo Karimova', '+998900000044', 'Koreys tili A1', 'Ozoda Kim', 'Koreys tili', 'A1', 90, 3100, 5, 40, 0, 'active'],
    ['Nodir Raxmatullayev', '+998900000045', 'IT / Olimpiada', 'Jumayev Baxtbek', 'IT', 'Pro', 200, 8400, 14, 80, 1, 'active'],
    ['Sabina Aliyeva', '+998900000046', 'Tarix — Abituriyent', "Akmal Yo'ldoshev", 'Tarix', '—', 65, 2200, 3, 32, 0, 'active'],
    ['Komila Tursunova', '+998900000047', 'IELTS', 'Madina Karimova', 'IELTS', 'B1', 130, 5200, 9, 55, 1, 'active'],
    ['Jasur Alimov', '+998900000048', 'Ingliz tili A1 — Ertalabki', 'Sardorbek Ergashev', 'Ingliz tili', 'A1', 60, 2100, 3, 28, 1, 'active'],
    ['Dilfuza Rahimova', '+998900000049', 'Koreys tili A1', 'Ozoda Kim', 'Koreys tili', 'A1', 95, 3400, 6, 42, 1, 'active'],
    ['Azizbek Toshmatov', '+998900000050', 'Matematika — Abituriyent', 'Baxtiyor Karimov', 'Matematika', '—', 140, 5800, 10, 62, 1, 'active'],
    ['Mohira Yusupova', '+998900000051', 'Ingliz tili — CEFR', 'Jasurbek Boboqulov', 'Ingliz tili', 'B2', 180, 7200, 12, 72, 1, 'active'],
    ['Sardor Karimov', '+998900000052', 'IT / Olimpiada', 'Jumayev Baxtbek', 'IT', 'Pro', 220, 9100, 16, 85, 1, 'active'],
    ['Gulbahor Ergasheva', '+998900000053', 'Tarix — Abituriyent', "Akmal Yo'ldoshev", 'Tarix', '—', 75, 2800, 4, 35, 0, 'active'],
    ['Islom Sobirov', '+998900000054', 'Huquq — Abituriyent', 'Dilnoza Sattorova', 'Huquq', '—', 110, 4300, 7, 50, 1, 'active'],
    ['Nodira Aliyeva', '+998900000055', 'IELTS', 'Madina Karimova', 'IELTS', 'B2', 160, 6400, 11, 68, 1, 'active'],
    ['Bekzod Rahimov', '+998900000056', 'Ingliz tili B1 — Kechki', 'Nigora Qodirova', 'Ingliz tili', 'B1', 100, 3800, 5, 45, 1, 'active'],
    ['Malika Tursunova', '+998900000057', 'Matematika — Abituriyent', 'Baxtiyor Karimov', 'Matematika', '—', 125, 4900, 8, 52, 0, 'active'],
    ['Javohir Karimov', '+998900000058', 'IT / Olimpiada', 'Jumayev Baxtbek', 'IT', 'Pro', 240, 10500, 19, 90, 1, 'active'],
    ['Sevinch Ergasheva', '+998900000059', 'Koreys tili A1', 'Ozoda Kim', 'Koreys tili', 'A1', 85, 3000, 4, 38, 1, 'active'],
  ]);

const teachers = rows(
  ['full_name', 'phone', 'langs', 'level', 'groups_count', 'rating', 'salary', 'status'],
  [
    ['Jasurbek Boboqulov', '+998900000016', 'Ingliz tili (CEFR)', 'Senior', 2, 4.9, 8000000, 'active'],
    ['Sardorbek Ergashev', '+998900000017', 'Ingliz tili', 'Middle', 2, 4.7, 6800000, 'active'],
    ['Nigora Qodirova', '+998900000018', 'Ingliz tili', 'Middle', 2, 4.8, 6500000, 'active'],
    ['Baxtiyor Karimov', '+998900000019', 'Matematika', 'Senior', 2, 4.8, 7200000, 'active'],
    ['Elena Petrova', '+998900000020', 'Rus tili', 'Native', 1, 5.0, 6000000, 'active'],
    ['Ozoda Kim', '+998900000021', 'Koreys tili', 'Native', 2, 4.9, 6500000, 'active'],
    ['Madina Karimova', '+998900000022', 'IELTS', 'Senior', 2, 4.8, 7000000, 'active'],
    ["Akmal Yo'ldoshev", '+998900000023', 'Tarix', 'Middle', 1, 4.7, 5500000, 'active'],
    ['Dilnoza Sattorova', '+998900000024', 'Huquq', 'Middle', 1, 4.6, 5200000, 'active'],
    ['Jumayev Baxtbek', '+998900000015', 'IT (dasturlash)', 'Senior', 1, 4.9, 7500000, 'active'],
  ]);

const groups = rows(
  ['name', 'teacher', 'reception', 'level', 'room', 'days', 'course_id', 'students_count', 'invite_code'],
  [
    ['Ingliz tili A1 — Ertalabki', 'Sardorbek Ergashev', 'Gulnoza Islomova', 'A1', '101-xona', 'Du-Cho-Ju 09:00', 1, 12, 'ENGA1-2026'],
    ['Ingliz tili B1 — Kechki', 'Nigora Qodirova', 'Gulnoza Islomova', 'B1', '102-xona', 'Se-Pa-Sh 18:00', 1, 10, 'ENGB1-2026'],
    ['Ingliz tili — CEFR', 'Jasurbek Boboqulov', 'Shahnoza Yuldosheva', 'B2', '103-xona', 'Har kuni 16:00', 3, 14, 'CEFR-2026'],
    ['IELTS', 'Madina Karimova', 'Shahnoza Yuldosheva', 'B2+', '201-xona', 'Se-Pa-Sh 14:00', 2, 11, 'IELTS-2026'],
    ['Koreys tili A1', 'Ozoda Kim', 'Gulnoza Islomova', 'A1', '202-xona', 'Du-Cho-Ju 15:00', 4, 9, 'KOR-2026'],
    ['Rus tili A2', 'Elena Petrova', 'Gulnoza Islomova', 'A2', '203-xona', 'Se-Pa 17:00', 5, 8, 'RUS-2026'],
    ['Matematika — Abituriyent', 'Baxtiyor Karimov', 'Shahnoza Yuldosheva', '—', '204-xona', 'Du-Cho-Ju 11:00', 6, 15, 'MATH-2026'],
    ['Tarix — Abituriyent', "Akmal Yo'ldoshev", 'Gulnoza Islomova', '—', '105-xona', 'Se-Pa 10:00', 7, 12, 'HIST-2026'],
    ['Huquq — Abituriyent', 'Dilnoza Sattorova', 'Shahnoza Yuldosheva', '—', '106-xona', 'Cho-Sh 13:00', 8, 10, 'LAW-2026'],
    ['IT / Olimpiada', 'Jumayev Baxtbek', 'Shahnoza Yuldosheva', 'Pro', '301-xona', 'Du-Ju 18:00', 9, 13, 'IT-2026'],
  ]);

const courses = rows(
  ['name', 'icon', 'color', 'level', 'price', 'modules_count'],
  [
    ['Ingliz tili (General)', '🇬🇧', '#2196F3', 'A1–B2', 450000, 6],
    ['Ingliz tili — IELTS', '🎯', '#E91E63', 'B2–C1', 700000, 4],
    ['Ingliz tili — CEFR', '📊', '#009688', 'A2–C1', 550000, 4],
    ['Koreys tili (TOPIK)', '🇰🇷', '#3F51B5', 'A1–B1', 500000, 3],
    ['Rus tili', '🇷🇺', '#F44336', 'A1–B1', 400000, 3],
    ['Matematika', '➗', '#FF9800', 'Maktab + abituriyent', 400000, 8],
    ['Tarix', '📜', '#795548', 'Abituriyent', 350000, 6],
    ['Huquq', '⚖️', '#607D8B', 'Abituriyent', 380000, 5],
    ['IT (dasturlash)', '💻', '#00BCD4', "Boshlang'ich–Pro", 600000, 10],
    ['Olimpiada tayyorgarlik', '🏅', '#C6A15B', 'Yuqori daraja', 500000, 6],
  ]);

const payments = rows(
  ['student', 'group_name', 'amount', 'date', 'status', 'method'],
  [
    ['Diyorbek Azizov', 'Ingliz tili A1 — Ertalabki', 450000, '2026-08-05', 'paid', 'Payme'],
    ['Sevara Karimova', 'Ingliz tili B1 — Kechki', 450000, '2026-08-05', 'paid', 'Click'],
    ['Madina Yuldosheva', 'IELTS', 700000, '2026-08-06', 'paid', 'Naqd'],
    ['Bexruz Sobirov', 'Ingliz tili — CEFR', 550000, '2026-08-06', 'paid', 'Karta'],
    ['Jahongir Toshmatov', 'Ingliz tili — CEFR', 450000, '', 'pending', ''],
    ['Oysha Nazarova', 'Ingliz tili A1 — Ertalabki', 450000, '', 'pending', ''],
    ['Ulugbek Rahimov', 'Koreys tili A1', 500000, '', 'pending', ''],
    ['Kamola Ismoilova', 'Rus tili A2', 400000, '2026-08-07', 'paid', 'Uzum Bank'],
    ['Sarvar Qodirov', 'Ingliz tili B1 — Kechki', 450000, '2026-08-07', 'paid', 'Click'],
    ['Nilufar Ergasheva', 'IELTS', 700000, '2026-08-07', 'paid', 'Payme'],
    ['Doston Murodov', 'Ingliz tili — CEFR', 450000, '', 'pending', ''],
    ['Zarina Halimova', 'Koreys tili A1', 500000, '2026-08-08', 'paid', 'Naqd'],
    ['Asadbek Yusupov', 'Ingliz tili — CEFR', 550000, '2026-08-08', 'paid', 'Karta'],
    ['Feruza Sattorova', 'Matematika — Abituriyent', 350000, '2026-08-08', 'paid', 'Payme'],
    ['Farrux Toshmatov', 'IELTS', 700000, '2026-08-09', 'paid', 'Click'],
    ['Dilshoda Ergasheva', 'Ingliz tili A1', 450000, '2026-08-09', 'paid', 'Naqd'],
    ['Nodir Raxmatullayev', 'IT / Olimpiada', 600000, '2026-08-10', 'paid', 'Payme'],
    ['Otabek Jumayev', 'Matematika', 400000, '', 'pending', ''],
    ['Komila Tursunova', 'IELTS', 650000, '2026-08-10', 'paid', 'Click'],
    ['Jasur Alimov', 'Ingliz tili A1', 400000, '2026-08-11', 'paid', 'Naqd'],
    ['Azizbek Toshmatov', 'Matematika', 350000, '2026-08-11', 'paid', 'Payme'],
    ['Mohira Yusupova', 'Ingliz tili CEFR', 550000, '2026-08-12', 'paid', 'Karta'],
    ['Sardor Karimov', 'IT', 500000, '2026-08-12', 'paid', 'Click'],
    ['Islom Sobirov', 'Huquq', 300000, '', 'pending', ''],
    ['Nodira Aliyeva', 'IELTS', 700000, '2026-08-13', 'paid', 'Uzum Bank'],
    ['Bekzod Rahimov', 'Ingliz tili B1', 450000, '', 'pending', ''],
    ['Javohir Karimov', 'IT', 600000, '2026-08-14', 'paid', 'Payme'],
    ['Dilfuza Rahimova', 'Koreys tili', 500000, '2026-08-14', 'paid', 'Naqd'],
  ]);

const leads = rows(
  ['name', 'phone', 'source', 'status', 'assigned_to', 'note', 'date'],
  [
    ['Sitora Abdullayeva', '+998911112233', 'Instagram', 'new', 'Sardor Qodirov', "IELTS haqida so'radi", '2026-04-20'],
    ['Jamshid Turayev', '+998911112234', 'Telegram', 'contacted', 'Kamola Nazarova', 'Demo darsga yozildi', '2026-04-19'],
    ['Laylo Ismatova', '+998911112235', 'Tavsiya', 'trial', 'Sardor Qodirov', 'Koreys tili guruhiga qiziqdi', '2026-04-18'],
    ['Otabek Rustamov', '+998911112236', 'Instagram', 'new', 'Jasur Toshmatov', '', '2026-04-21'],
    ['Malika Yusupova', '+998911112237', 'Facebook', 'won', 'Kamola Nazarova', 'Ingliz tili A1 ga yozildi', '2026-08-15'],
    ['Sardor Aliyev', '+998911112238', 'Telegram', 'lost', 'Sardor Qodirov', 'Narx qimmat dedi', '2026-04-14'],
    ['Nozima Karimova', '+998911112239', 'Instagram', 'contacted', 'Jasur Toshmatov', '', '2026-04-22'],
    ['Bekzod Sattorov', '+998911112240', 'Tavsiya', 'trial', 'Kamola Nazarova', 'CEFR sinov darsi', '2026-04-22'],
  ]);

const attendance = rows(['group_name', 'date', 'present', 'absent', 'note'], [
  ['Ingliz tili A1 — Ertalabki', '2026-04-22', 8, 2, ''],
  ['IELTS', '2026-04-22', 10, 0, "To'liq"],
  ['Koreys tili A1', '2026-04-21', 7, 1, ''],
  ['Ingliz tili — CEFR', '2026-04-21', 9, 1, ''],
  ['Ingliz tili B1 — Kechki', '2026-04-20', 6, 3, ''],
  ['Rus tili A2', '2026-04-20', 5, 0, ''],
]);

const exams = rows(['title', 'group_name', 'date', 'type', 'max_score', 'status'], [
  ['IELTS Mock Exam', 'IELTS', '2026-09-15', 'Mock', 9, 'planned'],
  ['Progress Test — Unit 3', 'Ingliz tili A1 — Ertalabki', '2026-08-25', 'Progress', 100, 'planned'],
  ['CEFR Placement', 'Ingliz tili — CEFR', '2026-08-18', 'Placement', 100, 'done'],
  ['TOPIK I Practice', 'Koreys tili A1', '2026-09-10', 'Practice', 200, 'planned'],
  ['Final Exam — B1', 'Ingliz tili B1 — Kechki', '2026-10-01', 'Final', 100, 'planned'],
]);

const certificates = rows(['student', 'course', 'level', 'date', 'serial'], [
  ['Asadbek Yusupov', 'Ingliz tili — CEFR', 'C1', '2026-03-30', 'ISO-2026-0001'],
  ['Bexruz Sobirov', 'Ingliz tili — CEFR', 'B2', '2026-03-30', 'ISO-2026-0002'],
  ['Nilufar Ergasheva', 'IELTS', '6.5', '2026-03-15', 'ISO-2026-0003'],
  ['Sevara Karimova', 'Ingliz tili (General)', 'B1', '2026-02-20', 'ISO-2026-0004'],
]);

const branches = rows(['name', 'address', 'students_count', 'status'], [
  ['Sherobod — Bosh filial', "Sherobod sh., markaziy ko'cha", 14, 'active'],
  ['Termiz filiali', "Termiz sh., A.Navoiy ko'chasi", 6, 'active'],
  ['Denov filiali', "Denov sh., markaziy ko'cha", 0, 'planned'],
  ['Boysun filiali', "Boysun sh., bog' ko'chasi", 0, 'planned'],
]);

const roomsData = rows(['name', 'branch', 'capacity', 'status'], [
  ['101-xona', BRANCH, 12, 'busy'],
  ['102-xona', BRANCH, 12, 'busy'],
  ['103-xona', BRANCH, 14, 'busy'],
  ['201-xona', BRANCH, 10, 'free'],
  ['202-xona', BRANCH, 10, 'busy'],
  ['105-xona', BRANCH, 8, 'free'],
  ['106-xona', BRANCH, 10, 'busy'],
  ['107-xona', BRANCH, 14, 'free'],
  ['Katta zal', BRANCH, 50, 'free'],
]);

const expenses = rows(['title', 'amount', 'category', 'date'], [
  ['Ijara (bosh filial)', 9000000, 'Ijaralash', '2026-04-01'],
  ["O'qituvchilar ish haqi", 45000000, 'Ish haqi', '2026-04-05'],
  ['Marketing (Instagram/Telegram)', 2500000, 'Marketing', '2026-08-08'],
  ["O'quv materiallari", 3200000, 'Materiallar', '2026-04-03'],
]);

const salaries = rows(['name', 'role', 'base', 'bonus', 'total'], [
  ['Jasurbek Boboqulov', 'Senior Teacher', 7000000, 1000000, 8000000],
  ['Sardorbek Ergashev', 'Teacher', 6000000, 800000, 6800000],
  ['Gulnoza Islomova', 'Reception', 4000000, 300000, 4300000],
  ['Otabek Saidov', 'Accountant', 5000000, 0, 5000000],
  ['Feruza Abdullayeva', 'HR', 4500000, 200000, 4700000],
]);

const announcements = rows(['title', 'body', 'author', 'type', 'date'], [
  ['Yangi CEFR guruhi ochildi!', 'B2 daraja uchun yangi CEFR intensiv guruhi ochildi. Du-Cho-Ju 11:00, 204-xona.', 'Dilshod Rahimov', 'info', '2026-08-13'],
  ["To'lov eslatmasi", "Aprel oyi to'lovini 10-aprelgacha amalga oshiring.", 'Otabek Saidov', 'warn', '2026-08-08'],
  ['IELTS Mock imtihon', "Shanba 10:00 da IELTS Mock imtihon bo'lib o'tadi.", 'Jasurbek Boboqulov', 'info', '2026-08-07'],
  ['Olimpiada natijalarida g\'alaba!', 'Asadbek Yusupov IT olimpiadasida 1-o\'rin oldi!', 'Husniddin Khayitov', 'success', '2026-08-16'],
  ['Yangi IT guruhi ochildi', 'Du-Ju 18:00, 301-xona. O\'qituvchi: Jumayev Baxtbek', 'Dilshod Rahimov', 'info', '2026-08-15'],
]);

const lessons = rows(['title', 'subject', 'group_name', 'teacher', 'date', 'time', 'room', 'duration', 'status', 'video_url', 'coin_reward', 'note'], [
  ['Present Perfect — nazariya', 'Ingliz tili', 'Ingliz tili B1 — Kechki', 'Nigora Qodirova', '2026-08-11', '18:00', '101-xona', 90, 'done', 'https://video.iso-termizy.uz/eng-b1-present-perfect', 40, ''],
  ['IELTS Writing Task 2', 'IELTS', 'IELTS', 'Madina Karimova', '2026-08-12', '14:00', '201-xona', 120, 'planned', 'https://video.iso-termizy.uz/ielts-writing-2', 40, ''],
  ['Kvadrat tenglamalar', 'Matematika', 'Matematika — Abituriyent', 'Baxtiyor Karimov', '2026-08-11', '11:00', '204-xona', 90, 'done', 'https://video.iso-termizy.uz/math-kvadrat', 30, ''],
  ['Amir Temur davlati', 'Tarix', 'Tarix — Abituriyent', "Akmal Yo'ldoshev", '2026-08-08', '10:00', '105-xona', 80, 'done', 'https://video.iso-termizy.uz/tarix-temur', 25, ''],
  ['Konstitutsiya asoslari', 'Huquq', 'Huquq — Abituriyent', 'Dilnoza Sattorova', '2026-08-12', '13:00', '106-xona', 80, 'planned', '', 20, ''],
  ['Python — funksiyalar', 'IT', 'IT / Olimpiada', 'Jumayev Baxtbek', '2026-08-13', '18:00', '301-xona', 120, 'planned', 'https://video.iso-termizy.uz/it-python-func', 40, ''],
  ['Hangul — alifbo', 'Koreys tili', 'Koreys tili A1', 'Ozoda Kim', '2026-08-11', '15:00', '202-xona', 90, 'done', 'https://video.iso-termizy.uz/kor-hangul', 35, ''],
  ['CEFR Speaking Part 1', 'Ingliz tili', 'Ingliz tili — CEFR', 'Jasurbek Boboqulov', '2026-08-12', '16:00', '103-xona', 90, 'planned', 'https://video.iso-termizy.uz/cefr-speak-1', 40, ''],
]);

const assignments = rows(['title', 'subject', 'group_name', 'deadline', 'max_score', 'submitted', 'status'], [
  ['Essay: My future plans', 'Ingliz tili', 'Ingliz tili B1 — Kechki', '2026-08-18', 100, 7, 'open'],
  ['IELTS Task 1 report', 'IELTS', 'IELTS', '2026-04-27', 9, 5, 'open'],
  ["Masalalar to'plami №5", 'Matematika', 'Matematika — Abituriyent', '2026-04-26', 100, 12, 'open'],
  ['Tarixiy insho', 'Tarix', 'Tarix — Abituriyent', '2026-04-29', 100, 4, 'open'],
  ['Python: 10 masala', 'IT', 'IT / Olimpiada', '2026-04-30', 100, 9, 'open'],
  ['Grammar worksheet', 'Ingliz tili', 'Ingliz tili A1 — Ertalabki', '2026-04-24', 50, 10, 'closed'],
]);

const quizzes = rows(['title', 'subject', 'group_name', 'questions', 'duration', 'avg_score', 'status'], [
  ['Unit 3 Vocabulary', 'Ingliz tili', 'Ingliz tili A1 — Ertalabki', 20, 15, 78, 'active'],
  ['IELTS Listening test', 'IELTS', 'IELTS', 40, 30, 71, 'active'],
  ['Algebra blits-test', 'Matematika', 'Matematika — Abituriyent', 25, 20, 83, 'active'],
  ['Tarix: XIV-XV asr', 'Tarix', 'Tarix — Abituriyent', 30, 25, 69, 'active'],
  ['Python basics quiz', 'IT', 'IT / Olimpiada', 15, 20, 88, 'active'],
]);

const coin_log = rows(['student', 'amount', 'reason', 'given_by'], [
  ['Asadbek Yusupov', 40, "Olimpiada g'olibi", 'Jumayev Baxtbek'],
  ['Bexruz Sobirov', 30, 'Faol ishtirok', 'Baxtiyor Karimov'],
  ['Sevara Karimova', 25, "A'lo topshiriq", 'Nigora Qodirova'],
  ['Madina Yuldosheva', 20, 'IELTS mock 7.0', 'Madina Karimova'],
  ['Diyorbek Azizov', 15, 'Davomat 100%', 'Sardorbek Ergashev'],
], { at: '2026-04-22 10:00:00' });

const inventory = rows(['name', 'category', 'qty', 'location', 'status'], [
  ['Proyektor Epson', 'Texnika', 6, 'Sherobod — Bosh filial', 'active'],
  ['Doska (marker)', 'Jihoz', 10, 'Sherobod — Bosh filial', 'active'],
  ['Noutbuk HP', 'Texnika', 4, 'IT / Olimpiada', 'active'],
  ['Stol-stul to\'plami', 'Mebel', 120, 'Sherobod — Bosh filial', 'active'],
  ['Konditsioner', 'Texnika', 8, 'Sherobod — Bosh filial', 'repair'],
]);

const documents = rows(['title', 'type', 'owner', 'date', 'status'], [
  ['O\'quv markaz litsenziyasi', 'Litsenziya', 'Direksiya', '2025-09-01', 'active'],
  ['Ichki tartib-qoidalar', 'Nizom', 'HR', '2026-01-10', 'active'],
  ['O\'qituvchi shartnoma namunasi', 'Shablon', 'HR', '2026-02-01', 'active'],
  ['Yong\'in xavfsizligi bayonnomasi', 'Bayonnoma', 'Boshqaruv', '2026-03-15', 'active'],
]);

const contracts = rows(['title', 'party', 'start_date', 'end_date', 'amount', 'status'], [
  ['Ijara shartnomasi (bosh filial)', 'Sherobod IjaraServis', '2026-01-01', '2026-12-31', 108000000, 'active'],
  ['O\'qituvchi mehnat shartnomasi', 'Madina Karimova', '2026-02-01', '2027-01-31', 0, 'active'],
  ['Internet provayder', 'UzTelecom', '2026-01-01', '2026-12-31', 6000000, 'active'],
  ['Marketing (SMM agentlik)', 'Digital Termiz', '2026-03-01', '2026-08-31', 15000000, 'active'],
]);

const positions = rows(['title', 'department', 'headcount', 'base_salary'], [
  ['Direktor', 'Boshqaruv', 1, 15000000],
  ['Academic Manager', 'Akademik', 1, 9000000],
  ['O\'qituvchi', 'Akademik', 10, 6500000],
  ['Reception', 'Front-office', 2, 4000000],
  ['Buxgalter', 'Moliya', 1, 5000000],
  ['SMM / Marketing', 'Marketing', 2, 5000000],
  ['IT Admin', 'Texnik', 1, 7500000],
]);

const invoices = rows(['number', 'student', 'amount', 'date', 'due_date', 'status'], [
  ['INV-2026-001', 'Diyorbek Azizov', 450000, '2026-04-01', '2026-04-10', 'paid'],
  ['INV-2026-002', 'Sevara Karimova', 450000, '2026-04-01', '2026-04-10', 'paid'],
  ['INV-2026-003', 'Jahongir Toshmatov', 550000, '2026-04-05', '2026-08-15', 'unpaid'],
  ['INV-2026-004', 'Madina Yuldosheva', 700000, '2026-04-02', '2026-04-12', 'paid'],
  ['INV-2026-005', 'Ulugbek Rahimov', 500000, '2026-04-06', '2026-04-16', 'unpaid'],
]);

const discounts = rows(['name', 'percent', 'applies_to', 'valid_until', 'status'], [
  ['Aka-uka chegirmasi', 15, 'Barcha kurslar', '2026-12-31', 'active'],
  ['Erta to\'lov (10%)', 10, 'To\'liq to\'lov', '2026-12-31', 'active'],
  ['IELTS aksiya', 20, 'IELTS', '2026-06-30', 'active'],
  ['Yangi o\'quvchi', 10, 'Birinchi oy', '2026-09-01', 'active'],
]);

const messages = rows(['title', 'channel', 'audience', 'date', 'status'], [
  ['To\'lov eslatmasi', 'SMS', 'Qarzdorlar', '2026-08-08', 'sent'],
  ['Dars boshlanishi', 'Telegram', 'Barcha o\'quvchilar', '2026-04-10', 'sent'],
  ['IELTS aksiya reklama', 'Instagram', 'Lidlar', '2026-04-12', 'scheduled'],
  ['Ota-onalar yig\'ilishi', 'SMS', 'Ota-onalar', '2026-04-20', 'draft'],
]);

const bonuses = rows(['staff', 'reason', 'amount', 'date', 'status'], [
  ['Jasurbek Boboqulov', 'CEFR guruh natijasi', 1000000, '2026-08-08', 'paid'],
  ['Madina Karimova', 'IELTS 7.0 natija', 800000, '2026-08-08', 'paid'],
  ['Sardorbek Ergashev', 'Yuqori davomat', 500000, '2026-08-08', 'paid'],
  ['Jumayev Baxtbek', 'Olimpiada g\'olibi tayyorlagani', 1200000, '2026-04-05', 'pending'],
]);

const fines = rows(['person', 'reason', 'amount', 'date', 'status'], [
  ['Sherzod H.', 'Darsga kechikish', 100000, '2026-04-11', 'paid'],
  ['Oysha N.', 'Hujjat topshirmagani', 50000, '2026-04-12', 'pending'],
  ['Doston M.', 'Inventarga zarar', 150000, '2026-04-14', 'pending'],
]);

const parents = rows(['name', 'child', 'phone', 'relation', 'status'], [
  ['Azizov Otabek', 'Diyorbek Azizov', '+998900000025', 'Ota', 'active'],
  ['Karimova Nilufar', 'Sevara Karimova', '+998900000026', 'Ona', 'active'],
  ['Sobirov Alisher', 'Bexruz Sobirov', '+998911000029', 'Ota', 'active'],
  ['Yuldosheva Zulfiya', 'Madina Yuldosheva', '+998911000030', 'Ona', 'active'],
]);

const missions = rows(['title', 'reward_coins', 'target', 'progress', 'status'], [
  ['7 kun ketma-ket davomat', 20, 7, 5, 'active'],
  ['5 ta topshiriq bajarish', 30, 5, 3, 'active'],
  ['IELTS mock 6.5+', 40, 1, 0, 'active'],
  ['3 ta test 90%+', 25, 3, 2, 'active'],
]);

const badges = rows(['name', 'icon', 'criteria', 'holders'], [
  ['Zo\'r boshlovchi', '🌟', 'Birinchi oy 90% davomat', 12],
  ['Marafonchi', '🔥', '15 kun streak', 4],
  ['Bilimdon', '🧠', '5 ta testda 90%+', 7],
  ['Olimpiadachi', '🏅', 'Olimpiada g\'olibi', 2],
]);

const campaigns = rows(['name', 'channel', 'budget', 'leads', 'status'], [
  ['IELTS bahor aksiyasi', 'Instagram', 2500000, 34, 'active'],
  ['Yangi o\'quv yili', 'Telegram', 1500000, 21, 'active'],
  ['Tavsiya dasturi', 'Referal', 500000, 12, 'active'],
  ['Facebook reklama', 'Facebook', 1000000, 8, 'paused'],
]);

const rules = rows(['title', 'category', 'description', 'status'], [
  ['Darsga kechikmaslik', 'Intizom', '10 daqiqadan ortiq kechikish qayd etiladi', 'active'],
  ['Uniforma / badge', 'Tartib', 'Xodimlar badge taqib yurishi shart', 'active'],
  ['To\'lov muddati', 'Moliya', 'Oylik to\'lov har oy 10-sanagacha', 'active'],
  ['Telefon siyosati', 'Intizom', 'Dars vaqtida telefon o\'chirilgan bo\'ladi', 'active'],
]);

const evaluations = rows(['staff', 'period', 'score', 'note'], [
  ['Jasurbek Boboqulov', '2026-Q1', 95, 'A\'lo natijalar, yuqori reyting'],
  ['Sardorbek Ergashev', '2026-Q1', 88, 'Barqaror, davomat yaxshi'],
  ['Madina Karimova', '2026-Q1', 92, 'IELTS natijalari kuchli'],
  ['Gulnoza Islomova', '2026-Q1', 85, 'Reception ishi puxta'],
]);

const books = rows(['title', 'author', 'lang', 'qty', 'shelf', 'status'], [
  ['English File Elementary', 'Oxford', 'Ingliz tili', 25, 'A-1', 'active'],
  ['Objective IELTS', 'Cambridge', 'IELTS', 15, 'A-2', 'active'],
  ['한국어 기초', 'KLI', 'Koreys tili', 10, 'B-1', 'active'],
  ['Русский язык. Уровень A2', 'Zlatoust', 'Rus tili', 12, 'B-2', 'active'],
  ['Matematika. Abituriyent', 'Yangiyo\'l Poligraf', 'Matematika', 30, 'C-1', 'active'],
  ['O\'zbekiston tarixi', 'Sharq', 'Tarix', 20, 'C-2', 'active'],
]);

const curriculum = rows(['subject', 'level', 'topics', 'hours', 'status'], [
  ['Ingliz tili', 'A1', 'Grammar, Vocabulary, Speaking (6 modul)', 96, 'active'],
  ['Ingliz tili — IELTS', 'B2+', 'Listening, Reading, Writing, Speaking', 120, 'active'],
  ['Koreys tili', 'A1', 'Hangul, Basic grammar, TOPIK I', 72, 'active'],
  ['Matematika', 'Abituriyent', 'Algebra, Geometriya, Testlar', 144, 'active'],
  ['IT (dasturlash)', 'Pro', 'Python, Algoritmlar, Loyihalar', 200, 'active'],
]);

const live_sessions = rows(['title','teacher','group_name','date','time','platform','link','status'], [
  ['Speaking practice', 'Jasurbek Boboqulov', 'Ingliz tili — CEFR', '2026-04-26', '16:00', 'Zoom', 'https://zoom.us/j/demo1', 'planned'],
  ['IELTS Listening', 'Madina Karimova', 'IELTS', '2026-04-27', '14:00', 'Google Meet', 'https://meet.google.com/demo2', 'planned'],
  ['Algoritm darsi', 'Jumayev Baxtbek', 'IT / Olimpiada', '2026-08-18', '18:00', 'Zoom', 'https://zoom.us/j/demo3', 'planned'],
]);
const enrollments = rows(['student','course','date','source','status'], [
  ['Diyorbek Azizov', 'Ingliz tili (General)', '2026-02-01', 'Reception', 'active'],
  ['Sevara Karimova', 'Ingliz tili (General)', '2026-02-01', 'Instagram', 'active'],
  ['Bexruz Sobirov', 'IT (dasturlash)', '2026-03-01', 'Tavsiya', 'active'],
  ['Madina Yuldosheva', 'Ingliz tili — IELTS', '2026-01-15', 'Reception', 'active'],
]);
const transfers = rows(['student','from_group','to_group','date','reason','status'], [
  ['Jahongir Toshmatov', 'Ingliz tili A1', 'Ingliz tili — CEFR', '2026-03-10', 'Daraja oshdi', 'done'],
  ['Sarvar Qodirov', 'Ingliz tili A1', 'Ingliz tili B1', '2026-02-20', 'Progress', 'done'],
  ['Ulugbek Rahimov', 'Koreys tili A1', 'Koreys tili A2', '2026-04-10', 'Daraja oshdi', 'done'],
  ['Kamola Ismoilova', 'Rus tili A1', 'Rus tili A2', '2026-03-25', 'Progress', 'done'],
  ['Nilufar Ergasheva', 'IELTS basic', 'IELTS', '2026-03-01', 'Kuchli natija', 'done'],
]);
const frozen_students = rows(['student','group_name','freeze_date','unfreeze_date','reason','status'], [
  ['Oysha Nazarova', 'Matematika', '2026-04-01', '2026-05-01', 'Oilaviy sabab', 'frozen'],
  ['Doston Murodov', 'Tarix', '2026-03-15', '2026-08-15', 'Kasallik', 'unfrozen'],
  ['Ulugbek Rahimov', 'Koreys tili A1', '2026-04-05', '2026-05-05', 'Moliyaviy sabab', 'frozen'],
  ['Feruza Sattorova', 'Matematika', '2026-03-20', '2026-04-20', 'Safar', 'unfrozen'],
  ['Zarina Halimova', 'Huquq', '2026-04-10', '2026-09-10', 'Oilaviy sabab', 'frozen'],
]);
const alumni_records = rows(['student','course','graduation_date','certificate','current_status'], [
  ['Asadbek Yusupov', 'IT (dasturlash)', '2026-03-30', 'ISO-2026-0001', 'Ishga joylashdi'],
  ['Nilufar Ergasheva', 'IELTS', '2026-03-15', 'ISO-2026-0003', 'Universitetga kirdi'],
  ['Sevara Karimova', 'Ingliz tili (General)', '2026-02-20', 'ISO-2026-0004', 'IELTS guruhga o\'tdi'],
  ['Kamola Ismoilova', 'Rus tili', '2026-04-01', 'ISO-2026-0005', 'Ishga joylashdi'],
  ['Sarvar Qodirov', 'Ingliz tili (General)', '2026-03-30', 'ISO-2026-0006', 'Chet elga o\'qishga ketdi'],
]);
const cashbox_data = rows(['title','type','amount','date','note'], [
  ['Naqd to\'lov — Diyorbek', 'kirim', 450000, '2026-04-01', 'Ingliz tili A1'],
  ['Kanstovar xaridi', 'chiqim', 120000, '2026-04-02', 'Marker, ruchka'],
  ['Naqd to\'lov — Zarina', 'kirim', 500000, '2026-04-05', 'Koreys tili A1'],
  ['Ijara (qisman)', 'chiqim', 3000000, '2026-04-01', 'Bosh filial — aprel'],
]);
const bank_accounts_data = rows(['bank','account','balance','currency','status'], [
  ['Xalq banki', '20208000900123456789', 15000000, 'UZS', 'active'],
  ['Kapitalbank', '20208000800987654321', 8500000, 'UZS', 'active'],
  ['Ipoteka-bank', '20208000700111222333', 3200000, 'UZS', 'active'],
  ['Xalq banki (USD)', '20208000900999888777', 1200, 'USD', 'active'],
]);
const reception_log_data = rows(['visitor','purpose','date','time','staff','status'], [
  ['Sitora Abdullayeva', 'Demo dars', '2026-04-20', '10:00', 'Gulnoza Islomova', 'done'],
  ['Otabek Rustamov', 'Konsultatsiya', '2026-04-21', '14:30', 'Shahnoza Yuldosheva', 'done'],
  ['Nozima Karimova', 'Ro\'yxatdan o\'tish', '2026-04-22', '09:15', 'Gulnoza Islomova', 'pending'],
]);
const backups_data = rows(['title','date','size','type','status'], [
  ['Haftalik backup', '2026-04-21', '48 MB', 'auto', 'done'],
  ['Oylik backup', '2026-04-01', '112 MB', 'auto', 'done'],
  ['Qo\'lda backup', '2026-08-15', '45 MB', 'manual', 'done'],
]);
const tasks = rows(['title','assigned_to','priority','deadline','status'], [
  ['Yangi guruh ochish', 'Dilshod Rahimov', 'yuqori', '2026-04-30', 'open'],
  ['Marketing hisobotini tayyorlash', 'Jasur Toshmatov', 'o\'rta', '2026-08-18', 'open'],
  ['Inventar tekshiruvi', 'Jumayev Baxtbek', 'past', '2026-05-05', 'open'],
  ['Ota-onalar yig\'ilishi', 'Gulnoza Islomova', 'yuqori', '2026-04-27', 'done'],
]);
const homework = rows(['title','subject','group_name','deadline','submitted','status'], [
  ['Grammar exercises Unit 5', 'Ingliz tili', 'Ingliz tili A1', '2026-04-25', 8, 'open'],
  ['IELTS Essay practice', 'IELTS', 'IELTS', '2026-04-26', 6, 'open'],
  ['Masala yechish #6', 'Matematika', 'Matematika', '2026-04-27', 12, 'open'],
  ['Python loyiha', 'IT', 'IT / Olimpiada', '2026-04-30', 5, 'open'],
]);
const placement_tests = rows(['student','result_level','score','date','status'], [
  ['Diyorbek Azizov', 'A1', 35, '2026-02-01', 'done'],
  ['Sevara Karimova', 'B1', 62, '2026-02-01', 'done'],
  ['Jahongir Toshmatov', 'B2', 78, '2026-03-01', 'done'],
]);
const surveys = rows(['title','audience','responses','date','status'], [
  ['O\'quvchi qoniqishi — Aprel', 'O\'quvchilar', 42, '2026-08-15', 'done'],
  ['Ota-ona fikri', 'Ota-onalar', 18, '2026-04-10', 'done'],
  ['O\'qituvchi baholash', 'O\'quvchilar', 56, '2026-04-20', 'done'],
  ['Yangi kurs talabi', 'Barcha', 31, '2026-04-25', 'active'],
  ['Til markazi ozodaligi', 'Xodimlar', 12, '2026-03-28', 'done'],
]);
const feedback_data = rows(['from_name','type','message','date','status'], [
  ['Azizov Otabek', 'Ota-ona', 'O\'qituvchi juda yaxshi!', '2026-04-18', 'read'],
  ['Sevara Karimova', 'O\'quvchi', 'Kurs juda qiziqarli', '2026-04-19', 'read'],
  ['Jamshid Turayev', 'Lid', 'Demo dars yoqdi', '2026-04-20', 'new'],
]);
const notifications_log = rows(['title','channel','audience','date','status'], [
  ['To\'lov eslatmasi', 'SMS', 'Qarzdorlar', '2026-08-08', 'sent'],
  ['Yangi guruh ochildi', 'Telegram', 'Barcha', '2026-08-13', 'sent'],
  ['IELTS Mock Exam', 'Push', 'IELTS guruhi', '2026-04-20', 'sent'],
]);
const events = rows(['title','type','date','location','status'], [
  ['IELTS Mock Exam', 'Imtihon', '2026-09-15', '201-xona', 'planned'],
  ['Ota-onalar yig\'ilishi', 'Yig\'ilish', '2026-04-27', 'Katta zal', 'planned'],
  ['Ochiq dars — CEFR', 'Dars', '2026-05-01', '103-xona', 'planned'],
  ['Bitiruvchilar marosimi', 'Tantana', '2026-06-15', 'Katta zal', 'planned'],
]);


const sales_pipeline = rows(['lead','stage','value','probability','assigned_to','next_action','status'], [
  ['Sitora Abdullayeva', 'Qiziqish', 700000, 30, 'Sardor Qodirov', 'Demo dars taklif qilish', 'active'],
  ['Jamshid Turayev', 'Demo dars', 450000, 60, 'Kamola Nazarova', 'Shartnoma tayyorlash', 'active'],
  ['Laylo Ismatova', 'Shartnoma', 500000, 80, 'Sardor Qodirov', 'To\'lov kutish', 'active'],
  ['Malika Yusupova', 'To\'lov', 450000, 100, 'Kamola Nazarova', 'Guruhga qo\'shish', 'won'],
  ['Otabek Rustamov', 'Qiziqish', 550000, 20, 'Jasur Toshmatov', 'Qayta qo\'ng\'iroq', 'active'],
  ['Nozima Karimova', 'Demo dars', 700000, 50, 'Jasur Toshmatov', 'Natija kutish', 'active'],
]);
const meetings = rows(['title','participants','date','time','location','type','status'], [
  ['Haftalik yig\'ilish', 'Barcha o\'qituvchilar', '2026-08-18', '09:00', 'Katta zal', 'Ichki', 'planned'],
  ['Ota-onalar kuni', 'Ota-onalar + o\'qituvchilar', '2026-09-10', '15:00', '201-xona', 'Tashqi', 'planned'],
  ['Marketing reja', 'Marketing jamoasi', '2026-04-25', '11:00', 'Direktor xonasi', 'Ichki', 'done'],
  ['IELTS natijalar muhokamasi', 'IELTS jamoasi', '2026-04-22', '14:00', '201-xona', 'Ichki', 'done'],
  ['Yangi filial rejasi', 'Direktor + moliya', '2026-09-15', '10:00', 'Direktor xonasi', 'Ichki', 'planned'],
]);
const teacher_kpi = rows(['teacher','period','students_count','avg_score','attendance_rate','rating','status'], [
  ['Jasurbek Boboqulov', '2026-Q1', 28, 87, 95, 4.9, 'excellent'],
  ['Sardorbek Ergashev', '2026-Q1', 24, 79, 91, 4.7, 'good'],
  ['Nigora Qodirova', '2026-Q1', 22, 82, 93, 4.8, 'good'],
  ['Baxtiyor Karimov', '2026-Q1', 30, 85, 94, 4.8, 'excellent'],
  ['Madina Karimova', '2026-Q1', 22, 88, 96, 4.9, 'excellent'],
  ['Ozoda Kim', '2026-Q1', 18, 80, 92, 4.9, 'good'],
  ['Jumayev Baxtbek', '2026-Q1', 26, 91, 97, 4.9, 'excellent'],
]);
const room_bookings = rows(['room','booked_by','date','time_start','time_end','purpose','status'], [
  ['201-xona', 'Madina Karimova', '2026-04-26', '14:00', '16:00', 'IELTS Mock', 'confirmed'],
  ['301-xona', 'Jumayev Baxtbek', '2026-04-27', '18:00', '20:00', 'Olimpiada mashg\'ulot', 'confirmed'],
  ['Katta zal', 'Dilshod Rahimov', '2026-08-18', '09:00', '10:00', 'Haftalik yig\'ilish', 'confirmed'],
  ['103-xona', 'Jasurbek Boboqulov', '2026-04-29', '16:00', '18:00', 'CEFR Speaking', 'pending'],
  ['105-xona', 'Baxtiyor Karimov', '2026-04-30', '11:00', '13:00', 'Matematika test', 'confirmed'],
]);
const attendance_analytics = rows(['group_name','period','avg_present','avg_absent','rate','trend'], [
  ['Ingliz tili A1', '2026-Aprel', 10, 2, 83, 'stabil'],
  ['IELTS', '2026-Aprel', 10, 0, 100, 'yuqori'],
  ['Matematika', '2026-Aprel', 13, 2, 87, 'o\'sish'],
  ['IT / Olimpiada', '2026-Aprel', 12, 1, 92, 'yuqori'],
  ['Koreys tili A1', '2026-Aprel', 7, 2, 78, 'pasayish'],
  ['Tarix', '2026-Aprel', 10, 2, 83, 'stabil'],
]);
const complaints = rows(['from_name','subject','message','priority','date','status'], [
  ['Azizov Otabek', 'Xona sovuq', 'Dars vaqtida 103-xona sovuq bo\'ladi', 'o\'rta', '2026-04-18', 'resolved'],
  ['Sevara Karimova', 'Jadval o\'zgarishi', 'Jadval oldindan xabar berilmadi', 'yuqori', '2026-04-20', 'resolved'],
  ['Karimova Nilufar', 'Parking muammosi', 'Markaz oldida parking kam', 'past', '2026-04-22', 'open'],
  ['Bexruz Sobirov', 'Internet sekin', 'IT xonada Wi-Fi sekin ishlaydi', 'yuqori', '2026-04-21', 'in_progress'],
]);
const success_stories = rows(['student','title','story','achievement','date'], [
  ['Asadbek Yusupov', 'Respublika olimpiadasi g\'olibi', 'IT bo\'yicha 1-o\'rin', 'Oltin medal', '2026-03-15'],
  ['Nilufar Ergasheva', 'IELTS 7.0', 'Birinchi urinishda 7.0 oldi', 'IELTS Band 7.0', '2026-03-20'],
  ['Bexruz Sobirov', 'Google sertifikati', 'Google IT Support sertifikatini oldi', 'Xalqaro sertifikat', '2026-04-01'],
  ['Sevara Karimova', 'B1 dan B2 ga 3 oyda', 'Eng tez daraja oshgan o\'quvchi', 'Fast Progress', '2026-02-28'],
]);
const speaking_club = rows(['title','topic','teacher','date','time','max_seats','registered','status'], [
  ['Friday Talk', 'My Dream Job', 'Jasurbek Boboqulov', '2026-04-26', '17:00', 15, 12, 'open'],
  ['Debate Night', 'Online vs Offline Learning', 'Nigora Qodirova', '2026-05-03', '18:00', 12, 8, 'open'],
  ['IELTS Speaking', 'Part 2 Practice', 'Madina Karimova', '2026-08-18', '15:00', 10, 10, 'full'],
  ['Movie Club', 'Film muhokamasi', 'Sardorbek Ergashev', '2026-05-05', '19:00', 20, 5, 'open'],
]);
const demo_lessons = rows(['lead','teacher','subject','date','time','result','status'], [
  ['Sitora Abdullayeva', 'Madina Karimova', 'IELTS', '2026-04-23', '10:00', 'Qiziqdi — shartnoma kerak', 'done'],
  ['Jamshid Turayev', 'Sardorbek Ergashev', 'Ingliz tili A1', '2026-04-24', '14:00', 'Yozildi', 'done'],
  ['Laylo Ismatova', 'Ozoda Kim', 'Koreys tili', '2026-04-25', '11:00', 'O\'ylayapti', 'done'],
  ['Otabek Rustamov', 'Baxtiyor Karimov', 'Matematika', '2026-04-26', '16:00', '', 'planned'],
  ['Nozima Karimova', 'Jasurbek Boboqulov', 'Ingliz tili CEFR', '2026-04-27', '10:00', '', 'planned'],
]);
const follow_ups = rows(['lead','assigned_to','action','date','result','status'], [
  ['Sitora Abdullayeva', 'Sardor Qodirov', 'Qayta qo\'ng\'iroq', '2026-04-22', 'Demo darsga yozildi', 'done'],
  ['Jamshid Turayev', 'Kamola Nazarova', 'Telegram xabar', '2026-04-21', 'Javob berdi', 'done'],
  ['Otabek Rustamov', 'Jasur Toshmatov', 'Telefon qo\'ng\'iroq', '2026-04-23', 'Javob bermadi', 'pending'],
  ['Nozima Karimova', 'Jasur Toshmatov', 'Instagram DM', '2026-04-24', 'Demo darsga keldi', 'done'],
  ['Bekzod Sattorov', 'Kamola Nazarova', 'Telefon', '2026-04-25', '', 'planned'],
]);

const waiting_list = rows(['name','phone','course','date','priority','status'], [
  ['Sardor Aliyev', '+998911112238', 'IELTS', '2026-04-20', 'yuqori', 'waiting'],
  ['Bekzod Sattorov', '+998911112240', 'Ingliz tili — CEFR', '2026-04-22', "o'rta", 'waiting'],
  ['Laylo Ismatova', '+998911112235', 'Koreys tili', '2026-04-18', "o'rta", 'waiting'],
  ['Nozima Karimova', '+998911112239', 'Matematika', '2026-04-25', 'past', 'waiting'],
  ['Rustam Ergashev', '+998911334455', 'IT (dasturlash)', '2026-04-26', 'yuqori', 'waiting'],
]);
const referrals = rows(['referrer','referred','course','bonus_coins','date','status'], [
  ['Diyorbek Azizov', 'Sitora Abdullayeva', 'IELTS', 500, '2026-04-20', 'pending'],
  ['Sevara Karimova', 'Jamshid Turayev', 'Ingliz tili A1', 500, '2026-04-19', 'paid'],
  ['Bexruz Sobirov', 'Otabek Rustamov', 'IT (dasturlash)', 500, '2026-04-21', 'pending'],
  ['Asadbek Yusupov', 'Malika Yusupova', 'Ingliz tili (General)', 500, '2026-08-15', 'paid'],
]);
const group_analytics = rows(['group_name','period','avg_score','completion_rate','satisfaction','trend'], [
  ['Ingliz tili A1', '2026-Aprel', 76, 82, 90, "o'sish"],
  ['IELTS', '2026-Aprel', 85, 91, 95, 'yuqori'],
  ['Matematika', '2026-Aprel', 81, 78, 88, 'stabil'],
  ['IT / Olimpiada', '2026-Aprel', 89, 95, 97, 'yuqori'],
  ['Koreys tili A1', '2026-Aprel', 72, 75, 85, 'stabil'],
  ['Tarix', '2026-Aprel', 69, 70, 82, 'pasayish'],
]);
const teacher_schedule_data = rows(['teacher','day','time_start','time_end','group_name','room'], [
  ['Jasurbek Boboqulov', 'Dushanba', '16:00', '18:00', 'Ingliz tili — CEFR', '103-xona'],
  ['Jasurbek Boboqulov', 'Chorshanba', '16:00', '18:00', 'Ingliz tili — CEFR', '103-xona'],
  ['Sardorbek Ergashev', 'Dushanba', '09:00', '11:00', 'Ingliz tili A1', '101-xona'],
  ['Sardorbek Ergashev', 'Juma', '09:00', '11:00', 'Ingliz tili A1', '101-xona'],
  ['Madina Karimova', 'Seshanba', '14:00', '16:00', 'IELTS', '201-xona'],
  ['Madina Karimova', 'Payshanba', '14:00', '16:00', 'IELTS', '201-xona'],
  ['Baxtiyor Karimov', 'Dushanba', '11:00', '13:00', 'Matematika', '204-xona'],
  ['Baxtiyor Karimov', 'Juma', '11:00', '13:00', 'Matematika', '204-xona'],
  ['Jumayev Baxtbek', 'Dushanba', '18:00', '20:00', 'IT / Olimpiada', '301-xona'],
  ['Jumayev Baxtbek', 'Juma', '18:00', '20:00', 'IT / Olimpiada', '301-xona'],
  ['Ozoda Kim', 'Dushanba', '15:00', '17:00', 'Koreys tili A1', '202-xona'],
]);
const lesson_library = rows(['title','subject','level','type','author','downloads','status'], [
  ['Present Simple — slides', 'Ingliz tili', 'A1', 'Slayd', 'Sardorbek Ergashev', 45, 'active'],
  ['IELTS Writing Task 2 shablon', 'IELTS', 'B2+', 'Shablon', 'Madina Karimova', 32, 'active'],
  ['Kvadrat tenglama mashqlari', 'Matematika', 'Abituriyent', 'Mashq', 'Baxtiyor Karimov', 28, 'active'],
  ['Python kirish — video link', 'IT', 'Boshlang\'ich', 'Video', 'Jumayev Baxtbek', 56, 'active'],
  ['Hangul yozuv qo\'llanmasi', 'Koreys tili', 'A1', 'PDF', 'Ozoda Kim', 19, 'active'],
  ['Amir Temur — taqdimot', 'Tarix', 'Abituriyent', 'Slayd', "Akmal Yo'ldoshev", 22, 'active'],
  ['CEFR Speaking tips', 'Ingliz tili', 'B2', 'Slayd', 'Jasurbek Boboqulov', 38, 'active'],
]);
const homework_reviews = rows(['student','homework','score','feedback','reviewer','date'], [
  ['Diyorbek Azizov', 'Grammar exercises Unit 5', 85, 'Yaxshi, lekin artikllarda xatolar bor', 'Sardorbek Ergashev', '2026-04-26'],
  ['Sevara Karimova', 'Grammar exercises Unit 5', 92, 'A\'lo ish!', 'Sardorbek Ergashev', '2026-04-26'],
  ['Madina Yuldosheva', 'IELTS Essay practice', 7, 'Task achievement yaxshi, grammar kuchaytiring', 'Madina Karimova', '2026-04-27'],
  ['Bexruz Sobirov', 'Python loyiha', 95, 'Kreativ yechim, kodni optimallashtiring', 'Jumayev Baxtbek', '2026-08-18'],
  ['Oysha Nazarova', 'Masala yechish #6', 78, 'Geometriya qismida kamchilik', 'Baxtiyor Karimov', '2026-04-27'],
]);
const mock_exams = rows(['title','subject','group_name','date','participants','avg_score','status'], [
  ['IELTS Full Mock #1', 'IELTS', 'IELTS', '2026-09-15', 11, 0, 'planned'],
  ['CEFR B2 Practice', 'Ingliz tili', 'Ingliz tili — CEFR', '2026-09-10', 14, 0, 'planned'],
  ['Matematika sinov', 'Matematika', 'Matematika', '2026-05-08', 15, 0, 'planned'],
  ['TOPIK I Mock', 'Koreys tili', 'Koreys tili A1', '2026-05-12', 9, 0, 'planned'],
  ['IT Olimpiada saylov', 'IT', 'IT / Olimpiada', '2026-05-20', 13, 0, 'planned'],
]);
const exam_results = rows(['student','exam','score','grade','date','status'], [
  ['Asadbek Yusupov', 'CEFR Placement', 92, 'C1', '2026-08-18', 'done'],
  ['Bexruz Sobirov', 'CEFR Placement', 78, 'B2', '2026-08-18', 'done'],
  ['Diyorbek Azizov', 'Progress Test — Unit 3', 85, 'B', '2026-08-25', 'done'],
  ['Sevara Karimova', 'Progress Test — Unit 3', 91, 'A', '2026-08-25', 'done'],
  ['Madina Yuldosheva', 'IELTS Mock Exam', 6.5, 'B2+', '2026-09-15', 'done'],
  ['Nilufar Ergasheva', 'IELTS Mock Exam', 7.0, 'C1', '2026-09-15', 'done'],
]);

const student_portfolio = rows(['student','type','title','description','file_url','date'], [
  ['Asadbek Yusupov', 'Loyiha', 'Python Snake Game', 'Pygame orqali yozilgan loyiha', '/files/snake.py', '2026-03-20'],
  ['Bexruz Sobirov', 'Sertifikat', 'Google IT Support', 'Xalqaro sertifikat', '/files/cert_google.pdf', '2026-04-01'],
  ['Sevara Karimova', 'Essay', 'My Dream University', 'IELTS Writing Task 2', '/files/essay_dream.pdf', '2026-03-25'],
  ['Madina Yuldosheva', 'Sertifikat', 'IELTS Band 6.5', 'Rasmiy sertifikat', '/files/ielts_cert.pdf', '2026-03-15'],
  ['Diyorbek Azizov', 'Taqdimot', 'My Hometown Sherobod', 'Ingliz tilida taqdimot', '/files/pres_sherobod.pptx', '2026-04-10'],
]);
const leave_management = rows(['staff','type','start_date','end_date','days','reason','status'], [
  ['Sardorbek Ergashev', 'Mehnat ta\'tili', '2026-07-01', '2026-07-14', 14, 'Yillik ta\'til', 'approved'],
  ['Elena Petrova', 'Kasallik', '2026-04-18', '2026-04-20', 3, 'Gripp', 'approved'],
  ['Gulnoza Islomova', 'Shaxsiy', '2026-04-25', '2026-04-25', 1, 'Oilaviy marosim', 'approved'],
  ['Ozoda Kim', 'Mehnat ta\'tili', '2026-08-01', '2026-08-15', 15, 'Koreya safari', 'pending'],
  ['Jumayev Baxtbek', 'Konferensiya', '2026-09-10', '2026-05-12', 3, 'IT konferensiya — Toshkent', 'approved'],
]);
const olympiad = rows(['title','subject','level','date','participants','winners','status'], [
  ['Sherobod IT Olimpiadasi', 'IT', 'Viloyat', '2026-03-15', 45, 'Asadbek Y. (1-o\'rin)', 'done'],
  ['Ingliz tili — Spelling Bee', 'Ingliz tili', 'Markaz', '2026-04-20', 30, 'Sevara K. (1-o\'rin)', 'done'],
  ['Matematika Challenge', 'Matematika', 'Markaz', '2026-09-10', 40, '', 'planned'],
  ['Respublika IT saylov', 'IT', 'Respublika', '2026-10-01', 8, '', 'planned'],
  ['TOPIK Korean Quiz', 'Koreys tili', 'Markaz', '2026-05-25', 20, '', 'planned'],
]);
const internal_chat = rows(['from_name','to_name','message','date','read'], [
  ['Husniddin Khayitov', 'Dilshod Rahimov', 'Yangi CEFR guruhi ochish rejasi bormi?', '2026-04-22', 1],
  ['Dilshod Rahimov', 'Husniddin Khayitov', 'Ha, 204-xonada Du-Cho-Ju 11:00 da ochmoqchimiz', '2026-04-22', 1],
  ['Jasur Toshmatov', 'Kamola Nazarova', 'Instagram aksiya postini tayyorladim, tasdiqlang', '2026-04-23', 1],
  ['Madina Karimova', 'Dilshod Rahimov', 'IELTS Mock natijalarini yubordim', '2026-04-24', 0],
  ['Jumayev Baxtbek', 'Husniddin Khayitov', 'Olimpiada natijalari: 1-o\'rin Asadbek', '2026-04-25', 1],
  ['Gulnoza Islomova', 'Otabek Saidov', '3 ta o\'quvchi to\'lov qilmagan', '2026-04-25', 0],
]);
const partner_companies = rows(['name','type','contact','agreement','status'], [
  ['British Council', 'Sertifikatsiya', 'info@britishcouncil.uz', 'IELTS sinov markazi', 'active'],
  ['Korea Foundation', 'Ta\'lim', 'korea@edu.kr', 'TOPIK sinov hamkorligi', 'active'],
  ['Cambridge Assessment', 'Sertifikatsiya', 'cambridge@cam.uk', 'CEFR sertifikat berish', 'active'],
  ['UzTelecom', 'Xizmat', 'biz@uztelecom.uz', 'Internet ta\'minoti', 'active'],
  ['Digital Termiz', 'Marketing', 'info@digitaltermiz.uz', 'SMM xizmatlari', 'active'],
]);
const tickets = rows(['title','from_name','category','priority','date','assigned_to','status'], [
  ['Wi-Fi ishlamayapti', 'Bexruz Sobirov', 'Texnik', 'yuqori', '2026-04-21', 'Jumayev Baxtbek', 'resolved'],
  ['Proyektor buzildi (103-xona)', 'Sardorbek Ergashev', 'Texnik', 'yuqori', '2026-04-22', 'Jumayev Baxtbek', 'in_progress'],
  ['Sertifikat nusxasi kerak', 'Nilufar Ergasheva', 'Hujjat', "o'rta", '2026-04-23', 'Gulnoza Islomova', 'resolved'],
  ['Guruh vaqtini o\'zgartirish', 'Kamola Ismoilova', 'Akademik', "o'rta", '2026-04-24', 'Dilshod Rahimov', 'open'],
  ['Konditsioner ta\'mirlanmagan', 'Akmal Yo\'ldoshev', 'Texnik', 'past', '2026-04-25', 'Jumayev Baxtbek', 'open'],
]);
const resource_center = rows(['title','category','format','subject','downloads','status'], [
  ['IELTS Writing Rubric', 'Shablon', 'PDF', 'IELTS', 34, 'active'],
  ['A1 Vocabulary List', 'Material', 'Excel', 'Ingliz tili', 67, 'active'],
  ['Matematika formulalar', 'Ma\'lumotnoma', 'PDF', 'Matematika', 55, 'active'],
  ['Python cheatsheet', 'Ma\'lumotnoma', 'PDF', 'IT', 42, 'active'],
  ['Hangul yozuv qo\'llanma', 'Material', 'PDF', 'Koreys tili', 28, 'active'],
  ['Tarix xronologiyasi', 'Ma\'lumotnoma', 'PDF', 'Tarix', 19, 'active'],
  ['CEFR Can-Do statements', 'Standart', 'PDF', 'Ingliz tili', 23, 'active'],
]);
const debate_club = rows(['title','topic','moderator','date','time','participants','status'], [
  ['Online vs Offline ta\'lim', 'Qaysi biri yaxshi?', 'Jasurbek Boboqulov', '2026-05-03', '18:00', 16, 'planned'],
  ['AI va ta\'lim', 'AI o\'qituvchini almashtira oladimi?', 'Jumayev Baxtbek', '2026-09-10', '18:00', 12, 'planned'],
  ['Chet elda o\'qish', 'Afzalliklari va kamchiliklari', 'Madina Karimova', '2026-05-17', '18:00', 0, 'planned'],
  ['Kitob vs Internet', 'Bilim olish usullari', 'Nigora Qodirova', '2026-04-19', '18:00', 14, 'done'],
]);
const sms_log = rows(['recipient','phone','message','date','status'], [
  ['Diyorbek Azizov', '+998900000027', 'To\'lov eslatmasi: 450,000 so\'m', '2026-08-08', 'delivered'],
  ['Sevara Karimova', '+998900000028', 'Ertaga dars 18:00 da', '2026-04-09', 'delivered'],
  ['Azizov Otabek', '+998900000025', 'Ota-onalar yig\'ilishi 27-aprel', '2026-04-20', 'delivered'],
  ['Jahongir Toshmatov', '+998900000031', 'To\'lov qilmagan — eslatma', '2026-08-15', 'delivered'],
  ['Barcha guruhlar', 'bulk', 'Bayram munosabati bilan 1-may dam olish', '2026-08-18', 'delivered'],
]);
const student_timeline = rows(['student','event','detail','date','type'], [
  ['Diyorbek Azizov', 'Ro\'yxatga olindi', 'Ingliz tili A1 guruhiga', '2026-02-01', 'enrollment'],
  ['Diyorbek Azizov', 'Progress test', '85 ball oldi', '2026-08-25', 'exam'],
  ['Diyorbek Azizov', 'Coin mukofoti', '15 coin — 100% davomat', '2026-04-22', 'coin'],
  ['Sevara Karimova', 'Ro\'yxatga olindi', 'Ingliz tili B1 guruhiga', '2026-02-01', 'enrollment'],
  ['Sevara Karimova', 'Daraja oshdi', 'A2 dan B1 ga ko\'tarildi', '2026-03-15', 'level_up'],
  ['Sevara Karimova', 'Sertifikat oldi', 'B1 sertifikati — ISO-2026-0004', '2026-02-20', 'certificate'],
  ['Bexruz Sobirov', 'Olimpiada', 'IT — 1-o\'rin (viloyat)', '2026-03-15', 'achievement'],
  ['Bexruz Sobirov', 'Coin mukofoti', '40 coin — Olimpiada g\'olibi', '2026-04-22', 'coin'],
  ['Asadbek Yusupov', 'Sertifikat oldi', 'C1 — ISO-2026-0001', '2026-03-30', 'certificate'],
  ['Madina Yuldosheva', 'IELTS Mock', '6.5 ball oldi', '2026-09-15', 'exam'],
]);

const essays = rows(['student','title','subject','word_count','score','reviewer','date','status'], [
  ['Sevara Karimova', 'My Dream University', 'Ingliz tili', 285, 92, 'Nigora Qodirova', '2026-04-20', 'checked'],
  ['Madina Yuldosheva', 'Technology in Education', 'IELTS', 312, 7, 'Madina Karimova', '2026-04-21', 'checked'],
  ['Diyorbek Azizov', 'My Hometown Sherobod', 'Ingliz tili', 198, 85, 'Sardorbek Ergashev', '2026-04-22', 'checked'],
  ['Nilufar Ergasheva', 'Advantages of Online Learning', 'IELTS', 340, 7.5, 'Madina Karimova', '2026-04-23', 'checked'],
  ['Bexruz Sobirov', 'Future of AI', 'IT', 420, 95, 'Jumayev Baxtbek', '2026-04-24', 'checked'],
  ['Jahongir Toshmatov', 'Environmental Problems', 'Ingliz tili', 265, 0, '', '2026-04-25', 'pending'],
  ['Farrux Toshmatov', 'Cultural Differences', 'IELTS', 298, 0, '', '2026-04-26', 'pending'],
]);

const survey_votes = rows(['survey','voter','vote','comment','date'], [
  ["O'quvchi qoniqishi — Aprel", 'Diyorbek Azizov', 'ha', 'Darslar juda qiziqarli', '2026-04-16'],
  ["O'quvchi qoniqishi — Aprel", 'Sevara Karimova', 'ha', "O'qituvchi zo'r tushuntiradi", '2026-04-16'],
  ["O'quvchi qoniqishi — Aprel", 'Bexruz Sobirov', 'ha', '', '2026-04-17'],
  ["O'quvchi qoniqishi — Aprel", 'Doston Murodov', "yo'q", 'Xona sovuq', '2026-04-17'],
  ['Ota-ona fikri', 'Azizov Otabek', 'ha', 'Farzandim natijasi yaxshilandi', '2026-04-11'],
  ['Ota-ona fikri', 'Karimova Nilufar', 'ha', 'Rahmat!', '2026-04-11'],
  ["O'qituvchi baholash", 'Madina Yuldosheva', 'ha', 'IELTS ustozi juda kuchli', '2026-04-21'],
  ["O'qituvchi baholash", 'Nilufar Ergasheva', 'ha', '', '2026-04-21'],
  ['Yangi kurs talabi', 'Asadbek Yusupov', 'ha', 'Web dasturlash kursi kerak', '2026-04-26'],
  ['Yangi kurs talabi', 'Nodir Raxmatullayev', 'ha', 'Mobil dasturlash', '2026-04-26'],
]);

const chat_messages = rows(['channel','sender','sender_role','text','timestamp'], [
  ['Umumiy', 'Husniddin Khayitov', 'director', 'Assalomu alaykum, hammaga! Yangi o\'quv yili muborak!', '2026-08-01 09:00'],
  ['Umumiy', 'Dilshod Rahimov', 'academic_manager', 'Barcha o\'qituvchilarga dars jadvali tarqatildi', '2026-08-01 09:15'],
  ['Umumiy', 'Jasurbek Boboqulov', 'senior_teacher', 'Rahmat! CEFR guruhi tayyor', '2026-08-01 09:20'],
  ['Umumiy', 'Gulnoza Islomova', 'reception', '5 ta yangi o\'quvchi ro\'yxatdan o\'tdi bugun', '2026-08-01 10:00'],
  ['Umumiy', 'Madina Karimova', 'teacher', 'IELTS Mock imtihon natijalarini yubordim', '2026-08-02 14:30'],
  ['Umumiy', 'Jumayev Baxtbek', 'it_admin', 'Wi-Fi tezligi oshirildi, 301-xonada yangi proyektor', '2026-08-02 16:00'],
  ['O\'qituvchilar', 'Dilshod Rahimov', 'academic_manager', 'Haftalik yig\'ilish — Dushanba 09:00, katta zal', '2026-08-03 08:00'],
  ['O\'qituvchilar', 'Sardorbek Ergashev', 'teacher', 'A1 guruhi progress yaxshi, 3 o\'quvchi B1 ga tayyor', '2026-08-03 11:00'],
  ['O\'qituvchilar', 'Baxtiyor Karimov', 'teacher', 'Matematika olimpiadaga tayyorgarlik jadvalini yubordim', '2026-08-03 12:00'],
  ['O\'qituvchilar', 'Ozoda Kim', 'teacher', 'TOPIK I tayyorgarlik materiallari tayyor', '2026-08-04 09:30'],
  ['Marketing', 'Jasur Toshmatov', 'marketing', 'Instagram aksiya posti tayyor — tasdiqlaysizmi?', '2026-08-04 15:00'],
  ['Marketing', 'Kamola Nazarova', 'smm', 'Telegram kanalga yangi post joylandi', '2026-08-04 15:30'],
  ['Marketing', 'Sardor Qodirov', 'call_center', '12 ta yangi lid — 8 tasi demo darsga yozildi', '2026-08-05 10:00'],
  ['IELTS guruh', 'Madina Karimova', 'teacher', 'Ertaga Writing Task 2 mashg\'uloti — 14:00', '2026-08-05 18:00'],
  ['IELTS guruh', 'Madina Yuldosheva', 'student', 'Tushundim, rahmat ustoz!', '2026-08-05 18:10'],
  ['IT guruh', 'Jumayev Baxtbek', 'teacher', 'Python loyiha deadline — 30-avgust', '2026-08-06 09:00'],
  ['IT guruh', 'Asadbek Yusupov', 'student', 'Loyiha tayyor, GitHub\'ga push qildim', '2026-08-06 19:00'],
  ['IT guruh', 'Bexruz Sobirov', 'student', 'Men ham tugatdim!', '2026-08-06 19:30'],
]);

const notifications = rows(['title','body','type','target_role','read','date'], [
  ['Yangi o\'quv yili boshlandi!', 'Barcha xodimlar 1-avgustdan ish boshlasin', 'info', 'all', 0, '2026-08-01'],
  ['To\'lov muddati yaqinlashmoqda', '5 ta o\'quvchining to\'lov muddati tugaydi', 'warn', 'accountant', 0, '2026-08-05'],
  ['IELTS Mock imtihon', '15-sentabrda IELTS Mock — barcha IELTS o\'quvchilari', 'info', 'teacher', 0, '2026-08-07'],
  ['Yangi o\'quvchi ro\'yxatdan o\'tdi', 'Farrux Toshmatov — IELTS guruhiga', 'success', 'reception', 1, '2026-08-07'],
  ['Olimpiada tayyorgarlik', 'IT olimpiadaga 3 o\'quvchi tayyorlanmoqda', 'info', 'director', 0, '2026-08-06'],
  ['Oylik hisobot tayyor', 'Iyul oylik hisobotini yuklab oling', 'info', 'director', 0, '2026-08-01'],
  ['Xona 103 ta\'mirda', '103-xona 10-avgustgacha ta\'mirda — darslar 105-xonaga', 'warn', 'all', 0, '2026-08-03'],
  ['Yangi materiallar yuklandi', 'Dars kutubxonasiga 5 ta yangi material', 'success', 'teacher', 0, '2026-08-04'],
]);
const daily_journal = rows(['date','author','group_name','topic','homework','notes','present','absent'], [
  ['2026-08-08', 'Sardorbek Ergashev', 'Ingliz tili A1', 'Present Simple — nazariya', 'Exercise 5-6, p.45', 'Hammasi faol qatnashdi', 10, 2],
  ['2026-08-08', 'Madina Karimova', 'IELTS', 'Writing Task 2 — Opinion essay', 'Write 250 words essay', 'Mock natijalar muhokama qilindi', 11, 0],
  ['2026-08-08', 'Baxtiyor Karimov', 'Matematika', 'Kvadrat tenglamalar — diskriminant', 'Masala #45-60', 'Olimpiadachilarga qo\'shimcha mashq', 13, 2],
  ['2026-08-11', 'Jasurbek Boboqulov', 'Ingliz tili — CEFR', 'CEFR Speaking Part 1', 'Record 2-min video', 'B2 darajaga tayyor — 5 o\'quvchi', 14, 1],
  ['2026-08-11', 'Jumayev Baxtbek', 'IT / Olimpiada', 'Python — funksiyalar', 'GitHub push loyiha', 'Asadbek loyiha tugadi', 12, 1],
  ['2026-08-11', 'Ozoda Kim', 'Koreys tili A1', 'Hangul yozuv', 'Harflar 20 marta yozish', 'Yangi 2 o\'quvchi qo\'shildi', 9, 0],
]);
const teacher_portfolio = rows(['teacher','type','title','description','url','date'], [
  ['Jasurbek Boboqulov', 'Sertifikat', 'CELTA Certificate', 'Cambridge English Language Teaching', '', '2025-06-15'],
  ['Jasurbek Boboqulov', 'Maqola', 'Teaching Speaking to B2 learners', 'ELT Journal', '', '2025-12-01'],
  ['Madina Karimova', 'Sertifikat', 'IELTS Trainer Certificate', 'British Council', '', '2025-03-20'],
  ['Madina Karimova', 'Loyiha', 'IELTS Prep Mobile App', 'Flutter orqali yaratilgan', '', '2026-01-15'],
  ['Jumayev Baxtbek', 'Sertifikat', 'Google IT Support Professional', 'Coursera', '', '2025-08-10'],
  ['Jumayev Baxtbek', 'Loyiha', 'Olimpiada tayyorgarlik platformasi', 'React + Node.js', '', '2026-02-01'],
  ['Baxtiyor Karimov', 'Sertifikat', 'Matematika oliy toifa', 'DTM', '', '2024-09-01'],
  ['Ozoda Kim', 'Sertifikat', 'TOPIK Level 6', 'Korea Foundation', '', '2025-05-20'],
]);

const promo_codes = rows(['code','reward_coins','max_uses','used','expires','status'], [
  ['YANGI2026', 100, 50, 12, '2026-12-31', 'active'],
  ['IELTS50', 50, 30, 8, '2026-09-30', 'active'],
  ['DOSTIM', 200, 100, 23, '2026-12-31', 'active'],
  ['OLIMPIADA', 500, 10, 2, '2026-10-01', 'active'],
  ['BAHOR', 75, 40, 40, '2026-05-31', 'expired'],
]);
const lucky_wheel_log = rows(['student','prize','coins','date'], [
  ['Diyorbek Azizov', '50 coin!', 50, '2026-08-10'],
  ['Sevara Karimova', '100 coin!', 100, '2026-08-11'],
  ['Bexruz Sobirov', '10 coin', 10, '2026-08-12'],
  ['Asadbek Yusupov', '200 coin!', 200, '2026-08-13'],
  ['Madina Yuldosheva', '25 coin', 25, '2026-08-14'],
]);
const streak_rewards = rows(['days','reward_coins','badge','status'], [
  [3, 10, '🔥 3 kun', 'active'],
  [7, 30, '🔥 Haftalik', 'active'],
  [14, 75, '⚡ 2 hafta', 'active'],
  [30, 200, '🏆 Oylik', 'active'],
  [60, 500, '💎 2 oy', 'active'],
  [90, 1000, '👑 3 oy — Legenda', 'active'],
]);

// Generic {name, notes, status, date} modules under the "Tizim" menu group.
const extraData = {};
for (const [table, tuples] of Object.entries(EXTRA_TABLES)) {
  extraData[table] = rows(EXTRA_COLUMNS, tuples);
}

const general_coins = rows(['name', 'coins'], [
  ['Umumiy hisob', 10000],
]);

const coin_shop = rows(['item', 'icon', 'cost', 'tone', 'status'], [  ["O'chirg'ich", "Eraser", 5000, "slate", 'active'],
  ["Grafit qalam", "Pencil", 5150, "slate", 'active'],
  ["Ruchka (ko'k)", "PenTool", 5375, "slate", 'active'],
  ["Ruchka (qora)", "PenTool", 5375, "slate", 'active'],
  ["Ruchka (qizil)", "PenTool", 5375, "slate", 'active'],
  ["Gel ruchka", "PenTool", 5600, "slate", 'active'],
  ["Rangli qalamlar", "Pencil", 5750, "slate", 'active'],
  ["Stiker qog'oz", "StickyNote", 6125, "slate", 'active'],
  ["Yopishqoq varaqcha", "StickyNote", 5900, "slate", 'active'],
  ["Kichik daftarcha", "NotebookPen", 6350, "slate", 'active'],
  ["Daftar (48 varaq)", "NotebookPen", 6500, "slate", 'active'],
  ["Daftar (96 varaq)", "NotebookPen", 7100, "slate", 'active'],
  ["Marker (sariq)", "Highlighter", 6875, "slate", 'active'],
  ["Marker to'plami", "Highlighter", 7250, "slate", 'active'],
  ["Chizg'ich to'plami", "Ruler", 6200, "slate", 'active'],
  ["Sirkul", "Ruler", 6650, "slate", 'active'],
  ["O'chirg'ich (rangli)", "Eraser", 5300, "slate", 'active'],
  ["Bloknot", "NotebookPen", 6800, "slate", 'active'],
  ["Rangli qog'oz to'plami", "StickyNote", 6425, "slate", 'active'],
  ["Yelim qalam", "PenLine", 5525, "slate", 'active'],
  ["Flomaster to'plami", "Highlighter", 7400, "slate", 'active'],
  ["Kichik lineyka", "Ruler", 5075, "slate", 'active'],
  ["Qalam qutisi (kichik)", "Package", 7625, "slate", 'active'],
  ["Bukletli papka", "NotebookPen", 6950, "slate", 'active'],
  ["Kundalik (mini)", "NotebookPen", 7850, "slate", 'active'],
  ["Rangli skotch", "StickyNote", 5675, "slate", 'active'],
  ["Qog'oz qisqich to'plami", "Package", 5450, "slate", 'active'],
  ["Doska marker", "Highlighter", 6050, "slate", 'active'],
  ["Chizmachilik to'plami", "Ruler", 5200, "slate", 'active'],
  ["O'quv jadval planshet", "NotebookPen", 5800, "slate", 'active'],
  ["Ruchka to'plami (5 dona)", "PenTool", 7625, "slate", 'active'],
  ["Qalam to'plami (10 dona)", "Pencil", 5200, "slate", 'active'],
  ["Stiker to'plami (katta)", "StickyNote", 6650, "slate", 'active'],
  ["Yelim qalam (3 dona)", "PenLine", 7175, "slate", 'active'],
  ["Marker (yashil)", "Highlighter", 6875, "slate", 'active'],
  ["Marker (ko’k, katta)", "Highlighter", 6875, "slate", 'active'],
  ["Marker (pushti)", "Highlighter", 6875, "slate", 'active'],
  ["Kitob belgisi to'plami", "BookMarked", 5825, "slate", 'active'],
  ["ISO nishon to’plami", "Sparkles", 5500, "slate", 'active'],
  ["Elektron soat batareyasi", "Clock", 6650, "slate", 'active'],
  ["Ekran himoyasi", "Smartphone", 5000, "slate", 'active'],
  ["Powerbank kabeli", "Usb", 7850, "slate", 'active'],
  ["Bo'r (Keoka) to'plami", "Paintbrush", 6000, "blue", 'active'],
  ["Rasm chizish bo'yog'i", "Palette", 6800, "blue", 'active'],
  ["Suv idishi (issiq/sovuq)", "CupSoda", 8000, "blue", 'active'],
  ["Sport suv idishi", "CupSoda", 7500, "blue", 'active'],
  ["Qahva krujkasi", "Coffee", 8500, "blue", 'active'],
  ["Choy krujkasi", "Coffee", 8200, "blue", 'active'],
  ["Qalamdon (katta)", "Package", 10000, "blue", 'active'],
  ["Fayl papka", "Package", 9200, "blue", 'active'],
  ["Termos (kichik)", "Coffee", 12000, "blue", 'active'],
  ["Termos (katta)", "Coffee", 14000, "blue", 'active'],
  ["English kitoblari to'plami", "BookOpen", 15000, "blue", 'active'],
  ["Grammar kitobi", "BookOpen", 13500, "blue", 'active'],
  ["IELTS qo'llanma", "BookOpen", 15500, "blue", 'active'],
  ["Lug'at (Ingliz-Uzbek)", "BookMarked", 14200, "blue", 'active'],
  ["Fleshka 32GB", "Usb", 15000, "blue", 'active'],
  ["Fleshka 64GB", "Usb", 19500, "blue", 'active'],
  ["Powerbank (mini)", "Usb", 16800, "blue", 'active'],
  ["Sichqoncha pad", "Box", 9800, "blue", 'active'],
  ["Sumka (kitob uchun)", "Box", 15800, "blue", 'active'],
  ["Karta o'yin to'plami", "Dices", 8800, "blue", 'active'],
  ["Shaxmat to'plami", "Dices", 15200, "blue", 'active'],
  ["Puzzle 500 bo'lak", "Puzzle", 11000, "blue", 'active'],
  ["Bloknot jurnal", "NotebookPen", 9500, "blue", 'active'],
  ["Ryukzak (kichik)", "Backpack", 15900, "blue", 'active'],
  ["Soat (arzon)", "Watch", 14000, "blue", 'active'],
  ["Qalamdon (o'rta)", "Package", 7800, "blue", 'active'],
  ["Suv idishi (rangli)", "CupSoda", 8300, "blue", 'active'],
  ["Krujka (ISO logo)", "Coffee", 9000, "blue", 'active'],
  ["Koreys tili kitobi", "BookOpen", 16000, "blue", 'active'],
  ["Nemis tili kitobi", "BookOpen", 16000, "blue", 'active'],
  ["Rus tili kitobi", "BookOpen", 14500, "blue", 'active'],
  ["Matematika qo'llanma", "BookOpen", 13800, "blue", 'active'],
  ["Tarix kitobi", "BookOpen", 13000, "blue", 'active'],
  ["Huquq kitobi", "BookOpen", 13000, "blue", 'active'],
  ["Fleshka 16GB", "Usb", 11000, "blue", 'active'],
  ["USB kabel", "Usb", 6500, "blue", 'active'],
  ["Telefon g’ilofi", "Smartphone", 12000, "blue", 'active'],
  ["Fitnes rezinka", "Dumbbell", 7200, "blue", 'active'],
  ["Sport sochiq", "Box", 6800, "blue", 'active'],
  ["Rubik kubigi", "Puzzle", 8600, "blue", 'active'],
  ["Rangli qalam (48 rang)", "Pencil", 12500, "blue", 'active'],
  ["Akvarel bo’yoq", "Palette", 9800, "blue", 'active'],
  ["Stol soati", "Clock", 11500, "blue", 'active'],
  ["Kalendar (yillik)", "NotebookPen", 8200, "blue", 'active'],
  ["Planner (haftalik)", "NotebookPen", 9600, "blue", 'active'],
  ["Motivatsion plakat", "Star", 7000, "blue", 'active'],
  ["Sertifikat ramkasi", "Award", 15500, "blue", 'active'],
  ["Ko’zoynak g’ilofi", "Glasses", 6200, "blue", 'active'],
  ["Sayohat yostig’i", "Umbrella", 13500, "blue", 'active'],
  ["Velosiped qo’ng’irog’i", "Bike", 8900, "blue", 'active'],
  ["Karta o'yini (UNO)", "Dices", 9200, "blue", 'active'],
  ["IT startup kitobi", "BookOpen", 17200, "blue", 'active'],
  ["Stol lampasi", "Lamp", 18000, "violet", 'active'],
  ["LED chiroq", "Lamp", 19500, "violet", 'active'],
  ["Klaviatura (oddiy)", "Keyboard", 20000, "violet", 'active'],
  ["Klaviatura + sichqoncha", "Keyboard", 22000, "violet", 'active'],
  ["Simsiz sichqoncha", "Keyboard", 18500, "violet", 'active'],
  ["Ryukzak (o'quv)", "Backpack", 25000, "violet", 'active'],
  ["Sport ryukzak", "Backpack", 24500, "violet", 'active'],
  ["Simli quloqchin", "Headphones", 15000, "violet", 'active'],
  ["Bluetooth quloqchin", "Headphones", 27000, "violet", 'active'],
  ["AirPods Max (stil)", "Headphones", 32000, "violet", 'active'],
  ["Futbolka (ISO logo)", "Shirt", 20000, "violet", 'active'],
  ["Futbolka · kepka to'plami", "Shirt", 30000, "violet", 'active'],
  ["Kepka", "Shirt", 18000, "violet", 'active'],
  ["Sovg'a to'plami", "Gift", 26000, "violet", 'active'],
  ["Smartwatch (arzon)", "Watch", 42000, "violet", 'active'],
  ["Smartwatch (Pro)", "Watch", 50000, "violet", 'active'],
  ["Fitnes-braslet", "Dumbbell", 28000, "violet", 'active'],
  ["Portativ kolonka", "Speaker", 35000, "violet", 'active'],
  ["Mini proyektor", "Speaker", 55000, "violet", 'active'],
  ["Powerbank (katta)", "Usb", 30000, "violet", 'active'],
  ["Grafik planshet", "Tablet", 45000, "violet", 'active'],
  ["Elektron kitob (E-reader)", "BookOpen", 48000, "violet", 'active'],
  ["Fleshka 128GB", "Usb", 28000, "violet", 'active'],
  ["Yoga gilamchasi", "Dumbbell", 21000, "violet", 'active'],
  ["Basketbol to’pi", "Dumbbell", 27000, "violet", 'active'],
  ["Futbol to’pi", "Dumbbell", 25000, "violet", 'active'],
  ["Shaxmat soati", "Dices", 19000, "violet", 'active'],
  ["Doska o’yini (Monopoliya)", "Dices", 32000, "violet", 'active'],
  ["3D puzzle", "Puzzle", 17500, "violet", 'active'],
  ["Konstruktor to'plami", "Dices", 29000, "violet", 'active'],
  ["Rasm doskasi", "Palette", 22000, "violet", 'active'],
  ["Molbert (kichik)", "Palette", 38000, "violet", 'active'],
  ["Gitara aksessuari", "Music2", 24000, "violet", 'active'],
  ["Musiqa pleer", "Music2", 45000, "violet", 'active'],
  ["Radioapparat", "Music2", 33000, "violet", 'active'],
  ["Devor soati", "Clock", 24500, "violet", 'active'],
  ["Termo-sumka", "Luggage", 17800, "violet", 'active'],
  ["Skeytbord g’ildiragi", "Wrench", 26500, "violet", 'active'],
  ["Bilim viktorinasi to'plami", "Box", 14200, "blue", 'active'],
  ["Dasturlash kitobi", "BookOpen", 22500, "violet", 'active'],
  ["1 oy bepul o'qish", "GraduationCap", 60000, "gold", 'active'],
  ["2 oy bepul o'qish", "GraduationCap", 110000, "gold", 'active'],
  ["1 oy IELTS kursi", "GraduationCap", 95000, "gold", 'active'],
  ["Xususiy dars (1 soat)", "Compass", 45000, "gold", 'active'],
  ["AI kolonka", "Speaker", 88000, "gold", 'active'],
  ["Simsiz quloqchin Pro", "Headphones", 92000, "gold", 'active'],
  ["Telefon Redmi", "Smartphone", 100000, "gold", 'active'],
  ["Telefon Samsung A-seriya", "Smartphone", 180000, "gold", 'active'],
  ["iPad (kirish darajasi)", "Tablet", 150000, "gold", 'active'],
  ["iPad Air", "Tablet", 280000, "gold", 'active'],
  ["Notebook (oddiy)", "Laptop", 250000, "gold", 'active'],
  ["Notebook (Pro)", "Laptop", 400000, "gold", 'active'],
  ["MacBook Air", "Laptop", 500000, "gold", 'active'],
  ["MacBook Pro", "Laptop", 750000, "gold", 'active'],
  ["iPhone (kirish darajasi)", "Smartphone", 450000, "gold", 'active'],
  ["iPhone Pro", "Smartphone", 700000, "gold", 'active'],
  ["IELTS 100% grant", "Trophy", 900000, "gold", 'active'],
  ["Chempionlar kubogi", "Award", 65000, "gold", 'active'],
  ["Yillik MVP mukofoti", "Medal", 120000, "gold", 'active'],
  ["Toshkentga sayohat", "Plane", 300000, "gold", 'active'],
  ["Samarqandga sayohat", "Plane", 250000, "gold", 'active'],
  ["Buxoroga sayohat", "Plane", 220000, "gold", 'active'],
  ["Dubay sayohati", "Plane", 1500000, "gold", 'active'],
  ["Turkiya sayohati", "Plane", 1200000, "gold", 'active'],
  ["Robototexnika to'plami", "Gamepad2", 65000, "gold", 'active'],
  ["Mikroskop (o'quv)", "Box", 58000, "gold", 'active'],
  ["Teleskop (kichik)", "Box", 72000, "gold", 'active'],
  ["Drone (mini)", "Rocket", 380000, "gold", 'active'],
  ["Kamera (kichik)", "Camera", 320000, "gold", 'active'],
  ["O'yin konsoli", "Gamepad2", 400000, "gold", 'active'],]);
store.replaceAll({
  ...extraData,
  general_coins, coin_shop,
  users, students, teachers, groups, courses, payments, leads, attendance, exams,
  certificates, branches, rooms: roomsData, expenses, salaries, announcements,
  lessons, assignments, quizzes, coin_log, inventory, documents, contracts, positions,
  invoices, discounts, messages, bonuses, fines, parents, missions, badges, campaigns,
  rules, evaluations, books, curriculum,
  live_sessions, enrollments, transfers, frozen_students, alumni_records,
  cashbox: cashbox_data, bank_accounts: bank_accounts_data,
  reception_log: reception_log_data, backups: backups_data,
  tasks, homework, placement_tests, surveys, feedback: feedback_data,
  notifications_log, events,
  sales_pipeline, meetings, teacher_kpi, room_bookings,
  attendance_analytics, complaints, success_stories, speaking_club,
  demo_lessons, follow_ups,
  waiting_list, referrals, group_analytics,
  teacher_schedule: teacher_schedule_data, lesson_library,
  homework_reviews, mock_exams, exam_results,
  student_portfolio, leave_management, olympiad, internal_chat,
  partner_companies, tickets, resource_center, debate_club,
  sms_log, student_timeline, essays, survey_votes, chat_messages,
  notifications, daily_journal, teacher_portfolio,
  promo_codes, lucky_wheel_log, streak_rewards, audit_log: [],
});

console.log("✅ Demo ma'lumotlar yuklandi: 30 akkaunt (18 rol), 14 o'quvchi, 10 o'qituvchi, 10 guruh, 10 fan, 14 to'lov, 8 lid, darslar/topshiriqlar/testlar.");
