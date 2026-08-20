import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function myStudent(req) {
  if (req.user.role === 'student') return store.all('students').find((s) => s.full_name === req.user.name);
  return null;
}

// ── Ro'yxatga olish (enrollment) ──
r.get('/enrollments', (req, res) => {
  const mine = myStudent(req);
  const studentId = mine ? mine.id : req.query.student_id;
  let rows = store.all('course_enrollments');
  if (studentId) rows = rows.filter((e) => String(e.student_id) === String(studentId));
  res.json(rows);
});

r.post('/enroll', canMutate, (req, res) => {
  const { student_id, course_id } = req.body || {};
  const student = store.get('students', student_id);
  const course = store.get('courses', course_id);
  if (!student || !course) return res.status(404).json({ error: "O'quvchi yoki kurs topilmadi" });
  const existing = store.where('course_enrollments', (e) => e.student_id === student.id && e.course_id === course.id)[0];
  if (existing) return res.json(existing);
  const row = store.insert('course_enrollments', {
    student_id: student.id, student_name: student.full_name,
    course_id: course.id, course_name: course.name, enrolled_at: now(),
  });
  logAudit(req.user.name, 'course enroll', `${student.full_name} → ${course.name}`);
  res.json(row);
});

r.delete('/enroll/:id', canMutate, (req, res) => {
  store.remove('course_enrollments', req.params.id);
  res.json({ ok: true });
});

// ── Kurs darslari (materiallar/slaydlar) ──
r.get('/lessons', (req, res) => {
  const { course_id } = req.query;
  let rows = store.all('course_lessons');
  if (course_id) rows = rows.filter((l) => String(l.course_id) === String(course_id));
  res.json(rows);
});

r.post('/lessons', canMutate, (req, res) => {
  const { course_id, title, slide_url } = req.body || {};
  const course = store.get('courses', course_id);
  if (!course) return res.status(404).json({ error: 'Kurs topilmadi' });
  if (!title?.trim()) return res.status(400).json({ error: 'Dars nomi kerak' });
  const row = store.insert('course_lessons', {
    course_id: course.id, title: title.trim(), slide_url: slide_url || null, created_by: req.user.name, at: now(),
  });
  logAudit(req.user.name, 'add lesson', `${course.name}: ${title}`);
  res.json(row);
});

r.delete('/lessons/:id', canMutate, (req, res) => {
  store.remove('course_lessons', req.params.id);
  for (const c of store.where('lesson_completions', (c2) => String(c2.lesson_id) === req.params.id)) {
    store.remove('lesson_completions', c.id);
  }
  res.json({ ok: true });
});

// ── Darsni bajarilgan deb belgilash (natija/score bilan) ──
r.get('/completions', (req, res) => {
  const mine = myStudent(req);
  const studentId = mine ? mine.id : req.query.student_id;
  let rows = store.all('lesson_completions');
  if (studentId) rows = rows.filter((c) => String(c.student_id) === String(studentId));
  if (req.query.course_id) rows = rows.filter((c) => String(c.course_id) === String(req.query.course_id));
  res.json(rows);
});

r.post('/complete', canMutate, (req, res) => {
  const { student_id, lesson_id, score } = req.body || {};
  const student = store.get('students', student_id);
  const lesson = store.get('course_lessons', lesson_id);
  if (!student || !lesson) return res.status(404).json({ error: "O'quvchi yoki dars topilmadi" });
  const existing = store.where('lesson_completions', (c) => c.student_id === student.id && c.lesson_id === lesson.id)[0];
  const payload = {
    student_id: student.id, lesson_id: lesson.id, course_id: lesson.course_id,
    score: score != null ? Number(score) : null, at: now(), marked_by: req.user.name,
  };
  const row = existing ? store.update('lesson_completions', existing.id, payload) : store.insert('lesson_completions', payload);
  res.json(row);
});

r.delete('/complete/:id', canMutate, (req, res) => {
  store.remove('lesson_completions', req.params.id);
  res.json({ ok: true });
});

export default r;
