-- ═══════════════════════════════════════════════════════════
--  ISO Termizy Avlodlari — Supabase (PostgreSQL) sxemasi
--  Ixtiyoriy: bulutli baza kerak bo'lsa shu SQL ni Supabase
--  SQL Editor'da ishga tushiring, so'ng README dagi qadamlarni bajaring.
-- ═══════════════════════════════════════════════════════════

create table if not exists users (
  id bigint generated always as identity primary key,
  phone text unique not null,
  password_hash text not null,
  role text not null,
  full_name text not null,
  group_name text default '',
  branch text default 'Sherobod — Bosh filial',
  active int default 1,
  created_at timestamptz default now()
);

create table if not exists students (
  id bigint generated always as identity primary key,
  full_name text not null, phone text default '', group_name text default '',
  teacher text default '', lang text default 'Ingliz tili', level text default 'A1',
  coins int default 0, points int default 0, streak int default 0, progress int default 0,
  paid int default 0, status text default 'active', join_date date default now()
);

create table if not exists teachers (
  id bigint generated always as identity primary key,
  full_name text not null, phone text default '', langs text default '',
  level text default 'Middle', groups_count int default 0, rating real default 5,
  salary int default 0, status text default 'active'
);

create table if not exists groups (
  id bigint generated always as identity primary key,
  name text not null, teacher text default '', reception text default '',
  level text default '', room text default '', days text default '',
  course_id int default 0, students_count int default 0, invite_code text default '',
  status text default 'active'
);

create table if not exists courses (
  id bigint generated always as identity primary key,
  name text not null, icon text default '📘', color text default '#C6A15B',
  level text default '', price int default 0, modules_count int default 0
);

create table if not exists payments (
  id bigint generated always as identity primary key,
  student text not null, group_name text default '', amount int default 0,
  date text default '', status text default 'pending', method text default ''
);

create table if not exists leads (
  id bigint generated always as identity primary key,
  name text not null, phone text default '', source text default '',
  status text default 'new', assigned_to text default '', note text default '', date text default ''
);

-- Qolgan jadvallar (attendance, exams, certificates, branches, rooms, expenses,
-- salaries, announcements, lessons, assignments, quizzes, coin_log, inventory,
-- documents, contracts, positions, audit_log) xuddi shu uslubda qo'shiladi.
-- To'liq ro'yxat server/src/db.js dagi TABLES massivida.

-- Demo bosqichida RLS (Row Level Security) ni o'chirib qo'yish mumkin:
-- alter table users disable row level security;  -- (har bir jadval uchun)
