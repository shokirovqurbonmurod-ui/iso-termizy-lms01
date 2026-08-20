// Seed data for a small set of remaining generic {name, notes, status, date} modules under 'Tizim' menu.
// Most of the original ~180 have since been graduated to real-column tables — see index.js / resources.js.

export const EXTRA_COLUMNS = ['name', 'notes', 'status', 'date'];

export const EXTRA_TABLES = {
  "meeting_notes": [
    [
      "Haftalik boshqaruv yig'ilishi",
      "Avgust oyi rejalari muhokama qilindi",
      "completed",
      "2026-07-28"
    ],
    [
      "O'qituvchilar kengashi",
      "IELTS natijalarini yaxshilash choralari",
      "completed",
      "2026-07-30"
    ]
  ]
};
