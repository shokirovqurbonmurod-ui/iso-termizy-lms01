import { jsPDF } from 'jspdf';
import { money } from './format.js';

// To'lov uchun PDF chek yaratib, brauzerga yuklab beradi.
export function downloadReceiptPdf(payment, student) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 130] });
  const cx = 40;
  let y = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ISO Termizy Avlodlari', cx, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("Xorijiy tillar o'quv markazi · Sherobod", cx, y, { align: 'center' });
  y += 6;
  doc.line(5, y, 75, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(money(payment?.amount), cx, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("To'lov qabul qilindi", cx, y, { align: 'center' });
  y += 6;
  doc.line(5, y, 75, y);
  y += 7;

  const rows = [
    ["O'quvchi", student?.full_name || '—'],
    ['Guruh', student?.group_name || '—'],
    ['Sana', payment?.date || '—'],
    ['Usul', payment?.method || '—'],
  ];
  if (payment?.card_number) rows.push(['Karta', payment.card_number]);
  if (payment?.id) rows.push(['Chek raqami', `#${payment.id}`]);

  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.text(String(label), 5, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 75, y, { align: 'right' });
    y += 6;
  }

  y += 3;
  doc.line(5, y, 75, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Ushbu chek avtomatik tizim tomonidan yaratildi', cx, y, { align: 'center' });

  doc.save(`chek-${payment?.id || Date.now()}.pdf`);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Bitta to'lov/hisob-kitob yozuvi uchun chop etiladigan chek (yangi oynada ochiladi va avtomatik print dialogini chaqiradi).
export function printReceipt({ studentName, groupName, type, amount, reason, date, staff, balanceAfter, receiptNo }) {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return;
  const isCredit = type === 'credit';
  studentName = escapeHtml(studentName);
  groupName = escapeHtml(groupName);
  reason = escapeHtml(reason);
  date = escapeHtml(date);
  staff = escapeHtml(staff);
  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<title>Chek — ${receiptNo || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; color: #1a2035; }
  .brand { text-align: center; margin-bottom: 18px; }
  .brand .name { font-size: 18px; font-weight: 800; color: #C6A15B; }
  .brand .sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  hr { border: none; border-top: 1px dashed #d1d5db; margin: 14px 0; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .row .label { color: #6b7280; }
  .row .value { font-weight: 600; text-align: right; }
  .amount { text-align: center; margin: 18px 0; }
  .amount .big { font-size: 28px; font-weight: 800; color: ${isCredit ? '#059669' : '#dc2626'}; }
  .amount .tag { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="brand">
    <div class="name">ISO Termizy Avlodlari</div>
    <div class="sub">Xorijiy tillar o'quv markazi · Sherobod</div>
  </div>
  <hr />
  <div class="amount">
    <div class="big">${isCredit ? '+' : '−'}${money(amount)}</div>
    <div class="tag">${isCredit ? "To'lov qabul qilindi" : 'Balansdan yechildi'}</div>
  </div>
  <hr />
  <div class="row"><span class="label">O'quvchi</span><span class="value">${studentName || '—'}</span></div>
  ${groupName ? `<div class="row"><span class="label">Guruh</span><span class="value">${groupName}</span></div>` : ''}
  <div class="row"><span class="label">Sabab</span><span class="value">${reason || '—'}</span></div>
  <div class="row"><span class="label">Sana</span><span class="value">${date || '—'}</span></div>
  <div class="row"><span class="label">Xodim</span><span class="value">${staff || '—'}</span></div>
  ${balanceAfter !== undefined ? `<div class="row"><span class="label">Joriy balans</span><span class="value">${money(balanceAfter)}</span></div>` : ''}
  ${receiptNo ? `<div class="row"><span class="label">Chek raqami</span><span class="value">#${receiptNo}</span></div>` : ''}
  <div class="footer">Ushbu chek avtomatik tizim tomonidan yaratildi</div>
  <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}
