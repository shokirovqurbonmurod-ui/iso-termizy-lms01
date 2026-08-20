export const ROLES = [
  'founder', 'director', 'super_admin', 'branch_manager',
  'academic_manager', 'admin', 'reception', 'hr',
  'accountant', 'cashier', 'marketing', 'smm',
  'call_center', 'head_teacher', 'senior_teacher', 'teacher',
  'assistant_teacher', 'methodologist', 'mentor', 'librarian',
  'it_admin', 'qa_manager', 'parent', 'student', 'guest',
];

export const ROLE_LABEL = {
  founder: 'Founder', director: 'Director', super_admin: 'Super Admin',
  branch_manager: 'Branch Manager', academic_manager: 'Academic Manager',
  admin: 'Admin', reception: 'Reception', hr: 'HR Manager',
  accountant: 'Accountant', cashier: 'Cashier',
  marketing: 'Marketing Manager', smm: 'SMM Manager',
  call_center: 'Call Center', head_teacher: 'Head Teacher',
  senior_teacher: 'Senior Teacher', teacher: 'Teacher',
  assistant_teacher: 'Assistant Teacher', methodologist: 'Methodologist',
  mentor: 'Mentor', librarian: 'Librarian',
  it_admin: 'IT Administrator', qa_manager: 'QA Manager',
  parent: 'Parent', student: 'Student', guest: 'Guest',
};

export function roleLabel(r) { return ROLE_LABEL[r] || r; }

const RC = {
  founder: 'bg-gradient-to-r from-gold-400 to-gold-500 text-white',
  director: 'bg-navy-100 text-navy-700',
  super_admin: 'bg-navy-700 text-white',
  branch_manager: 'bg-blue-100 text-blue-700',
  academic_manager: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-slate-100 text-slate-700',
  reception: 'bg-violet-100 text-violet-700',
  hr: 'bg-amber-100 text-amber-700',
  accountant: 'bg-green-100 text-green-700',
  cashier: 'bg-teal-100 text-teal-700',
  marketing: 'bg-pink-100 text-pink-700',
  smm: 'bg-fuchsia-100 text-fuchsia-700',
  call_center: 'bg-orange-100 text-orange-700',
  head_teacher: 'bg-indigo-100 text-indigo-700',
  senior_teacher: 'bg-blue-100 text-blue-700',
  teacher: 'bg-sky-100 text-sky-700',
  assistant_teacher: 'bg-cyan-100 text-cyan-700',
  methodologist: 'bg-lime-100 text-lime-700',
  mentor: 'bg-rose-100 text-rose-700',
  librarian: 'bg-amber-100 text-amber-700',
  it_admin: 'bg-gray-700 text-white',
  qa_manager: 'bg-purple-100 text-purple-700',
  parent: 'bg-orange-100 text-orange-700',
  student: 'bg-blue-50 text-blue-600',
  guest: 'bg-slate-50 text-slate-500',
};

export function roleColor(r) { return RC[r] || 'bg-navy-100 text-navy-600'; }
export function isAdmin(r) { return ['founder','director','super_admin','branch_manager','admin'].includes(r); }
