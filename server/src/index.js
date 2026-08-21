import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSeeded } from './db.js';
import authRoutes from './routes/auth.js';
import miscRoutes from './routes/misc.js';
import coinsRoutes from './routes/coins.js';
import usersRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import groupMembershipsRoutes from './routes/groupMemberships.js';
import uploadsRoutes from './routes/uploads.js';
import aiRoutes from './routes/ai.js';
import faceRoutes from './routes/face.js';
import telegramRoutes from './routes/telegram.js';
import roleOverridesRoutes from './routes/roleOverrides.js';
import botRoutes from './routes/bot.js';
import studentAccountRoutes from './routes/studentAccount.js';
import parentDashboardRoutes from './routes/parentDashboard.js';
import teacherCoinsRoutes from './routes/teacherCoins.js';
import coinBankRoutes from './routes/coinBank.js';
import coinGiftsRoutes from './routes/coinGifts.js';
import courseProgressRoutes from './routes/courseProgress.js';
import workHoursRoutes from './routes/workHours.js';
import scheduleSwapRoutes from './routes/scheduleSwap.js';
import staffRequestsRoutes from './routes/staffRequests.js';
import employeeOfMonthRoutes from './routes/employeeOfMonth.js';
import attendanceDailyRoutes from './routes/attendanceDaily.js';
import paymentsRoutes from './routes/payments.js';
import balanceRoutes from './routes/balance.js';
import assignmentSubmitRoutes from './routes/assignmentSubmit.js';
import essaySubmitRoutes from './routes/essaySubmit.js';
import luckyWheelRoutes from './routes/luckyWheel.js';
import gamificationRoutes from './routes/gamification.js';
import vipStatusRoutes from './routes/vipStatus.js';
import dailyPuzzleRoutes from './routes/dailyPuzzle.js';
import votingRoutes from './routes/voting.js';
import bossFightRoutes from './routes/bossFight.js';
import pettyCashRoutes from './routes/pettyCash.js';
import travelRequestsRoutes from './routes/travelRequests.js';
import diaryRoutes from './routes/diary.js';
import eventTicketsRoutes from './routes/eventTickets.js';
import announcementsRoutes from './routes/announcements.js';
import communicationRoutes from './routes/communication.js';
import callSignalsRoutes from './routes/callSignals.js';
import chatRoomAdminsRoutes from './routes/chatRoomAdmins.js';
import groupCallsRoutes from './routes/groupCalls.js';
import { startBillingScheduler } from './billing.js';
import { startBotPolling } from './botPoller.js';
import { crudRouter, rewardCrudRouter } from './crud.js';
import { EXTRA_TABLES, EXTRA_COLUMNS } from './seedExtras.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-seed on first run if the store is empty.
if (!isSeeded()) {
  console.log('⚙️  Bo\'sh baza aniqlandi — demo ma\'lumotlar yuklanmoqda...');
  await import('./seed.js');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ISO Termizy LMS API' }));

app.use('/api/auth', authRoutes);
app.use('/api', miscRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/role-overrides', roleOverridesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/student-account', studentAccountRoutes);
app.use('/api/parent-dashboard', parentDashboardRoutes);
app.use('/api/teacher-coins', teacherCoinsRoutes);
app.use('/api/coin-bank', coinBankRoutes);
app.use('/api/coin-gifts', coinGiftsRoutes);
app.use('/api/course-progress', courseProgressRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/schedule-swap', scheduleSwapRoutes);
app.use('/api/staff-requests', staffRequestsRoutes);
app.use('/api/employee-of-month', employeeOfMonthRoutes);
app.use('/api/attendance-daily', attendanceDailyRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/assignment-actions', assignmentSubmitRoutes);
app.use('/api/essay-actions', essaySubmitRoutes);
app.use('/api', gamificationRoutes);
app.use('/api/vip-status', vipStatusRoutes);
app.use('/api/daily-puzzle', dailyPuzzleRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/boss-fight', bossFightRoutes);
app.use('/api/event-tickets', eventTicketsRoutes);

startBotPolling();
startBillingScheduler();
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Data resources (real CRUD, persisted in SQLite) ──
app.use('/api/students', crudRouter('students',
  ['full_name', 'phone', 'group_name', 'teacher', 'lang', 'level', 'coins', 'points', 'streak', 'progress', 'paid', 'status', 'join_date',
    'jshshir', 'dormitory', 'passport_scan', 'passport_scan_name', 'tariff_price', 'tariff_type', 'balance',
    'parent_name', 'parent_phone', 'address', 'birth_date', 'telegram_username']));
app.use('/api/teachers', crudRouter('teachers',
  ['full_name', 'phone', 'langs', 'level', 'groups_count', 'rating', 'salary', 'status', 'coins']));
app.use('/api/groups', crudRouter('groups',
  ['name', 'teacher', 'reception', 'level', 'room', 'days', 'course_id', 'students_count', 'invite_code', 'status',
    'telegram_chat_id', 'telegram_topic_id']));
app.use('/api/courses', crudRouter('courses',
  ['name', 'icon', 'color', 'level', 'price', 'modules_count']));
app.use('/api/payments', paymentsRoutes);
app.use('/api/leads', crudRouter('leads',
  ['name', 'phone', 'source', 'status', 'assigned_to', 'note', 'date']));
app.use('/api/attendance', crudRouter('attendance',
  ['group_name', 'date', 'present', 'absent', 'note']));
app.use('/api/exams', crudRouter('exams',
  ['title', 'group_name', 'date', 'type', 'max_score', 'coin_reward', 'status']));
app.use('/api/certificates', crudRouter('certificates',
  ['student', 'course', 'level', 'date', 'serial']));
app.use('/api/branches', crudRouter('branches',
  ['name', 'address', 'students_count', 'status']));
app.use('/api/rooms', crudRouter('rooms',
  ['name', 'branch', 'capacity', 'status']));
app.use('/api/expenses', crudRouter('expenses',
  ['title', 'amount', 'category', 'date']));
app.use('/api/salaries', crudRouter('salaries',
  ['name', 'role', 'base', 'bonus', 'total']));
app.use('/api/announcements', announcementsRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/call_signals', callSignalsRoutes);
app.use('/api/group_calls', groupCallsRoutes);
app.use('/api/lessons', crudRouter('lessons',
  ['title', 'subject', 'group_name', 'teacher', 'date', 'time', 'room', 'duration', 'status', 'video_url', 'coin_reward', 'note']));
app.use('/api/assignments', crudRouter('assignments',
  ['title', 'subject', 'group_name', 'description', 'deadline', 'max_score', 'submitted', 'coin_reward', 'status']));
app.use('/api/quizzes', crudRouter('quizzes',
  ['title', 'subject', 'group_name', 'questions', 'duration', 'avg_score', 'status']));
app.use('/api/inventory', crudRouter('inventory',
  ['name', 'category', 'qty', 'location', 'status']));
app.use('/api/documents', crudRouter('documents',
  ['title', 'type', 'owner', 'date', 'status']));
app.use('/api/contracts', crudRouter('contracts',
  ['title', 'party', 'start_date', 'end_date', 'amount', 'status']));
app.use('/api/positions', crudRouter('positions',
  ['title', 'department', 'headcount', 'base_salary']));
app.use('/api/bonuses', crudRouter('bonuses',
  ['staff', 'reason', 'amount', 'date', 'status']));
app.use('/api/fines', crudRouter('fines',
  ['person', 'reason', 'amount', 'date', 'status']));
app.use('/api/parents', crudRouter('parents',
  ['name', 'child', 'phone', 'relation', 'status']));
app.use('/api/missions', crudRouter('missions',
  ['title', 'reward_coins', 'target', 'progress', 'status']));
app.use('/api/badges', crudRouter('badges',
  ['name', 'icon', 'criteria', 'holders']));
app.use('/api/campaigns', crudRouter('campaigns',
  ['name', 'channel', 'budget', 'leads', 'status']));
app.use('/api/rules', crudRouter('rules',
  ['title', 'category', 'description', 'status']));
app.use('/api/evaluations', crudRouter('evaluations',
  ['staff', 'period', 'score', 'note']));
app.use('/api/books', crudRouter('books',
  ['title', 'author', 'lang', 'qty', 'shelf', 'status', 'file_url']));
app.use('/api/curriculum', crudRouter('curriculum',
  ['subject', 'level', 'topics', 'hours', 'status']));

// ── v5: remaining modules (no placeholders) ──
app.use('/api/live_sessions', crudRouter('live_sessions',
  ['title', 'teacher', 'group_name', 'date', 'time', 'platform', 'link', 'status', 'lesson_plan_id', 'lesson_plan_title']));
app.use('/api/enrollments', crudRouter('enrollments',
  ['student', 'course', 'date', 'source', 'status']));
app.use('/api/transfers', crudRouter('transfers',
  ['student', 'from_group', 'to_group', 'date', 'reason', 'status']));
app.use('/api/frozen_students', crudRouter('frozen_students',
  ['student', 'group_name', 'freeze_date', 'unfreeze_date', 'reason', 'status']));
app.use('/api/alumni_records', crudRouter('alumni_records',
  ['student', 'course', 'graduation_date', 'certificate', 'current_status']));
app.use('/api/cashbox', crudRouter('cashbox',
  ['title', 'type', 'amount', 'date', 'note']));
app.use('/api/bank_accounts', crudRouter('bank_accounts',
  ['bank', 'account', 'balance', 'currency', 'status']));
app.use('/api/reception_log', crudRouter('reception_log',
  ['visitor', 'purpose', 'date', 'time', 'staff', 'status']));
app.use('/api/backups', crudRouter('backups',
  ['title', 'date', 'size', 'type', 'status']));
app.use('/api/tasks', crudRouter('tasks',
  ['title', 'assigned_to', 'priority', 'deadline', 'status']));
app.use('/api/homework', crudRouter('homework',
  ['title', 'subject', 'group_name', 'description', 'deadline', 'submitted', 'coin_reward', 'status']));
app.use('/api/placement_tests', crudRouter('placement_tests',
  ['student', 'result_level', 'score', 'date', 'status']));
app.use('/api/surveys', crudRouter('surveys',
  ['title', 'audience', 'responses', 'date', 'status']));
app.use('/api/feedback', crudRouter('feedback',
  ['from_name', 'type', 'message', 'date', 'status']));
app.use('/api/notifications_log', crudRouter('notifications_log',
  ['title', 'channel', 'audience', 'date', 'status']));
app.use('/api/events', crudRouter('events',
  ['title', 'type', 'date', 'location', 'status']));
app.use('/api/sales_pipeline', crudRouter('sales_pipeline',
  ['lead', 'stage', 'value', 'probability', 'assigned_to', 'next_action', 'status']));
app.use('/api/meetings', crudRouter('meetings',
  ['title', 'participants', 'date', 'time', 'location', 'type', 'status']));
app.use('/api/teacher_kpi', crudRouter('teacher_kpi',
  ['teacher', 'period', 'students_count', 'avg_score', 'attendance_rate', 'rating', 'status']));
app.use('/api/room_bookings', crudRouter('room_bookings',
  ['room', 'booked_by', 'date', 'time_start', 'time_end', 'purpose', 'status']));
app.use('/api/attendance_analytics', crudRouter('attendance_analytics',
  ['group_name', 'period', 'avg_present', 'avg_absent', 'rate', 'trend']));
app.use('/api/complaints', crudRouter('complaints',
  ['from_name', 'subject', 'message', 'priority', 'date', 'status']));
app.use('/api/success_stories', crudRouter('success_stories',
  ['student', 'title', 'story', 'achievement', 'date']));
app.use('/api/speaking_club', crudRouter('speaking_club',
  ['title', 'topic', 'teacher', 'date', 'time', 'max_seats', 'registered', 'status']));
app.use('/api/demo_lessons', crudRouter('demo_lessons',
  ['lead', 'teacher', 'subject', 'date', 'time', 'result', 'status']));
app.use('/api/follow_ups', crudRouter('follow_ups',
  ['lead', 'assigned_to', 'action', 'date', 'result', 'status']));
app.use('/api/waiting_list', crudRouter('waiting_list',
  ['name', 'phone', 'course', 'date', 'priority', 'status']));
app.use('/api/referrals', crudRouter('referrals',
  ['referrer', 'referred', 'course', 'bonus_coins', 'date', 'status']));
app.use('/api/group_analytics', crudRouter('group_analytics',
  ['group_name', 'period', 'avg_score', 'completion_rate', 'satisfaction', 'trend']));
app.use('/api/teacher_schedule', crudRouter('teacher_schedule',
  ['teacher', 'day', 'time_start', 'time_end', 'group_name', 'room']));
app.use('/api/lesson_library', crudRouter('lesson_library',
  ['title', 'subject', 'level', 'type', 'author', 'downloads', 'status', 'file_url']));
app.use('/api/homework_reviews', crudRouter('homework_reviews',
  ['student', 'homework', 'score', 'feedback', 'reviewer', 'date']));
app.use('/api/mock_exams', crudRouter('mock_exams',
  ['title', 'subject', 'group_name', 'date', 'participants', 'avg_score', 'coin_reward', 'status']));
app.use('/api/exam_results', crudRouter('exam_results',
  ['student', 'exam', 'mock_exam_id', 'exam_id', 'score', 'grade', 'date', 'status']));
app.use('/api/student_portfolio', crudRouter('student_portfolio',
  ['student', 'type', 'title', 'description', 'file_url', 'date']));
app.use('/api/leave_management', crudRouter('leave_management',
  ['staff', 'type', 'start_date', 'end_date', 'days', 'reason', 'status']));
app.use('/api/olympiad', crudRouter('olympiad',
  ['title', 'subject', 'level', 'date', 'participants', 'winners', 'status']));
app.use('/api/internal_chat', crudRouter('internal_chat',
  ['from_name', 'to_name', 'message', 'date', 'read']));
app.use('/api/partner_companies', crudRouter('partner_companies',
  ['name', 'type', 'contact', 'agreement', 'status']));
app.use('/api/tickets', crudRouter('tickets',
  ['title', 'from_name', 'category', 'priority', 'date', 'assigned_to', 'status']));
app.use('/api/ticket_replies', crudRouter('ticket_replies',
  ['ticket_id', 'author', 'author_role', 'message', 'at']));
app.use('/api/resource_center', crudRouter('resource_center',
  ['title', 'category', 'format', 'subject', 'downloads', 'status']));
app.use('/api/debate_club', crudRouter('debate_club',
  ['title', 'topic', 'moderator', 'date', 'time', 'participants', 'status']));
app.use('/api/sms_log', crudRouter('sms_log',
  ['recipient', 'phone', 'message', 'date', 'status']));
app.use('/api/student_timeline', crudRouter('student_timeline',
  ['student', 'event', 'detail', 'date', 'type']));
app.use('/api/essays', crudRouter('essays',
  ['student', 'title', 'subject', 'word_count', 'content', 'score', 'feedback', 'reviewer', 'coin_reward', 'date', 'status']));
app.use('/api/survey_votes', crudRouter('survey_votes',
  ['survey', 'voter', 'vote', 'comment', 'date']));
app.use('/api/chat_messages', chatRoutes);
app.use('/api/chat_rooms', crudRouter('chat_rooms', ['type', 'name', 'icon', 'created_by', 'date', 'invite_code', 'admins']));
app.use('/api/chat_rooms', chatRoomAdminsRoutes);
app.use('/api/chat_custom_emojis', crudRouter('chat_custom_emojis', ['emoji', 'added_by', 'date']));
app.use('/api/chat_premium', crudRouter('chat_premium', ['student', 'purchased_at', 'expires_at', 'cost_coins']));
app.use('/api/chat_bots', crudRouter('chat_bots', ['name', 'icon', 'persona', 'created_by', 'date']));
app.use('/api/group_memberships', groupMembershipsRoutes);
app.use('/api/notifications', crudRouter('notifications',
  ['title', 'body', 'type', 'target_role', 'read', 'date']));
app.use('/api/daily_journal', crudRouter('daily_journal',
  ['date', 'author', 'group_name', 'topic', 'homework', 'notes', 'present', 'absent']));
app.use('/api/teacher_portfolio', crudRouter('teacher_portfolio',
  ['teacher', 'type', 'title', 'description', 'url', 'date']));
app.use('/api/promo_codes', crudRouter('promo_codes',
  ['code', 'reward_coins', 'max_uses', 'used', 'expires', 'status']));
app.use('/api/lucky_wheel_log', luckyWheelRoutes);
app.use('/api/streak_rewards', crudRouter('streak_rewards',
  ['days', 'reward_coins', 'badge', 'status']));
app.use('/api/invoices', crudRouter('invoices',
  ['number', 'student', 'amount', 'date', 'due_date', 'status']));
app.use('/api/discounts', crudRouter('discounts',
  ['name', 'percent', 'applies_to', 'valid_until', 'status']));
app.use('/api/messages', crudRouter('messages',
  ['title', 'channel', 'audience', 'date', 'status']));
app.use('/api/coin_shop', crudRouter('coin_shop',
  ['item', 'icon', 'cost', 'tone', 'status']));
app.use('/api/lesson_ratings', crudRouter('lesson_ratings',
  ['teacher', 'group_name', 'date', 'score', 'punctuality', 'engagement', 'methodology', 'comment', 'rated_by']));
app.use('/api/lesson_plans', crudRouter('lesson_plans',
  ['title', 'teacher', 'level', 'duration', 'objectives', 'materials', 'activities', 'file_url', 'created_at']));
app.use('/api/quiz_questions', crudRouter('quiz_questions',
  ['subject', 'question', 'answer', 'option_a', 'option_b', 'option_c', 'option_d', 'status', 'quiz_id']));
app.use('/api/placement_questions', crudRouter('placement_questions',
  ['level', 'question', 'answer', 'option_a', 'option_b', 'option_c', 'option_d', 'status']));
app.use('/api/assignment_completions', crudRouter('assignment_completions',
  ['item_type', 'item_id', 'student', 'status', 'date']));
app.use('/api/quiz_attempts', crudRouter('quiz_attempts',
  ['quiz_id', 'quiz_title', 'student', 'correct_count', 'total_count', 'score_pct', 'date']));

// ── v11: HR moduli (Tizim) ──
app.use('/api/work_tenure', crudRouter('work_tenure',
  ['staff', 'position', 'hire_date', 'status']));
app.use('/api/okr_goals', crudRouter('okr_goals',
  ['owner', 'objective', 'key_result', 'progress', 'quarter', 'status']));
app.use('/api/hiring_pipeline', crudRouter('hiring_pipeline',
  ['candidate', 'position', 'stage', 'phone', 'date', 'status']));
app.use('/api/salary_calculator', crudRouter('salary_calculator',
  ['staff', 'base', 'bonus', 'deductions', 'net', 'date']));
app.use('/api/turnover_log', crudRouter('turnover_log',
  ['staff', 'position', 'event', 'date', 'reason']));
app.use('/api/training_tracker', crudRouter('training_tracker',
  ['staff', 'training', 'provider', 'date', 'status']));
app.use('/api/internal_jobs', crudRouter('internal_jobs',
  ['title', 'department', 'description', 'deadline', 'status']));
app.use('/api/mentorship', crudRouter('mentorship',
  ['mentor', 'mentee', 'focus', 'start_date', 'status']));
app.use('/api/exit_interviews', crudRouter('exit_interviews',
  ['staff', 'position', 'last_day', 'reason', 'rating', 'notes']));
app.use('/api/insurance', crudRouter('insurance',
  ['staff', 'policy_number', 'provider', 'valid_until', 'status']));

// ── v12: Ops/Facilities moduli (Tizim) ──
app.use('/api/innovation_board', crudRouter('innovation_board',
  ['submitted_by', 'idea', 'category', 'votes', 'status']));
app.use('/api/cleaning_schedule', crudRouter('cleaning_schedule',
  ['room', 'assigned_to', 'day', 'time', 'status']));
app.use('/api/key_management', crudRouter('key_management',
  ['key_name', 'room', 'holder', 'status']));
app.use('/api/transport', crudRouter('transport',
  ['vehicle', 'driver', 'route', 'capacity', 'status']));
app.use('/api/cafeteria', crudRouter('cafeteria',
  ['item', 'price', 'category', 'status']));
app.use('/api/internal_announcements', crudRouter('internal_announcements',
  ['title', 'body', 'author', 'audience', 'date']));
app.use('/api/cctv_log', crudRouter('cctv_log',
  ['camera', 'event', 'date', 'time', 'reviewed_by', 'status']));
app.use('/api/emergency_contacts', crudRouter('emergency_contacts',
  ['name', 'role', 'phone', 'type']));
app.use('/api/access_control', crudRouter('access_control',
  ['person', 'area', 'access_level', 'date', 'status']));
app.use('/api/first_aid_log', crudRouter('first_aid_log',
  ['person', 'incident', 'treatment', 'date', 'status']));
app.use('/api/visitor_log', crudRouter('visitor_log',
  ['visitor_name', 'phone', 'purpose', 'host_name', 'check_in', 'check_out', 'status']));
app.use('/api/parent_reports', crudRouter('parent_reports',
  ['student', 'week', 'summary', 'sent_date']));
app.use('/api/department_budgets', crudRouter('department_budgets',
  ['department', 'period', 'budget', 'spent']));
app.use('/api/procurement', crudRouter('procurement',
  ['item', 'quantity', 'cost', 'vendor', 'status']));
app.use('/api/maintenance_requests', crudRouter('maintenance_requests',
  ['location', 'issue', 'reported_by', 'date', 'status']));

// ── v13: Akademik sifat va boshqa real moduli (Tizim) ──
app.use('/api/tax_calculator', crudRouter('tax_calculator',
  ['staff', 'gross', 'tax_amount', 'net', 'date']));
app.use('/api/teacher_growth', crudRouter('teacher_growth',
  ['teacher', 'period', 'metric', 'score', 'notes']));
app.use('/api/peer_reviews', crudRouter('peer_reviews',
  ['reviewer', 'reviewee', 'date', 'score', 'comments']));
app.use('/api/methodology_lib', crudRouter('methodology_lib',
  ['title', 'subject', 'type', 'author', 'file_url']));
app.use('/api/student_progress_reports', crudRouter('student_progress_reports',
  ['group_name', 'period', 'avg_progress', 'note', 'date']));
app.use('/api/scholarship_applications', crudRouter('scholarship_applications',
  ['student', 'program', 'reason', 'date', 'status']));
app.use('/api/nps_scores', crudRouter('nps_scores',
  ['period', 'score', 'respondents', 'date']));
app.use('/api/parent_notifications', crudRouter('parent_notifications',
  ['student', 'message', 'channel', 'date', 'status']));
app.use('/api/parent_meetings', crudRouter('parent_meetings',
  ['parent_name', 'student', 'purpose', 'date', 'time', 'status']));
app.use('/api/kpi_dashboard', crudRouter('kpi_dashboard',
  ['metric_name', 'category', 'target', 'actual', 'period', 'status']));
app.use('/api/franchise_dashboard', crudRouter('franchise_dashboard',
  ['branch', 'investment', 'royalty_pct', 'status']));

// ── v14/v15: Tizim bo'limining qolgan real moduli ──
app.use('/api/daily_bonus', rewardCrudRouter('daily_bonus', ['student', 'streak_day', 'coins_awarded', 'date'],
  (row) => `🎁 Farzandingiz ${row.student} ${row.streak_day ? row.streak_day + '-kunlik ' : ''}streak uchun kunlik bonus — ${row.coins_awarded || 0} coin yutdi!`));
app.use('/api/weekly_tasks', crudRouter('weekly_tasks', ['title', 'target', 'reward_coins', 'week', 'status']));
app.use('/api/levels', crudRouter('levels', ['level_name', 'min_xp', 'max_xp', 'reward_badge']));
app.use('/api/xp_log', crudRouter('xp_log', ['student', 'amount', 'reason', 'date']));
app.use('/api/challenges_1v1', crudRouter('challenges_1v1', ['challenger', 'opponent', 'subject', 'winner', 'date', 'status']));
app.use('/api/team_battles', crudRouter('team_battles', ['team_a', 'team_b', 'subject', 'winner', 'date', 'status']));
app.use('/api/mystery_box', rewardCrudRouter('mystery_box', ['student', 'reward', 'coins', 'date'],
  (row) => `🎁 Farzandingiz ${row.student} Mystery Box'dan "${row.reward}" (${row.coins || 0} coin) yutdi!`));
app.use('/api/homework_streak', crudRouter('homework_streak', ['student', 'streak_days', 'reward_coins', 'status']));
app.use('/api/birthday_bonus', rewardCrudRouter('birthday_bonus', ['student', 'birth_date', 'bonus_coins', 'status'],
  (row) => `🎂 Tug'ilgan kuningiz muborak, ${row.student}! Markazdan sizga ${row.bonus_coins || 0} coin sovg'a qilindi!`));
app.use('/api/vip_status', crudRouter('vip_status', ['student', 'tier', 'since_date', 'perks']));
app.use('/api/avatar_shop', crudRouter('avatar_shop', ['item_name', 'cost_coins', 'category', 'status']));
app.use('/api/avatar_purchases', crudRouter('avatar_purchases', ['student', 'item_id', 'item_name', 'cost_coins', 'equipped', 'date']));
app.use('/api/hall_of_fame', crudRouter('hall_of_fame', ['student', 'achievement', 'date']));
app.use('/api/monthly_mvp', crudRouter('monthly_mvp', ['month', 'name', 'category', 'reason']));
app.use('/api/seasonal_events', crudRouter('seasonal_events', ['title', 'season', 'start_date', 'end_date', 'status']));
app.use('/api/countdown_events', crudRouter('countdown_events', ['title', 'target_date', 'status']));
app.use('/api/student_posts', crudRouter('student_posts', ['student', 'title', 'content', 'date', 'status']));
app.use('/api/polls', crudRouter('polls', ['question', 'options', 'votes_count', 'status']));
app.use('/api/ideas_box', crudRouter('ideas_box', ['submitted_by', 'idea', 'status']));
app.use('/api/student_awards', crudRouter('student_awards', ['student', 'award_name', 'date', 'issued_by']));
app.use('/api/karaoke', crudRouter('karaoke', ['student', 'song', 'date', 'score']));
app.use('/api/whiteboard_sessions', crudRouter('whiteboard_sessions', ['title', 'teacher', 'group_name', 'date', 'status']));
app.use('/api/podcast_episodes', crudRouter('podcast_episodes', ['title', 'host', 'duration_min', 'date', 'status']));
app.use('/api/student_voting', crudRouter('student_voting', ['title', 'options', 'votes_count', 'status']));
app.use('/api/live_streams', crudRouter('live_streams', ['title', 'host', 'date', 'time', 'link', 'status']));
app.use('/api/story_posts', crudRouter('story_posts', ['student', 'caption', 'image_url', 'date']));
app.use('/api/post_likes', crudRouter('post_likes', ['post_id', 'student', 'date']));
app.use('/api/check_ins', crudRouter('check_ins', ['student', 'location', 'date', 'time']));
app.use('/api/virtual_rooms', crudRouter('virtual_rooms', ['name', 'capacity', 'host', 'link', 'status']));
app.use('/api/virtual_room_members', crudRouter('virtual_room_members', ['room_id', 'student', 'date']));
app.use('/api/file_manager', crudRouter('file_manager', ['filename', 'folder', 'uploaded_by', 'date']));
app.use('/api/daily_puzzle', crudRouter('daily_puzzle', ['title', 'difficulty', 'date', 'solved_by']));
app.use('/api/boss_fights', crudRouter('boss_fights', ['title', 'level', 'participants', 'winner', 'status']));
app.use('/api/fitness_challenge', crudRouter('fitness_challenge', ['title', 'target', 'participants', 'date', 'status']));
app.use('/api/fitness_logs', crudRouter('fitness_logs', ['challenge_id', 'student', 'amount', 'date']));
app.use('/api/stock_game', crudRouter('stock_game', ['student', 'portfolio_value', 'rank', 'date']));
app.use('/api/chat_voice', crudRouter('chat_voice', ['from_name', 'to_name', 'duration_sec', 'date']));
app.use('/api/video_lessons', crudRouter('video_lessons', ['title', 'subject', 'teacher', 'duration_min', 'url']));
app.use('/api/video_views', crudRouter('video_views', ['video_id', 'video_title', 'student', 'date']));
app.use('/api/learning_map', crudRouter('learning_map', ['title', 'subject', 'milestones', 'status']));
app.use('/api/social_shares', crudRouter('social_shares', ['student', 'platform', 'content', 'date']));
app.use('/api/theme_settings', crudRouter('theme_settings', ['user', 'theme_name', 'primary_color']));
app.use('/api/calculator_history', crudRouter('calculator_history', ['user', 'expression', 'result', 'date']));
app.use('/api/study_groups', crudRouter('study_groups', ['name', 'subject', 'members_count', 'meeting_time']));
app.use('/api/study_group_members', crudRouter('study_group_members', ['group_id', 'student', 'date']));
app.use('/api/marketplace', crudRouter('marketplace', ['item_name', 'seller', 'price', 'status']));
app.use('/api/event_tickets', crudRouter('event_tickets', ['event_title', 'buyer', 'price', 'date', 'status']));
app.use('/api/tournament_bracket', crudRouter('tournament_bracket', ['tournament_name', 'round', 'participant_a', 'participant_b', 'winner']));
app.use('/api/role_play_scenarios', crudRouter('role_play_scenarios', ['title', 'level', 'description', 'status']));
app.use('/api/diary', diaryRoutes);
app.use('/api/world_map', crudRouter('world_map', ['region', 'description', 'unlocked']));
app.use('/api/e_library', crudRouter('e_library', ['title', 'author', 'category', 'file_url']));
app.use('/api/booking_slots', crudRouter('booking_slots', ['resource_name', 'date', 'time_start', 'time_end', 'booked_by']));
app.use('/api/qr_codes', crudRouter('qr_codes', ['label', 'code_value', 'linked_to', 'status']));
app.use('/api/newsletter_log', crudRouter('newsletter_log', ['title', 'audience', 'sent_date', 'status']));
app.use('/api/anti_cheat_log', crudRouter('anti_cheat_log', ['student', 'exam', 'flag_reason', 'date']));
app.use('/api/activity_log', crudRouter('activity_log', ['user', 'action', 'date', 'time']));
app.use('/api/anonymous_feedback', crudRouter('anonymous_feedback', ['message', 'category', 'date']));
app.use('/api/subscription_boxes', crudRouter('subscription_boxes', ['box_name', 'frequency', 'price', 'subscribers']));
app.use('/api/subscription_members', crudRouter('subscription_members', ['box_id', 'student', 'date', 'status']));
app.use('/api/social_media_posts', crudRouter('social_media_posts', ['platform', 'content', 'likes', 'date', 'status']));
app.use('/api/website_analytics', crudRouter('website_analytics', ['period', 'visits', 'new_visitors_pct', 'date']));
app.use('/api/seo_tracker', crudRouter('seo_tracker', ['keyword', 'position', 'search_engine', 'date']));
app.use('/api/content_calendar', crudRouter('content_calendar', ['title', 'channel', 'date', 'status']));
app.use('/api/brand_assets', crudRouter('brand_assets', ['title', 'type', 'file_url']));
app.use('/api/competitor_analysis', crudRouter('competitor_analysis', ['competitor', 'strength', 'weakness', 'date']));
app.use('/api/market_research', crudRouter('market_research', ['title', 'summary', 'date']));
app.use('/api/customer_journey', crudRouter('customer_journey', ['stage', 'touchpoint', 'conversion_pct']));
app.use('/api/sales_targets', crudRouter('sales_targets', ['period', 'target', 'achieved', 'status']));
app.use('/api/revenue_forecast', crudRouter('revenue_forecast', ['period', 'forecast', 'actual']));
app.use('/api/expense_forecast', crudRouter('expense_forecast', ['period', 'forecast', 'actual']));
app.use('/api/budget_planning', crudRouter('budget_planning', ['category', 'period', 'planned']));
app.use('/api/financial_reports', crudRouter('financial_reports', ['title', 'period', 'net_profit', 'date']));
app.use('/api/tax_reports', crudRouter('tax_reports', ['period', 'tax_amount', 'status']));
app.use('/api/overtime_log', crudRouter('overtime_log', ['staff', 'hours', 'date', 'status']));
app.use('/api/travel_requests', travelRequestsRoutes);
app.use('/api/reimbursements', crudRouter('reimbursements', ['staff', 'amount', 'reason', 'status']));
app.use('/api/petty_cash', pettyCashRoutes);
app.use('/api/vendor_management', crudRouter('vendor_management', ['name', 'category', 'contact', 'status']));
app.use('/api/compliance_checklist', crudRouter('compliance_checklist', ['item', 'category', 'status']));
app.use('/api/risk_register', crudRouter('risk_register', ['title', 'level', 'mitigation', 'status']));
app.use('/api/incident_reports', crudRouter('incident_reports', ['title', 'date', 'severity', 'status']));
app.use('/api/safety_inspections', crudRouter('safety_inspections', ['area', 'inspector', 'date', 'status']));
app.use('/api/fire_drill_log', crudRouter('fire_drill_log', ['date', 'duration_min', 'participants']));
app.use('/api/evacuation_plans', crudRouter('evacuation_plans', ['branch', 'file_url', 'updated_date']));
app.use('/api/first_aid_supplies', crudRouter('first_aid_supplies', ['item', 'qty', 'expiry_date', 'status']));
app.use('/api/it_assets', crudRouter('it_assets', ['name', 'type', 'assigned_to', 'status']));
app.use('/api/software_licenses', crudRouter('software_licenses', ['software', 'license_key', 'valid_until', 'status']));
app.use('/api/network_monitoring', crudRouter('network_monitoring', ['device', 'status', 'last_check']));
app.use('/api/system_updates', crudRouter('system_updates', ['version', 'notes', 'date', 'status']));
app.use('/api/bug_reports', crudRouter('bug_reports', ['title', 'reported_by', 'severity', 'status']));
app.use('/api/feature_requests', crudRouter('feature_requests', ['title', 'requested_by', 'votes', 'status']));
app.use('/api/feature_request_votes', crudRouter('feature_request_votes', ['request_id', 'student', 'date']));
app.use('/api/app_analytics', crudRouter('app_analytics', ['period', 'active_users', 'sessions']));
app.use('/api/api_usage', crudRouter('api_usage', ['endpoint', 'calls', 'date']));
app.use('/api/error_log', crudRouter('error_log', ['message', 'level', 'date']));
app.use('/api/performance_metrics', crudRouter('performance_metrics', ['metric', 'value', 'date']));
app.use('/api/sla_tracking', crudRouter('sla_tracking', ['service', 'target_pct', 'actual_pct', 'status']));
app.use('/api/uptime_monitor', crudRouter('uptime_monitor', ['service', 'uptime_pct', 'status']));
app.use('/api/security_audit', crudRouter('security_audit', ['title', 'auditor', 'date', 'status']));
app.use('/api/data_exports', crudRouter('data_exports', ['dataset', 'requested_by', 'date', 'status']));
app.use('/api/data_imports', crudRouter('data_imports', ['dataset', 'source', 'date', 'status']));
app.use('/api/migration_log', crudRouter('migration_log', ['title', 'date', 'status']));
app.use('/api/webhook_log', crudRouter('webhook_log', ['url', 'event', 'date', 'status']));
app.use('/api/notification_templates', crudRouter('notification_templates', ['name', 'channel', 'body']));
app.use('/api/email_templates', crudRouter('email_templates', ['name', 'subject', 'body']));
app.use('/api/sms_templates', crudRouter('sms_templates', ['name', 'body']));
app.use('/api/report_templates', crudRouter('report_templates', ['name', 'type', 'file_url']));
app.use('/api/document_templates', crudRouter('document_templates', ['name', 'type', 'file_url']));

// ── 102 "Tizim" modules — generic {name, notes, status, date} shape ──
for (const table of Object.keys(EXTRA_TABLES)) {
  app.use(`/api/${table}`, crudRouter(table, EXTRA_COLUMNS));
}

// Global error handler — always return JSON instead of a bare 500.
app.use((err, _req, res, _next) => {
  console.error('API xatosi:', err);
  res.status(500).json({ error: err.message || 'Server xatosi' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🏛  ISO Termizy Avlodlari — LMS API`);
  console.log(`   http://localhost:${PORT}/api/health\n`);
});
