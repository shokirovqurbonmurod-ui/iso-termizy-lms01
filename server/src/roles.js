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

export function isAdmin(role) {
  return ['founder', 'director', 'super_admin', 'branch_manager', 'admin'].includes(role);
}
