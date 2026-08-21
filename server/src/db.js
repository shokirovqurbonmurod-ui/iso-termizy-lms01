// Zero-dependency JSON-file store — no native modules, no compilation.
// Data persists to server/data/db.json and survives restarts.
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const FILE = join(dataDir, 'db.json');

export const TABLES = ['users', 'students', 'teachers', 'groups', 'courses', 'payments', 'general_coins', 'coin_shop', 'group_memberships', 'quiz_questions', 'placement_questions',
  'leads', 'attendance', 'exams', 'certificates', 'branches', 'rooms', 'expenses',
  'salaries', 'announcements', 'lessons', 'assignments', 'quizzes', 'coin_log',
  'inventory', 'documents', 'contracts', 'positions', 'invoices', 'discounts',
  'messages', 'bonuses', 'fines', 'parents', 'missions', 'badges', 'campaigns',
  'rules', 'evaluations', 'books', 'curriculum',
  'live_sessions', 'enrollments', 'transfers', 'frozen_students', 'alumni_records',
  'cashbox', 'bank_accounts', 'reception_log', 'backups',
  'tasks', 'homework', 'placement_tests', 'surveys', 'feedback',
  'notifications_log', 'events',
  'sales_pipeline', 'meetings', 'teacher_kpi', 'room_bookings',
  'attendance_analytics', 'complaints', 'success_stories', 'speaking_club',
  'demo_lessons', 'follow_ups',
  'waiting_list', 'referrals', 'group_analytics', 'teacher_schedule',
  'lesson_library', 'homework_reviews', 'mock_exams', 'exam_results',
  'student_portfolio', 'leave_management', 'olympiad', 'internal_chat',
  'partner_companies', 'tickets', 'resource_center', 'debate_club',
  'sms_log', 'student_timeline', 'essays', 'survey_votes', 'chat_messages', 'notifications', 'daily_journal', 'teacher_portfolio', 'promo_codes', 'lucky_wheel_log', 'streak_rewards', 'daily_bonus',
  'weekly_tasks',
  'student_profiles',
  'birthday_bonus',
  'homework_streak',
  'mini_games',
  'xp_log',
  'levels',
  'challenges_1v1',
  'team_battles',
  'monthly_mvp',
  'hall_of_fame',
  'coin_bank',
  'coin_gifts',
  'vip_status',
  'mystery_box',
  'student_posts',
  'post_likes',
  'polls',
  'ideas_box',
  'seasonal_events',
  'anonymous_feedback',
  'countdown_events',
  'avatar_shop',
  'kpi_dashboard',
  'work_hours',
  'leave_tracker',
  'sick_leave',
  'work_tenure',
  'okr_goals',
  'hiring_pipeline',
  'employee_of_month',
  'salary_calculator',
  'turnover_log',
  'training_tracker',
  'internal_jobs',
  'mentorship',
  'exit_interviews',
  'insurance',
  'lesson_ratings',
  'teacher_growth',
  'lesson_plans',
  'peer_reviews',
  'methodology_lib',
  'teacher_coins',
  'student_progress_reports',
  'lesson_swap',
  'innovation_board',
  'support_tickets',
  'inventory_scan',
  'cleaning_schedule',
  'key_management',
  'phone_directory',
  'meeting_notes',
  'branch_comparison',
  'transport',
  'cafeteria',
  'internal_announcements',
  'advance_requests',
  'expense_reports',
  'tax_calculator',
  'bonus_system',
  'salary_history',
  'cctv_log',
  'emergency_contacts',
  'access_control',
  'visitor_log',
  'first_aid_log',
  'marketplace',
  'event_tickets',
  'subscription_boxes',
  'partnerships',
  'franchise_dashboard',
  'tournament_bracket',
  'role_play_scenarios',
  'diary',
  'world_map',
  'parent_reports',
  'parent_meetings',
  'anti_cheat_log',
  'activity_log',
  'alumni_network',
  'e_library',
  'booking_slots',
  'qr_codes',
  'newsletter_log',
  'video_lessons',
  'video_views',
  'learning_map',
  'daily_puzzle',
  'boss_fights',
  'fitness_challenge',
  'stock_game',
  'karaoke',
  'whiteboard_sessions',
  'podcast_episodes',
  'theme_settings',
  'student_voting',
  'social_shares',
  'chat_voice',
  'live_streams',
  'story_posts',
  'check_ins',
  'virtual_rooms',
  'file_manager',
  'calculator_history',
  'student_awards',
  'parent_dashboard',
  'study_groups',
  'homework_submissions',
  'grade_book',
  'report_cards',
  'class_attendance_summary',
  'student_behavior',
  'parent_notifications',
  'teacher_attendance',
  'staff_directory',
  'department_budgets',
  'procurement',
  'maintenance_requests',
  'room_reservations',
  'event_calendar',
  'academic_calendar',
  'exam_schedule',
  'exam_results_detail',
  'scholarship_applications',
  'student_complaints',
  'teacher_complaints',
  'feedback_forms',
  'satisfaction_surveys',
  'nps_scores',
  'marketing_campaigns_v2',
  'social_media_posts',
  'website_analytics',
  'seo_tracker',
  'content_calendar',
  'brand_assets',
  'competitor_analysis',
  'market_research',
  'customer_journey',
  'sales_targets',
  'revenue_forecast',
  'expense_forecast',
  'budget_planning',
  'financial_reports',
  'tax_reports',
  'payroll_history',
  'overtime_log',
  'travel_requests',
  'reimbursements',
  'petty_cash',
  'vendor_management',
  'contract_management',
  'legal_documents',
  'compliance_checklist',
  'risk_register',
  'incident_reports',
  'safety_inspections',
  'fire_drill_log',
  'evacuation_plans',
  'first_aid_supplies',
  'it_assets',
  'software_licenses',
  'network_monitoring',
  'backup_log',
  'system_updates',
  'bug_reports',
  'feature_requests',
  'user_feedback',
  'app_analytics',
  'api_usage',
  'error_log',
  'performance_metrics',
  'sla_tracking',
  'uptime_monitor',
  'security_audit',
  'data_exports',
  'data_imports',
  'migration_log',
  'webhook_log',
  'notification_templates',
  'email_templates',
  'sms_templates',
  'report_templates',
  'document_templates',
  'teacher_schedule_swap',
  'audit_log',
  'ai_chat_log',
  'ai_settings',
  'face_enrollments',
  'face_checkins',
  'telegram_recipients',
  'role_overrides',
  'telegram_links',
  'student_attendance_daily',
  'bot_commands',
  'bot_pending_codes',
  'student_balance_ledger',
  'security_snapshots',
  'bot_settings',
  'teacher_coin_log',
  'course_enrollments',
  'course_lessons',
  'lesson_completions', 'assignment_completions', 'quiz_attempts', 'avatar_purchases', 'boss_fight_attacks',
  'payment_reminders_log', 'study_group_members', 'fitness_logs', 'subscription_members', 'virtual_room_members', 'feature_request_votes', 'chat_rooms', 'ticket_replies',
  'chat_custom_emojis', 'chat_premium', 'announcement_reads', 'chat_bots', 'call_signals',
  'group_call_participants', 'chat_read_state', 'chat_pins', 'chat_mutes', 'chat_saved', 'promo_code_redemptions',
  'chat_typing', 'user_presence', 'chat_reports', 'bot_pending_actions'];

function blank() { const d = {}; for (const t of TABLES) d[t] = []; return d; }

// Fayldan muvaffaqiyatli o'qildimi — shunga qarab "seeded" deb hisoblanadi (pastga qarang).
// Jadval bo'sh-emasligiga qarab tekshirish xato edi: yangi jadval qo'shilib, unga hali birorta
// yozuv tushmagan bo'lsa, har server restartida BUTUN baza demo holatiga qayta yozilib, haqiqiy
// ma'lumotlar (masalan Telegram qabul qiluvchilar, AI suhbat tarixi) yo'qolib ketardi.
let loadedFromDisk = false;

let data = load();

function load() {
  if (existsSync(FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
      const d = blank();
      for (const t of TABLES) if (Array.isArray(parsed[t])) d[t] = parsed[t];
      loadedFromDisk = true;
      return d;
    } catch { /* korrupt fayl — bo'sh holga qaytadi, qayta seed qilinadi */ }
  }
  return blank();
}

export function persist() {
  try { writeFileSync(FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('DB saqlashda xatolik:', e.message); }
}

function nextId(t) { return (data[t] || []).reduce((m, r) => Math.max(m, r.id || 0), 0) + 1; }

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export const store = {
  all(table) { return (data[table] || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0)); },
  list(table, { q, limit = 500 } = {}) {
    let rows = this.all(table);
    if (q && String(q).trim()) {
      const n = String(q).toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(n)));
    }
    return rows.slice(0, limit);
  },
  get(table, id) { return (data[table] || []).find((r) => r.id === Number(id)); },
  where(table, pred) { return (data[table] || []).filter(pred); },
  insert(table, row) { const r = { id: nextId(table), ...row }; (data[table] ||= []).push(r); persist(); return r; },
  update(table, id, patch) { const r = this.get(table, id); if (!r) return null; Object.assign(r, patch); persist(); return r; },
  remove(table, id) { data[table] = (data[table] || []).filter((r) => r.id !== Number(id)); persist(); return true; },
  count(table) { return (data[table] || []).length; },
  replaceAll(newData) { data = blank(); for (const t of TABLES) if (Array.isArray(newData[t])) data[t] = newData[t]; persist(); },
};

const AUDIT_LOG_MAX = 10000;

export function logAudit(actor, action, entity) {
  try {
    data.audit_log.push({ id: nextId('audit_log'), actor, action, entity, at: now() });
    if (data.audit_log.length > AUDIT_LOG_MAX) {
      data.audit_log = data.audit_log.slice(data.audit_log.length - AUDIT_LOG_MAX);
    }
    persist();
  } catch { /* non-fatal */ }
}

// data/db.json fayli mavjud va o'qildimi — shunga qarab hal qilinadi. Bo'sh jadvallarni
// tekshirish YO'Q, chunki yangi qo'shilgan jadval hali bo'sh bo'lishi butunlay normal holat
// (masalan hech kim Telegram qabul qiluvchi qo'shmagan yoki AI hali ishlatilmagan bo'lishi mumkin) —
// buni "baza bo'sh" deb talqin qilish har restartda butun bazani demo holatiga qaytarib yuborardi.
export function isSeeded() {
  return loadedFromDisk;
}
