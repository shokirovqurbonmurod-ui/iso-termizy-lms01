import {
  LayoutDashboard, Video, CalendarClock, Brain, Calendar, Map, Gauge,
  Users, GraduationCap, Boxes, ClipboardCheck, FileCheck2, Library, BookOpen,
  Layers, ListTree, UserPlus, Repeat, Snowflake, Award, Trophy,
  Calculator, CreditCard, Wallet, Banknote, Gift, AlertTriangle, PiggyBank, Landmark,
  Headphones, UserSearch, Send, TrendingUp,
  Building2, DoorOpen, Package, Briefcase, FileText, FileSignature,
  Crown, Bell, Users2, Target, Medal, ShoppingBag,
  BarChart3, ShieldCheck, KeyRound, DatabaseBackup, Settings,
  MessageCircle, NotebookPen, Flame, Clock, Star, Lightbulb, Smartphone, Sparkles, Gamepad2,
  Mic, Radio, Vote, Camera, Glasses, Swords, Dumbbell, Volume2, Share2, Clapperboard,
  Dices, Gem, Handshake, Palette, Ticket, HelpCircle, History, Puzzle, Hourglass,
  Smile, Cake, Box, TrendingDown, Plane, Drama, SprayCan,
} from 'lucide-react';
import { Presentation, ClipboardList, ListChecks, Coins, Contact, Receipt, Percent, MessageSquare, ScanFace, Bot, Megaphone } from 'lucide-react';
import { isAdmin, ROLES } from './roles.js';

// Ops/back-office menu items visible only to admin-tier roles (isAdmin() bypasses this).
const ADMIN_ONLY = [];
// Texnik/tizim (IT) bandlari — o'quvchi va ota-ona panelida ko'rinmasin, xodimlarga (admin, o'qituvchi va h.k.) ko'rinsin.
const STAFF_ONLY = ROLES.filter((r) => !['student', 'parent', 'guest'].includes(r));
// O'quvchiga Chat & Xabarlar bo'limida faqat chatning o'zi ko'rinsin — boshqarish/statistika
// sub-tablari (Aloqa paneli, Ichki xabarlar) chalg'itmasin degan aniq so'rov bo'yicha.
const NON_STUDENT = ROLES.filter((r) => r !== 'student');

// roles: array of role keys allowed. `null` = everyone.
// kind: how the route renders. resource → generic CRUD table (see resources.js).
export const MENU = [
  {
    group: 'Command Center',
    items: [
      { key: 'command-center', label: 'Command Center', icon: LayoutDashboard, kind: 'dashboard', roles: null },
      { key: 'live-classroom', label: 'Live Classroom', icon: Video, kind: 'liveclassroom', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','methodologist','student'] },
      { key: 'ai-assistant', label: 'ISO Termizy AI', icon: Sparkles, kind: 'aiassistant', roles: null },
      { key: 'ai-analytics', label: 'AI Analitika', icon: Brain, kind: 'ai', roles: ['director','super_admin','admin','academic_manager'] },
      { key: 'schedule-calendar', label: 'Jadval & Kalendar', icon: CalendarClock, kind: 'tabs', roles: null, tabs: [
        { key: 'schedule', label: 'Jadval', icon: CalendarClock, kind: 'schedule', roles: null },
        { key: 'calendar', label: 'Kalendar', icon: Calendar, kind: 'calendar', roles: null },
      ] },
      { key: 'branches-map', label: 'Filiallar xaritasi', icon: Map, kind: 'map', roles: ['director','super_admin','admin'] },
      { key: 'tasks', label: 'Vazifalar', icon: ClipboardList, kind: 'tasks', roles: null },
      { key: 'meetings', label: "Yig'ilishlar", icon: Users, kind: 'meetings', roles: ['director','super_admin','admin','academic_manager','hr'] },
      { key: 'kpi', label: 'KPI Boshqaruv', icon: Gauge, kind: 'reports', roles: ['director','super_admin','admin','academic_manager'] },
    ],
  },
  {
    group: 'Akademik',
    items: [
      { key: 'students', label: "O'quvchilar", icon: Users, kind: 'resource', resource: 'students', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher','methodologist','hr','call_center'] },
      { key: 'teachers', label: "O'qituvchilar", icon: GraduationCap, kind: 'resource', resource: 'teachers', roles: ['director','super_admin','admin','academic_manager','hr','methodologist'] },
      { key: 'groups', label: 'Guruhlar', icon: Boxes, kind: 'groups', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher','methodologist'] },
      { key: 'group-analytics', label: 'Guruh analitikasi', icon: BarChart3, kind: 'groupanalytics', roles: ['director','super_admin','admin','academic_manager'] },
      { key: 'teacher-portfolio-kpi', label: "O'qituvchi portfolio & KPI", icon: Briefcase, kind: 'tabs', roles: ['founder','director','super_admin','branch_manager','academic_manager','admin','head_teacher','senior_teacher','teacher','hr'], tabs: [
        { key: 'teacher-portfolio', label: 'Portfolio', icon: Briefcase, kind: 'teacherportfolio', roles: ['founder','director','super_admin','branch_manager','academic_manager','admin','head_teacher','senior_teacher','teacher'] },
        { key: 'teacher-kpi', label: 'KPI', icon: Gauge, kind: 'teacherkpi', roles: ['director','super_admin','admin','academic_manager','hr'] },
      ] },
      { key: 'teacher-schedule', label: "O'qituvchi jadvali", icon: CalendarClock, kind: 'tgrid', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher'] },
      { key: 'lessons', label: 'Darslar', icon: Presentation, kind: 'lessonspage', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher','student'] },
      { key: 'lesson-library', label: 'Dars kutubxonasi', icon: Library, kind: 'lessonlibrary', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher','librarian'] },
      { key: 'room-booking', label: 'Xona bron', icon: DoorOpen, kind: 'roombooking', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher'] },
      { key: 'daily-journal', label: 'Kundalik jurnal', icon: NotebookPen, kind: 'dailyjournal', roles: ['founder','director','super_admin','branch_manager','academic_manager','admin','head_teacher','senior_teacher','teacher'] },
      { key: 'attendance-center', label: 'Davomat markazi', icon: ClipboardCheck, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher','student'], tabs: [
        { key: 'attendance-mark', label: 'Belgilash', icon: ClipboardCheck, kind: 'attmark', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher'] },
        { key: 'attendance', label: 'Umumiy', icon: ClipboardCheck, kind: 'attendanceoverall', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher','student'] },
        { key: 'attendance-analytics', label: 'Analitika', icon: BarChart3, kind: 'attanalytics', roles: ['director','super_admin','admin','academic_manager'] },
      ] },
      { key: 'face-checkin', label: 'Yuz orqali kirish', icon: ScanFace, kind: 'facecheckin', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher'] },
      { key: 'homework', label: 'Uy vazifalari', icon: ClipboardList, kind: 'homework', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher','student'] },
      { key: 'placement-test', label: 'Placement Test', icon: FileCheck2, kind: 'placementtest', roles: ['director','super_admin','admin','academic_manager','reception'] },
      { key: 'exams', label: 'Imtihonlar', icon: FileCheck2, kind: 'exams', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher'] },
      { key: 'certificates', label: 'Sertifikatlar', icon: Award, kind: 'certificates', roles: ['director','super_admin','admin','academic_manager','reception','student'] },
      { key: 'library-e', label: 'Kutubxona & E-kutubxona', icon: Library, kind: 'tabs', roles: ['director','super_admin','admin','librarian','teacher','senior_teacher','student'], tabs: [
        { key: 'library', label: 'Kutubxona', icon: Library, kind: 'librarypage', roles: ['director','super_admin','admin','librarian','teacher','senior_teacher','student'] },
        { key: 'elibrary', label: 'E-kutubxona', icon: BookOpen, kind: 'resource', resource: 'e_library', roles: null },
      ] },
      { key: 'courses', label: 'Kurslar / Fanlar', icon: BookOpen, kind: 'courses', roles: ['director','super_admin','admin','academic_manager','methodologist'] },
      { key: 'levels', label: 'Darajalar (CEFR)', icon: Layers, kind: 'levels', roles: null },
      { key: 'curriculum', label: "O'quv reja", icon: ListTree, kind: 'curriculumpage', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher'] },
      { key: 'learning-map', label: "O'quv xaritasi", icon: Map, kind: 'resource', resource: 'learning_map', roles: null },
    ],
  },
  {
    group: "O'quv jarayoni",
    items: [
      { key: 'assignments', label: 'Topshiriqlar', icon: ClipboardList, kind: 'assignmentspage', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      { key: 'essays', label: 'Esselar', icon: FileText, kind: 'essayspage', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher','student'] },
      { key: 'quizzes', label: 'Testlar & Quiz', icon: ListChecks, kind: 'quizzespage', roles: ['director','super_admin','admin','academic_manager','methodologist','teacher','senior_teacher','student'] },
      { key: 'homework-review', label: 'Vazifa tekshiruvi', icon: FileCheck2, kind: 'homeworkreview', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher'] },
      { key: 'mock-exams', label: 'Mock imtihonlar', icon: FileCheck2, kind: 'mockexams', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      { key: 'exam-results', label: 'Imtihon natijalari', icon: Award, kind: 'resource', resource: 'exam_results', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      { key: 'grade-book', label: 'Baholar kitobi', icon: BookOpen, kind: 'tabs', roles: null, tabs: [
        { key: 'grade-book-main', label: 'Baholar', icon: BookOpen, kind: 'gradebook', roles: null },
        { key: 'report-cards', label: 'Tabelnomalar', icon: FileText, kind: 'reportcards', roles: null },
      ] },
      { key: 'progress-rep', label: 'Progress hisobot', icon: BarChart3, kind: 'studentprogressreports', roles: null },
      { key: 'lesson-rate', label: 'Dars baholash', icon: Star, kind: 'lessonratings', roles: null },
      { key: 'lesson-plan', label: 'Dars rejasi', icon: FileText, kind: 'lessonplans', roles: null },
      { key: 'peer-rev', label: 'Peer Review', icon: Users, kind: 'peerreviews', roles: null },
      { key: 'method-lib', label: 'Metodika kutubxonasi', icon: BookOpen, kind: 'methodologylib', roles: null },
      { key: 'teacher-grow', label: "Ustoz o'sishi", icon: TrendingUp, kind: 'teachergrowth', roles: null },
      { key: 'lesson-swp', label: 'Dars almashtirish', icon: Repeat, kind: 'scheduleswap', roles: null },
    ],
  },
  {
    group: "O'quvchi boshqaruvi",
    items: [
      { key: 'enrollment', label: "Ro'yxatga olish", icon: UserPlus, kind: 'enrollment', roles: ['director','super_admin','admin','reception','academic_manager','call_center'] },
      { key: 'group-change', label: "Guruh o'zgartirish", icon: Repeat, kind: 'groupchange', roles: ['director','super_admin','admin','reception','academic_manager'] },
      { key: 'frozen', label: 'Muzlatilganlar', icon: Snowflake, kind: 'frozenstudents', roles: ['director','super_admin','admin','reception','academic_manager','accountant'] },
      { key: 'alumni', label: 'Bitiruvchilar', icon: GraduationCap, kind: 'alumni', roles: ['director','super_admin','admin','academic_manager','reception'] },
      { key: 'student-portfolio', label: "O'quvchi portfolio", icon: FileText, kind: 'resource', resource: 'student_portfolio', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      { key: 'student-timeline', label: "O'quvchi tarixchasi", icon: ListTree, kind: 'studenttimeline', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      { key: 'top100', label: 'TOP 100 reyting', icon: Trophy, kind: 'leaderboard', roles: null },
      { key: 'active-students', label: 'Faol o\'quvchilar', icon: Users, kind: 'activestudents', roles: ['director','super_admin','admin','academic_manager','reception'] },
      { key: 'debtors', label: 'Qarzdorlar', icon: AlertTriangle, kind: 'debtorspage', roles: ['director','super_admin','admin','accountant'] },
      { key: 'student-behavior', label: 'Talaba xulqi', icon: Users, kind: 'studentbehavior', roles: null },
      { key: 'student_awards', label: 'Talaba mukofotlari', icon: Award, kind: 'resource', resource: 'student_awards', roles: null },
    ],
  },
  {
    group: 'Moliya',
    items: [
      { key: 'accounting', label: 'Buxgalteriya', icon: Calculator, kind: 'accounting', roles: ['director','super_admin','admin','accountant'] },
      { key: 'payments-cashbox', label: "To'lovlar & Kassa", icon: CreditCard, kind: 'tabs', roles: ['director','super_admin','admin','accountant','cashier','reception'], tabs: [
        { key: 'payments', label: "To'lovlar", icon: CreditCard, kind: 'resource', resource: 'payments', roles: ['director','super_admin','admin','accountant','cashier','reception'] },
        { key: 'cashbox', label: 'Kassa', icon: PiggyBank, kind: 'cashbox', roles: ['director','super_admin','admin','accountant','cashier'] },
      ] },
      { key: 'bank', label: 'Bank hisoblari', icon: Landmark, kind: 'bankaccounts', roles: ['director','super_admin','admin','accountant'] },
      { key: 'expenses', label: 'Xarajatlar', icon: Wallet, kind: 'expenses', roles: ['director','super_admin','admin','accountant'] },
      { key: 'salaries', label: 'Oyliklar', icon: Banknote, kind: 'salaries', roles: ['director','super_admin','admin','accountant','hr'] },
      { key: 'bonuses-fines', label: 'Bonuslar & Jarimalar', icon: Gift, kind: 'tabs', roles: ['director','super_admin','admin','accountant','hr'], tabs: [
        { key: 'bonuses', label: 'Bonuslar', icon: Gift, kind: 'bonuses', roles: ['director','super_admin','admin','accountant','hr'] },
        { key: 'fines', label: 'Jarimalar', icon: AlertTriangle, kind: 'fines', roles: ['director','super_admin','admin','accountant','hr'] },
      ] },
      { key: 'invoices', label: 'Fatura', icon: Receipt, kind: 'invoices', roles: ['director','super_admin','admin','accountant','cashier'] },
      { key: 'discounts', label: 'Chegirmalar', icon: Percent, kind: 'discounts', roles: ['director','super_admin','admin','accountant','reception'] },
    ],
  },
  {
    group: 'Marketing & CRM',
    items: [
      { key: 'crm', label: 'Marketing CRM', icon: TrendingUp, kind: 'crm', roles: ['director','super_admin','admin','marketing','smm','call_center','reception'] },
      { key: 'reception', label: 'Reception', icon: Headphones, kind: 'reception', roles: ['director','super_admin','admin','reception','call_center'] },
      { key: 'sales-pipeline', label: 'Sales Pipeline', icon: TrendingUp, kind: 'salespipeline', roles: ['director','super_admin','admin','marketing','smm','call_center','reception'] },
      { key: 'leads', label: 'Lidlar bazasi', icon: UserSearch, kind: 'leadspage', roles: ['director','super_admin','admin','marketing','smm','call_center','reception'] },
      { key: 'demo-lessons', label: 'Demo darslar', icon: Video, kind: 'demolessons', roles: ['director','super_admin','admin','marketing','reception','call_center','teacher','senior_teacher'] },
      { key: 'waiting-list', label: 'Kutish ro\'yxati', icon: Users, kind: 'waitinglist', roles: ['director','super_admin','admin','marketing','reception','call_center'] },
      { key: 'follow-ups', label: 'Follow Up', icon: Send, kind: 'followups', roles: ['director','super_admin','admin','marketing','smm','call_center','reception'] },
      { key: 'referrals', label: 'Tavsiya dasturi', icon: Gift, kind: 'referrals', roles: ['director','super_admin','admin','marketing','reception'] },
      { key: 'campaigns', label: 'Marketing kampaniyalari', icon: Send, kind: 'campaigns', roles: ['director','super_admin','admin','marketing','smm'] },
      { key: 'marketing-analytics', label: 'Marketing analitikasi', icon: BarChart3, kind: 'tabs', roles: ['director','super_admin','admin','marketing'], tabs: [
        { key: 'website-analytics', label: 'Veb-sayt', icon: BarChart3, kind: 'resource', resource: 'website_analytics', roles: null },
        { key: 'seo-tracker', label: 'SEO', icon: TrendingUp, kind: 'resource', resource: 'seo_tracker', roles: null },
        { key: 'conversion', label: 'Konversiya', icon: BarChart3, kind: 'conversion', roles: ['director','super_admin','admin','marketing'] },
      ] },
      { key: 'surveys-feedback', label: "So'rovnomalar & Feedback", icon: ClipboardList, kind: 'tabs', roles: null, tabs: [
        { key: 'surveys', label: "So'rovnomalar", icon: ClipboardList, kind: 'survey', roles: null },
        { key: 'feedback', label: 'Fikr-mulohazalar', icon: Medal, kind: 'feedback', roles: ['director','super_admin','admin','marketing','reception'] },
      ] },
      { key: 'nps-scores', label: 'NPS & Qoniqish', icon: BarChart3, kind: 'npsscores', roles: ADMIN_ONLY },
      { key: 'competitor-analysis', label: 'Raqobatchi tahlili', icon: BarChart3, kind: 'resource', resource: 'competitor_analysis', roles: ADMIN_ONLY },
      { key: 'market-research', label: 'Bozor tadqiqoti', icon: UserSearch, kind: 'resource', resource: 'market_research', roles: ADMIN_ONLY },
      { key: 'customer-journey', label: 'Mijoz yo\'li', icon: Map, kind: 'resource', resource: 'customer_journey', roles: ADMIN_ONLY },
      { key: 'sales-targets', label: 'Sotuv maqsadlari', icon: Target, kind: 'resource', resource: 'sales_targets', roles: ADMIN_ONLY },
      { key: 'kpi-dashboard', label: 'KPI ko\'rsatkichlari', icon: Gauge, kind: 'resource', resource: 'kpi_dashboard', roles: ADMIN_ONLY },
    ],
  },
  {
    group: 'Boshqaruv & HR',
    items: [
      { key: 'branches', label: 'Filiallar', icon: Building2, kind: 'branches', roles: ['director','super_admin','admin'] },
      { key: 'rooms-booking', label: 'Xonalar & Booking', icon: DoorOpen, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','reception'], tabs: [
        { key: 'rooms', label: 'Xonalar', icon: DoorOpen, kind: 'rooms', roles: ['director','super_admin','admin','academic_manager','reception'] },
        { key: 'room-booking-facilities', label: 'Booking', icon: DoorOpen, kind: 'roombooking', roles: ['director','super_admin','admin','academic_manager','reception','teacher','senior_teacher'] },
      ] },
      { key: 'inventory-assets', label: 'Inventar & Jihozlar', icon: Package, kind: 'tabs', roles: ['director','super_admin','admin','it_admin','librarian'], tabs: [
        { key: 'inventory', label: 'Inventar', icon: Package, kind: 'inventory', roles: ['director','super_admin','admin','it_admin','librarian'] },
        { key: 'it-assets', label: 'IT jihozlar', icon: Smartphone, kind: 'resource', resource: 'it_assets', roles: null },
        { key: 'software-licenses', label: 'Litsenziyalar', icon: KeyRound, kind: 'resource', resource: 'software_licenses', roles: null },
      ] },
      { key: 'hr', label: 'Xodimlar · HR', icon: Briefcase, kind: 'staff', roles: ['director','super_admin','admin','hr'] },
      { key: 'staff-directory', label: 'Xodimlar katalogi', icon: Contact, kind: 'staffdirectory', roles: ADMIN_ONLY },
      { key: 'documents', label: 'Hujjatlar', icon: FileText, kind: 'documents', roles: ['director','super_admin','admin','hr','accountant'] },
      { key: 'contracts', label: 'Shartnomalar', icon: FileSignature, kind: 'contracts', roles: ['director','super_admin','admin','hr'] },
      { key: 'positions', label: 'Lavozimlar', icon: Contact, kind: 'positions', roles: ['director','super_admin','admin','hr'] },
      { key: 'rules', label: 'Tartib-qoidalar', icon: ClipboardList, kind: 'rules', roles: ['director','super_admin','admin','hr'] },
      { key: 'evaluations', label: 'Xodim baho', icon: Medal, kind: 'evaluations', roles: ['director','super_admin','admin','hr','academic_manager'] },
      { key: 'work-hours', label: 'Ish vaqti', icon: Clock, kind: 'workhours', roles: ADMIN_ONLY },
      { key: 'leave-management', label: "Ta'til & Kasallik", icon: Calendar, kind: 'leavemanagement', roles: ['director','super_admin','admin','hr','teacher','senior_teacher'] },
      { key: 'tenure', label: 'Ish staji', icon: TrendingUp, kind: 'worktenure', roles: ADMIN_ONLY },
      { key: 'hiring', label: 'Ishga qabul', icon: Users, kind: 'hiringpipeline', roles: ADMIN_ONLY },
      { key: 'int-jobs', label: 'Ichki vakansiyalar', icon: Briefcase, kind: 'internaljobs', roles: ADMIN_ONLY },
      { key: 'mentorship-training', label: 'Mentorlik & Trening', icon: Users, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
        { key: 'mentorship-m', label: 'Mentorlik', icon: Users, kind: 'mentorship', roles: ADMIN_ONLY },
        { key: 'training-t', label: 'Trening', icon: GraduationCap, kind: 'trainingtracker', roles: ADMIN_ONLY },
      ] },
      { key: 'turnover', label: 'Kadrlar aylanmasi', icon: TrendingUp, kind: 'turnoverlog', roles: ADMIN_ONLY },
      { key: 'exit-int', label: 'Chiqish suhbati', icon: FileText, kind: 'exitinterviews', roles: ADMIN_ONLY },
      { key: 'okr', label: 'OKR maqsadlar', icon: Target, kind: 'okrgoals', roles: ADMIN_ONLY },
      { key: 'eom', label: 'Xodim oyi', icon: Trophy, kind: 'employeeofmonth', roles: ADMIN_ONLY },
      { key: 'insurance-m', label: 'Ustoz boshqaruvi', icon: ShieldCheck, kind: 'insurance', roles: ADMIN_ONLY },
    ],
  },
  {
    group: 'Aloqa & Gamifikatsiya',
    items: [
      { key: 'chat-messages', label: 'Chat & Xabarlar', icon: MessageCircle, kind: 'tabs', roles: null, tabs: [
        { key: 'comm-dashboard', label: 'Aloqa paneli', icon: LayoutDashboard, kind: 'communicationdashboard', roles: STAFF_ONLY },
        { key: 'group-chat', label: 'Guruh chat', icon: MessageCircle, kind: 'chat', roles: null },
        { key: 'internal-chat', label: 'Ichki xabarlar', icon: Send, kind: 'chat', roles: STAFF_ONLY },
        { key: 'xabar-yuborish', label: 'Xabar yuborish', icon: Send, kind: 'messagespage', roles: ['director','super_admin','admin','marketing','smm'] },
        { key: 'announcement-center', label: "E'lon markazi", icon: Megaphone, kind: 'announcementcenter', roles: NON_STUDENT },
      ] },
      { key: 'bot', label: 'Telegram Bot', icon: Bot, kind: 'bot', roles: null },
      { key: 'media-center', label: 'Media markazi', icon: Video, kind: 'tabs', roles: null, tabs: [
        { key: 'video-lessons', label: 'Video darslar', icon: Video, kind: 'videolessonspage', roles: null },
        { key: 'media-quizzes', label: 'Testlar', icon: ListChecks, kind: 'quizzespage', roles: null },
        { key: 'success-stories', label: 'Muvaffaqiyat tarixi', icon: Trophy, kind: 'successstories', roles: null },
      ] },
      { key: 'parents-center', label: "Ota-onalar markazi", icon: Users2, kind: 'tabs', roles: ['director','super_admin','admin','reception','teacher','senior_teacher','parent'], tabs: [
        { key: 'parents', label: 'Ota-onalar', icon: Users2, kind: 'parentspage', roles: ['director','super_admin','admin','reception','teacher','senior_teacher','parent'] },
        { key: 'parent_dashboard', label: 'Panel', icon: Users, kind: 'parentdashboard', roles: null },
        { key: 'parent-notifications', label: 'Xabarnoma', icon: Bell, kind: 'parentnotifications', roles: null },
        { key: 'parent-rep', label: 'Haftalik hisobot', icon: FileText, kind: 'parentreports', roles: null },
        { key: 'parent-meet', label: 'Uchrashuv', icon: Calendar, kind: 'resource', resource: 'parent_meetings', roles: null },
      ] },
      { key: 'complaints-center', label: 'Shikoyatlar markazi', icon: AlertTriangle, kind: 'tabs', roles: ['director','super_admin','admin','reception','hr','it_admin'], tabs: [
        { key: 'complaints', label: 'Shikoyatlar', icon: AlertTriangle, kind: 'complaints', roles: ['director','super_admin','admin','reception','hr'] },
        { key: 'tickets', label: 'Tiket markazi', icon: Headphones, kind: 'tickets', roles: ['director','super_admin','admin','it_admin','reception'] },
        { key: 'student-complaints', label: 'Talaba shikoyatlari', icon: AlertTriangle, kind: 'complaints', roles: null },
        { key: 'teacher-complaints', label: 'Ustoz shikoyatlari', icon: AlertTriangle, kind: 'complaints', roles: null },
      ] },
      { key: 'notifications', label: 'Bildirishnomalar', icon: Bell, kind: 'notificationsadmin', roles: null },
      { key: 'olympiad-tourney', label: 'Olimpiada & Musobaqalar', icon: Trophy, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'], tabs: [
        { key: 'olympiad', label: 'Olimpiada', icon: Trophy, kind: 'olympiad', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
        { key: 'tourney', label: 'Turnir jadvali', icon: Trophy, kind: 'resource', resource: 'tournament_bracket', roles: null },
      ] },
      { key: 'debate-speaking', label: 'Debate & Speaking Club', icon: Users, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'], tabs: [
        { key: 'debate-club', label: 'Debate Club', icon: Users, kind: 'debateclub', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
        { key: 'speaking-club', label: 'Speaking Club', icon: Video, kind: 'speakingclub', roles: ['director','super_admin','admin','academic_manager','teacher','senior_teacher','student'] },
      ] },
      { key: 'xp-streak', label: 'XP & Streak', icon: Flame, kind: 'tabs', roles: null, tabs: [
        { key: 'xp-log', label: 'XP tarixi', icon: TrendingUp, kind: 'resource', resource: 'xp_log', roles: null },
        { key: 'streak-rewards', label: 'Streak mukofotlari', icon: Flame, kind: 'streakrewards', roles: ['founder','director','super_admin','admin','academic_manager'] },
        { key: 'hw-streak-m', label: 'Vazifa streak', icon: Flame, kind: 'resource', resource: 'homework_streak', roles: null },
      ] },
      { key: 'coin-system', label: 'Coin tizimi', icon: Coins, kind: 'tabs', roles: null, tabs: [
        { key: 'coin-dashboard', label: 'Dashboard', icon: Coins, kind: 'coindash', roles: ['founder','director','super_admin','branch_manager','admin','academic_manager'] },
        { key: 'points', label: 'Pont berish', icon: TrendingUp, kind: 'pointgive', roles: ['founder','director','super_admin','admin','academic_manager','head_teacher','senior_teacher','teacher'] },
        { key: 'give-coins', label: 'Coin berish', icon: Coins, kind: 'coins', roles: ['director','super_admin','admin','reception','teacher','senior_teacher'] },
        { key: 'coin-exchange', label: 'Coin almashuvi', icon: Repeat, kind: 'coinexchange', roles: null },
        { key: 'coin-history', label: 'Coinlar tarixi', icon: Clock, kind: 'coinhistory', roles: null },
      ] },
      { key: 'coin-shop-rewards', label: 'Coin Shop & Mukofotlar', icon: ShoppingBag, kind: 'tabs', roles: null, tabs: [
        { key: 'coin-shop', label: 'Coin Shop', icon: ShoppingBag, kind: 'shop', roles: null },
        { key: 'lucky-wheel', label: "Omad g'ildiragi", icon: Target, kind: 'luckywheel', roles: null },
        { key: 'lucky-wheel-log', label: "G'ildirak tarixi", icon: Clock, kind: 'luckywheellog', roles: ['founder','director','super_admin','branch_manager','admin','academic_manager'] },
      ] },
      { key: 'promo-referral', label: 'Promo & Referral', icon: Gift, kind: 'tabs', roles: ['founder','director','super_admin','admin','marketing'], tabs: [
        { key: 'promo-codes', label: 'Promo kodlar', icon: Gift, kind: 'promocodes', roles: ['founder','director','super_admin','admin','marketing'] },
        { key: 'referrals-m', label: 'Taklif dasturi', icon: Gift, kind: 'resource', resource: 'referrals', roles: null },
      ] },
    ],
  },
  {
    group: 'Tizim & IT',
    items: [
      { key: 'audit', label: 'Audit & Xavfsizlik', icon: ShieldCheck, kind: 'tabs', roles: ['director','super_admin','admin','it_admin'], tabs: [
        { key: 'audit-main', label: 'Audit', icon: ShieldCheck, kind: 'audit', roles: ['director','super_admin','admin','it_admin'] },
        { key: 'security-audit', label: 'Xavfsizlik auditi', icon: ShieldCheck, kind: 'resource', resource: 'security_audit', roles: null },
        { key: 'compliance-checklist', label: 'Muvofiqlik', icon: ShieldCheck, kind: 'resource', resource: 'compliance_checklist', roles: null },
        { key: 'risk-register', label: 'Risklar', icon: AlertTriangle, kind: 'resource', resource: 'risk_register', roles: null },
        { key: 'incident-reports', label: 'Hodisalar', icon: AlertTriangle, kind: 'resource', resource: 'incident_reports', roles: null },
      ] },
      { key: 'ai-audit', label: 'ISO Termizy AI Auditi', icon: Sparkles, kind: 'aiaudit', roles: ['founder','director','super_admin','branch_manager','admin'] },
      { key: 'passwords', label: 'Parollar', icon: KeyRound, kind: 'passwords', roles: ['director','super_admin','admin'] },
      { key: 'roles', label: 'Rollar & Ruxsatlar', icon: KeyRound, kind: 'roles', roles: ['director','super_admin','admin','it_admin'] },
      { key: 'settings', label: 'Sozlamalar', icon: Settings, kind: 'settings', roles: null },
      { key: 'misc-legacy', label: 'Boshqa funksiyalar', icon: Package, kind: 'tabs', roles: null, tabs: [
        { key: 'teacher-schedule-swap', label: "Ustoz jadval almashtirish", icon: Repeat, kind: 'scheduleswap', roles: null },
        { key: 'resource-center', label: 'Resurs markazi', icon: Library, kind: 'resource', resource: 'resource_center', roles: STAFF_ONLY },
        { key: 'files', label: 'Fayl boshqaruvchi', icon: FileText, kind: 'resource', resource: 'file_manager', roles: STAFF_ONLY },
        { key: 'qr-m', label: 'QR kodlar', icon: Smartphone, kind: 'qrcheckinpage', roles: STAFF_ONLY },
        { key: 'check-in', label: 'Check-in', icon: Smartphone, kind: 'qrcheckinpage', roles: STAFF_ONLY },
        { key: 'booking-m', label: 'Booking', icon: Calendar, kind: 'bookingpage', roles: STAFF_ONLY },
        { key: 'social-media-posts', label: 'Ijtimoiy tarmoq', icon: MessageCircle, kind: 'resource', resource: 'social_media_posts', roles: STAFF_ONLY },
        { key: 'content-calendar', label: 'Kontent kalendari', icon: Calendar, kind: 'resource', resource: 'content_calendar', roles: STAFF_ONLY },
        { key: 'brand-assets', label: 'Brend aktivlari', icon: Star, kind: 'resource', resource: 'brand_assets', roles: STAFF_ONLY },
        { key: 'newsletter', label: 'Newsletter', icon: Send, kind: 'resource', resource: 'newsletter_log', roles: STAFF_ONLY },
        { key: 'safety-inspections', label: 'Xavfsizlik tekshiruvi', icon: ShieldCheck, kind: 'resource', resource: 'safety_inspections', roles: STAFF_ONLY },
        { key: 'fire-drill-log', label: "Yong'in mashqi", icon: Flame, kind: 'resource', resource: 'fire_drill_log', roles: STAFF_ONLY },
        { key: 'evacuation-plans', label: 'Evakuatsiya rejasi', icon: Map, kind: 'resource', resource: 'evacuation_plans', roles: STAFF_ONLY },
        { key: 'first-aid-supplies', label: 'Tibbiy jihozlar', icon: Star, kind: 'resource', resource: 'first_aid_supplies', roles: STAFF_ONLY },
        { key: 'vendor-management', label: 'Yetkazuvchilar', icon: Building2, kind: 'resource', resource: 'vendor_management', roles: STAFF_ONLY },
        { key: 'it-assets-2', label: 'IT jihozlar', icon: Smartphone, kind: 'resource', resource: 'it_assets', roles: STAFF_ONLY },
        { key: 'software-licenses-2', label: 'Litsenziyalar', icon: KeyRound, kind: 'resource', resource: 'software_licenses', roles: STAFF_ONLY },
        { key: 'network-monitoring', label: 'Tarmoq monitoring', icon: BarChart3, kind: 'resource', resource: 'network_monitoring', roles: STAFF_ONLY },
        { key: 'performance-metrics', label: 'Ishlash ko\'rsatkichlari', icon: Gauge, kind: 'resource', resource: 'performance_metrics', roles: STAFF_ONLY },
        { key: 'sla-tracking', label: 'SLA', icon: Clock, kind: 'resource', resource: 'sla_tracking', roles: STAFF_ONLY },
        { key: 'uptime-monitor', label: 'Uptime', icon: Gauge, kind: 'resource', resource: 'uptime_monitor', roles: STAFF_ONLY },
        { key: 'app-analytics', label: 'Ilova analitikasi', icon: BarChart3, kind: 'resource', resource: 'app_analytics', roles: STAFF_ONLY },
        { key: 'bug-reports', label: 'Xato hisobotlari', icon: AlertTriangle, kind: 'resource', resource: 'bug_reports', roles: STAFF_ONLY },
        { key: 'feature-requests', label: "Funksiya so'rovlari", icon: Lightbulb, kind: 'featurerequestspage', roles: STAFF_ONLY },
        { key: 'user-feedback', label: 'Foydalanuvchi fikrlari', icon: MessageSquare, kind: 'feedback', roles: STAFF_ONLY },
        { key: 'api-usage-2', label: 'API foydalanish', icon: BarChart3, kind: 'resource', resource: 'api_usage', roles: STAFF_ONLY },
        { key: 'webhook-log-2', label: 'Webhook', icon: Send, kind: 'resource', resource: 'webhook_log', roles: STAFF_ONLY },
        { key: 'anticheat', label: 'Anti-cheat', icon: ShieldCheck, kind: 'resource', resource: 'anti_cheat_log', roles: STAFF_ONLY },
        { key: 'data-imports', label: "Ma'lumot import", icon: DatabaseBackup, kind: 'resource', resource: 'data_imports', roles: STAFF_ONLY },
        { key: 'data-exports', label: "Ma'lumot eksport", icon: DatabaseBackup, kind: 'resource', resource: 'data_exports', roles: STAFF_ONLY },
        { key: 'migration-log', label: 'Migratsiya', icon: Repeat, kind: 'resource', resource: 'migration_log', roles: STAFF_ONLY },
        { key: 'webhook-log', label: 'Webhook logi', icon: Send, kind: 'resource', resource: 'webhook_log', roles: STAFF_ONLY },
        { key: 'system-updates', label: 'Tizim yangilanishlari', icon: Settings, kind: 'resource', resource: 'system_updates', roles: STAFF_ONLY },
        { key: 'notification-templates', label: 'Xabarnoma shabloni', icon: Bell, kind: 'resource', resource: 'notification_templates', roles: STAFF_ONLY },
        { key: 'email-templates', label: 'Email shabloni', icon: Send, kind: 'resource', resource: 'email_templates', roles: STAFF_ONLY },
        { key: 'sms-templates', label: 'SMS shabloni', icon: Send, kind: 'resource', resource: 'sms_templates', roles: STAFF_ONLY },
        { key: 'report-templates', label: 'Hisobot shabloni', icon: FileText, kind: 'resource', resource: 'report_templates', roles: STAFF_ONLY },
        { key: 'document-templates', label: 'Hujjat shabloni', icon: FileText, kind: 'resource', resource: 'document_templates', roles: STAFF_ONLY },
        { key: 'missions-challenges', label: 'Missiyalar & Challenges', icon: Target, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','teacher','student'], tabs: [
          { key: 'missions', label: 'Missiyalar', icon: Target, kind: 'missions', roles: ['director','super_admin','admin','academic_manager','teacher','student'] },
          { key: 'challenges', label: '1v1 Challenge', icon: Target, kind: 'challengespage', roles: null },
          { key: 'team-battles', label: 'Jamoa janglari', icon: ShieldCheck, kind: 'teambattlespage', roles: null },
        ] },
        { key: 'badge-level', label: 'Badge & Level', icon: Medal, kind: 'tabs', roles: ['director','super_admin','admin','academic_manager','methodologist'], tabs: [
          { key: 'badges', label: 'Badge boshqaruvi', icon: Medal, kind: 'badgesadmin', roles: ['director','super_admin','admin','academic_manager','methodologist'] },
          { key: 'levels-system', label: 'Level tizimi', icon: TrendingUp, kind: 'resource', resource: 'levels', roles: null },
        ] },
        { key: 'events', label: 'Tadbirlar markazi', icon: Calendar, kind: 'resource', resource: 'events', roles: null },
        { key: 'market', label: 'Marketplace', icon: ShoppingBag, kind: 'marketplacepage', roles: null },
        { key: 'student-posts-m', label: 'Blog & Ijtimoiy platforma', icon: FileText, kind: 'resource', resource: 'student_posts', roles: null },
        { key: 'ideas-feedback', label: "G'oyalar & Anonim fikr", icon: Lightbulb, kind: 'tabs', roles: null, tabs: [
          { key: 'ideas-m', label: "G'oyalar qutisi", icon: Lightbulb, kind: 'resource', resource: 'ideas_box', roles: null },
          { key: 'anon-feedback', label: 'Anonim fikr', icon: MessageSquare, kind: 'resource', resource: 'anonymous_feedback', roles: null },
        ] },
        { key: 'reports', label: 'Hisobotlar markazi', icon: BarChart3, kind: 'reports', roles: ['director','super_admin','admin','academic_manager','accountant'] },
        { key: 'transport-cafe', label: 'Transport & Oshxona', icon: Package, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'transport-m', label: 'Transport', icon: Package, kind: 'transport', roles: ADMIN_ONLY },
          { key: 'cafe', label: 'Oshxona', icon: Star, kind: 'cafeteria', roles: ADMIN_ONLY },
        ] },
        { key: 'building-safety', label: 'Bino & Xavfsizlik', icon: ShieldCheck, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'branch-cmp', label: 'Filial solishtirish', icon: BarChart3, kind: 'branches', roles: ADMIN_ONLY },
          { key: 'first-aid', label: 'Birinchi yordam', icon: Star, kind: 'firstaidlog', roles: ADMIN_ONLY },
        ] },
        { key: 'cctv-access', label: 'CCTV & Kirish nazorati', icon: UserSearch, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'cctv', label: 'CCTV', icon: UserSearch, kind: 'cctvlog', roles: ADMIN_ONLY },
          { key: 'access-c', label: 'Kirish nazorati', icon: ShieldCheck, kind: 'accesscontrol', roles: ADMIN_ONLY },
          { key: 'visitors', label: 'Mehmonlar', icon: UserSearch, kind: 'reception', roles: ADMIN_ONLY },
        ] },
        { key: 'emergency', label: 'Favqulodda vaziyatlar', icon: AlertTriangle, kind: 'emergencycontacts', roles: ADMIN_ONLY },
        { key: 'procurement-vendor', label: 'Xarid & Yetkazuvchilar', icon: ShoppingBag, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'procurement', label: 'Xarid qilish', icon: ShoppingBag, kind: 'procurement', roles: ADMIN_ONLY },
          { key: 'partners', label: 'Hamkorliklar', icon: Users, kind: 'partnercompanies', roles: ADMIN_ONLY },
        ] },
        { key: 'maintenance-requests', label: "Ta'mir & Texnik xizmat", icon: AlertTriangle, kind: 'maintenancerequests', roles: ADMIN_ONLY },
        { key: 'keys', label: 'Kalit boshqaruvi', icon: KeyRound, kind: 'keymanagement', roles: ADMIN_ONLY },
        { key: 'backup', label: 'Backup & Tiklash', icon: DatabaseBackup, kind: 'resource', resource: 'backups', roles: ['director','super_admin','it_admin'] },
        { key: 'activity-logs', label: 'Faollik & Tizim loglari', icon: UserSearch, kind: 'tabs', roles: ['director','super_admin','admin','it_admin'], tabs: [
          { key: 'actlog', label: 'Faollik logi', icon: UserSearch, kind: 'resource', resource: 'activity_log', roles: null },
          { key: 'error-log', label: 'Xatolar logi', icon: AlertTriangle, kind: 'resource', resource: 'error_log', roles: null },
          { key: 'backup-log', label: 'Backup logi', icon: DatabaseBackup, kind: 'resource', resource: 'backups', roles: null },
          { key: 'sms-log', label: 'SMS tarixi', icon: Send, kind: 'resource', resource: 'sms_log', roles: null },
          { key: 'notif-log', label: 'Bildirishnoma tarixi', icon: Bell, kind: 'resource', resource: 'notifications_log', roles: null },
          { key: 'api-usage', label: 'API loglari', icon: BarChart3, kind: 'resource', resource: 'api_usage', roles: null },
        ] },
        { key: 'rating-hof', label: 'Reyting & Hall of Fame', icon: Crown, kind: 'tabs', roles: null, tabs: [
          { key: 'top100-hof', label: 'TOP 100 reyting', icon: Trophy, kind: 'leaderboard', roles: null },
          { key: 'hall-fame', label: 'Shon-sharaf', icon: Trophy, kind: 'resource', resource: 'hall_of_fame', roles: null },
          { key: 'monthly-mvp-m', label: 'Oylik MVP', icon: Award, kind: 'resource', resource: 'monthly_mvp', roles: null },
        ] },
        { key: 'mini-games', label: "O'yinlar markazi", icon: Gamepad2, kind: 'minigames', roles: null },
        { key: 'media-interactive', label: 'Media & Interaktiv', icon: Clapperboard, kind: 'tabs', roles: null, tabs: [
          { key: 'karaoke-menu', label: 'Karaoke', icon: Mic, kind: 'karaokepage', roles: null },
          { key: 'whiteboard-menu', label: 'Whiteboard', icon: Presentation, kind: 'resource', resource: 'whiteboard_sessions', roles: null },
          { key: 'podcast-menu', label: 'Podcast', icon: Radio, kind: 'podcastpage', roles: null },
          { key: 'voting', label: 'Saylov', icon: Vote, kind: 'votingpage', roles: null },
          { key: 'live-stream', label: 'Jonli efir', icon: Video, kind: 'livestreampage', roles: null },
          { key: 'story-menu', label: 'Story', icon: Camera, kind: 'storypage', roles: null },
          { key: 'virtual-room', label: 'Virtual xona', icon: Glasses, kind: 'virtualroompage', roles: null },
          { key: 'boss-fight', label: 'Boss fight', icon: Swords, kind: 'bossfight', roles: null },
          { key: 'fitness', label: 'Fitness challenge', icon: Dumbbell, kind: 'fitnesschallengepage', roles: null },
          { key: 'stocks', label: "Aksiya o'yini", icon: TrendingUp, kind: 'resource', resource: 'stock_game', roles: null },
          { key: 'voice-msg', label: 'Ovozli xabar', icon: Volume2, kind: 'resource', resource: 'chat_voice', roles: null },
          { key: 'social-share', label: 'Ijtimoiy ulashish', icon: Share2, kind: 'resource', resource: 'social_shares', roles: null },
        ] },
        { key: 'daily-games', label: "Kundalik & Mini-o'yinlar", icon: Dices, kind: 'tabs', roles: null, tabs: [
          { key: 'daily-bonus', label: 'Kunlik bonus', icon: Coins, kind: 'dailybonuspage', roles: null },
          { key: 'weekly-tasks', label: 'Haftalik vazifalar', icon: Target, kind: 'weeklytaskspage', roles: null },
          { key: 'quiz-questions', label: "O'yin savollari", icon: HelpCircle, kind: 'resource', resource: 'quiz_questions', roles: null },
          { key: 'mystery-box', label: 'Mystery box', icon: Package, kind: 'mysterybox', roles: null },
          { key: 'mystery-box-log', label: 'Mystery box tarixi', icon: History, kind: 'resource', resource: 'mystery_box', roles: ['founder','director','super_admin','branch_manager','admin','academic_manager'] },
          { key: 'roleplay', label: "Rol o'yini", icon: Drama, kind: 'roleplaypage', roles: null },
          { key: 'daily-puzzle', label: 'Kunlik topishmoq', icon: Puzzle, kind: 'dailypuzzle', roles: null },
          { key: 'polls-m', label: "Tez so'rovnoma", icon: ListChecks, kind: 'votingpage', roles: null },
          { key: 'countdown-m', label: 'Countdown', icon: Hourglass, kind: 'countdownpage', roles: null },
        ] },
        { key: 'coin-vip-world', label: 'Coin & VIP dunyosi', icon: Gem, kind: 'tabs', roles: null, tabs: [
          { key: 'teacher-coin', label: 'Ustoz coinlari', icon: Coins, kind: 'teachercoins', roles: null },
          { key: 'coin-bank-m', label: 'Coin bank', icon: PiggyBank, kind: 'coinbank', roles: null },
          { key: 'coin-gifts-m', label: 'Coin hadya', icon: Gift, kind: 'coingift', roles: null },
          { key: 'vip-m', label: 'VIP status', icon: Crown, kind: 'vipstatus', roles: null },
          { key: 'avatar-shop-m', label: 'Avatar shop', icon: Smile, kind: 'avatarshoppage', roles: null },
          { key: 'subscription-boxes', label: 'Obuna qutilari', icon: Box, kind: 'subscriptionboxespage', roles: null },
          { key: 'birthday-m', label: "Tug'ilgan kun", icon: Cake, kind: 'birthdaybonuspage', roles: null },
          { key: 'seasonal-m', label: 'Mavsumiy tadbirlar', icon: Calendar, kind: 'resource', resource: 'seasonal_events', roles: null },
        ] },
        { key: 'org-board', label: 'Tashkiliy kengash', icon: Handshake, kind: 'tabs', roles: null, tabs: [
          { key: 'innov', label: 'Innovatsiya board', icon: Lightbulb, kind: 'innovationboard', roles: null },
          { key: 'cleaning', label: 'Tozalash jadvali', icon: SprayCan, kind: 'cleaningschedule', roles: null },
          { key: 'meetings-n', label: "Yig'ilish qarorlari", icon: ClipboardCheck, kind: 'meetings', roles: null },
          { key: 'int-ann', label: "Ichki e'lonlar", icon: Bell, kind: 'internalannouncements', roles: null },
          { key: 'evt-tickets', label: 'Tadbir biletlari', icon: Ticket, kind: 'eventtickets', roles: null },
          { key: 'franchise', label: 'Franshiza', icon: Building2, kind: 'franchisedashboard', roles: null },
          { key: 'worldmap', label: 'Dunyo xaritasi', icon: Map, kind: 'resource', resource: 'world_map', roles: null },
          { key: 'diary-m', label: 'Shaxsiy kundalik', icon: NotebookPen, kind: 'diarypage', roles: null },
          { key: 'study_groups', label: 'Study guruhlar', icon: Users, kind: 'studygroupspage', roles: null },
          { key: 'homework-submissions', label: 'Uy vazifasi topshiruv', icon: ClipboardList, kind: 'homeworkreview', roles: null },
          { key: 'theme', label: 'Tema sozlash', icon: Palette, kind: 'resource', resource: 'theme_settings', roles: null },
        ] },
        { key: 'budget-planning', label: 'Byudjet', icon: Calculator, kind: 'resource', resource: 'budget_planning', roles: ADMIN_ONLY },
        { key: 'financial-reports', label: 'Moliyaviy hisobotlar', icon: BarChart3, kind: 'resource', resource: 'financial_reports', roles: ADMIN_ONLY },
        { key: 'tax-center', label: 'Soliq markazi', icon: Calculator, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'tax', label: 'Kalkulator', icon: Calculator, kind: 'taxcalculator', roles: ADMIN_ONLY },
          { key: 'tax-reports', label: 'Hisobotlar', icon: Receipt, kind: 'resource', resource: 'tax_reports', roles: ADMIN_ONLY },
        ] },
        { key: 'expense-r', label: 'Xarajat hisoboti', icon: Receipt, kind: 'expensereport', roles: ADMIN_ONLY },
        { key: 'reimburse-advance', label: 'Kompensatsiyalar & Avans', icon: Wallet, kind: 'tabs', roles: ADMIN_ONLY, tabs: [
          { key: 'reimbursements', label: 'Kompensatsiyalar', icon: Wallet, kind: 'resource', resource: 'reimbursements', roles: ADMIN_ONLY },
          { key: 'advance', label: 'Avans', icon: Wallet, kind: 'advancerequest', roles: ADMIN_ONLY },
        ] },
        { key: 'finance-extras', label: "Qo'shimcha moliya", icon: Banknote, kind: 'tabs', roles: null, tabs: [
          { key: 'salary-calc', label: 'Oylik kalkulator', icon: Calculator, kind: 'salarycalculator', roles: null },
          { key: 'calc', label: 'Kalkulator', icon: Calculator, kind: 'calculatorpage', roles: null },
          { key: 'department-budgets', label: "Bo'lim byudjetlari", icon: Wallet, kind: 'departmentbudgets', roles: null },
          { key: 'scholarship-applications', label: 'Stipendiya arizalari', icon: GraduationCap, kind: 'scholarshipapplications', roles: null },
          { key: 'revenue-forecast', label: 'Daromad bashorati', icon: TrendingUp, kind: 'resource', resource: 'revenue_forecast', roles: null },
          { key: 'expense-forecast', label: 'Xarajat bashorati', icon: TrendingDown, kind: 'resource', resource: 'expense_forecast', roles: null },
          { key: 'overtime-log', label: "Qo'shimcha ish", icon: Clock, kind: 'resource', resource: 'overtime_log', roles: null },
          { key: 'travel-requests', label: 'Xizmat safari', icon: Plane, kind: 'travelrequests', roles: null },
          { key: 'petty-cash', label: 'Mayda xarajatlar', icon: PiggyBank, kind: 'pettycash', roles: null },
        ] },
      ] },
    ],
  },
];

// Flat list of all items (for routing) — includes nested tabs so direct /app/:key
// links to a consolidated menu's sub-item (e.g. old bookmarks, cross-links from other pages) still resolve.
export const ALL_ITEMS = MENU.flatMap((g) => g.items.flatMap((it) => [
  { ...it, group: g.group },
  ...(it.tabs || []).map((t) => ({ ...t, group: g.group, parentKey: it.key })),
]));

// Super admin (Rollar & Ruxsatlar sahifasida) qo'shgan qo'lda ruxsatlar — default'dan ustun turadi.
let roleOverrides = [];
export function setRoleOverrides(list) { roleOverrides = Array.isArray(list) ? list : []; }

export function canAccess(role, item) {
  const override = roleOverrides.find((o) => o.role === role && o.menu_key === item.key);
  if (override) return override.allowed;
  if (isAdmin(role)) return true;
  if (item.roles === null) return true;
  return item.roles.includes(role);
}

// Menu groups filtered to what this role may see.
export function menuForRole(role) {
  return MENU
    .map((g) => ({ ...g, items: g.items.filter((it) => canAccess(role, it)) }))
    .filter((g) => g.items.length > 0);
}

export const findItem = (key) => ALL_ITEMS.find((i) => i.key === key);
