import { jsPDF } from 'jspdf';

// Bitta sertifikatni chiroyli, landshaft PDF sifatida yuklab beradi.
export function downloadCertificatePdf({ student, course, level, serial, date }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const w = 297, h = 210, cx = w / 2;

  doc.setDrawColor(198, 161, 91);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, w - 24, h - 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(198, 161, 91);
  doc.text('ISO TERMIZY AVLODLARI', cx, 35, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Xorijiy tillar o'quv markazi", cx, 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 40);
  doc.text('SERTIFIKAT', cx, 70, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 100);
  doc.text('ushbu sertifikat quyidagi shaxsga topshiriladi:', cx, 90, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 30);
  doc.text(student || '—', cx, 110, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 100);
  doc.text(`"${course || '—'}" kursini${level ? ` (${level} darajasida)` : ''} muvaffaqiyatli tugatgani uchun`, cx, 128, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Sana: ${date || '—'}`, 40, h - 25);
  doc.text(`Seriya: ${serial || '—'}`, w - 40, h - 25, { align: 'right' });

  doc.save(`sertifikat-${(student || 'oquvchi').replace(/\s+/g, '-')}.pdf`);
}
