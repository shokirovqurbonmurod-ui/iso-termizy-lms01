import { jsPDF } from 'jspdf';

// Bitta o'quvchi uchun davr tabelnomasini (davomat + baholar + izohlar) PDF qilib yuklaydi.
export function downloadReportCardPdf({ studentName, groupName, periodLabel, attendancePct, examAvg, exams, comments }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const cx = pageW / 2;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ISO Termizy Avlodlari', cx, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Xorijiy tillar o'quv markazi · Sherobod", cx, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TABELNOMA', cx, y, { align: 'center' });
  y += 10;
  doc.line(15, y, pageW - 15, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text("O'quvchi:", 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName || '—', 60, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Guruh:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(groupName || '—', 60, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Davr:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(periodLabel || '—', 60, y);
  y += 12;

  doc.setFillColor(246, 240, 224);
  doc.roundedRect(15, y, 80, 22, 2, 2, 'F');
  doc.roundedRect(115, y, 80, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(198, 161, 91);
  doc.text(`${attendancePct}%`, 55, y + 12, { align: 'center' });
  doc.text(`${examAvg}`, 155, y + 12, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Davomat', 55, y + 18, { align: 'center' });
  doc.text("O'rtacha ball", 155, y + 18, { align: 'center' });
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Imtihon natijalari', 15, y);
  y += 6;
  doc.setFontSize(9);
  if (!exams?.length) {
    doc.setFont('helvetica', 'normal');
    doc.text('Yozuv yo\'q', 15, y);
    y += 6;
  } else {
    for (const e of exams) {
      doc.setFont('helvetica', 'normal');
      doc.text(`${e.date}  —  ${e.exam}`, 15, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${e.score}${e.grade ? ' (' + e.grade + ')' : ''}`, 195, y, { align: 'right' });
      y += 6;
      if (y > 260) { doc.addPage(); y = 20; }
    }
  }
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Izohlar', 15, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (!comments?.length) {
    doc.text('Izoh yo\'q', 15, y);
    y += 6;
  } else {
    for (const c of comments) {
      const lines = doc.splitTextToSize(`${c.date} — ${c.detail}`, 180);
      doc.text(lines, 15, y);
      y += lines.length * 5 + 2;
      if (y > 260) { doc.addPage(); y = 20; }
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Ushbu hujjat avtomatik tizim tomonidan yaratildi', cx, 285, { align: 'center' });

  doc.save(`tabelnoma-${(studentName || 'oquvchi').replace(/\s+/g, '-')}.pdf`);
}
