const PDFDocument = require('pdfkit');

function generateReceiptPDF(payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#1e40af';
    const gray = '#6b7280';

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(primary);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text(payment.school_name || 'School Management System', 40, 20, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text('FEE PAYMENT RECEIPT', 40, 45, { align: 'center' });

    // Receipt info box
    doc.fillColor(primary).rect(40, 90, doc.page.width - 80, 1).fill();

    doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('RECEIPT DETAILS', 40, 100);
    doc.fillColor(gray).font('Helvetica').fontSize(9);

    const leftCol = 40, rightCol = 220;
    let y = 118;

    const addRow = (label, value, col = leftCol) => {
      doc.fillColor(gray).text(label + ':', col, y);
      doc.fillColor('#1f2937').font('Helvetica-Bold').text(String(value || '-'), col + 80, y);
      doc.font('Helvetica');
      y += 16;
    };

    addRow('Receipt No', payment.receipt_number);
    addRow('Date', new Date(payment.payment_date).toLocaleDateString('en-GB'));
    addRow('Method', (payment.payment_method || '').replace('_', ' ').toUpperCase());
    if (payment.payment_reference) addRow('Reference', payment.payment_reference);

    y = 118;
    const r2 = rightCol + 80;
    doc.fillColor(gray).text('Student:', rightCol, y);
    doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${payment.first_name} ${payment.last_name}`, r2, y);
    doc.font('Helvetica'); y += 16;
    doc.fillColor(gray).text('Admission:', rightCol, y);
    doc.fillColor('#1f2937').font('Helvetica-Bold').text(payment.admission_number || '-', r2, y);
    doc.font('Helvetica'); y += 16;
    doc.fillColor(gray).text('Class:', rightCol, y);
    doc.fillColor('#1f2937').font('Helvetica-Bold').text(payment.class_name || '-', r2, y);
    doc.font('Helvetica'); y += 16;
    doc.fillColor(gray).text('Term:', rightCol, y);
    doc.fillColor('#1f2937').font('Helvetica-Bold').text(`${payment.term_name} - ${payment.year_name}`, r2, y);

    // Amount box
    const amtY = Math.max(y + 30, 220);
    doc.fillColor(primary).rect(40, amtY, doc.page.width - 80, 50).fill();
    doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
       .text('AMOUNT PAID', 40, amtY + 8, { align: 'center' });
    doc.fontSize(20).text(`GHS ${parseFloat(payment.amount_paid).toFixed(2)}`, 40, amtY + 22, { align: 'center' });

    // Footer
    const footY = amtY + 70;
    doc.fillColor(gray).fontSize(8).font('Helvetica')
       .text(`Received by: ${payment.rb_first || ''} ${payment.rb_last || ''}`, 40, footY)
       .text('This is a computer-generated receipt.', 40, footY + 12, { align: 'center' });

    doc.fillColor(primary).rect(0, doc.page.height - 20, doc.page.width, 20).fill();
    doc.end();
  });
}

function generateReportCardPDF({ student, scores, termResult, settings }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#1e3a8a';
    const accent = '#3b82f6';
    const W = doc.page.width;

    // Header stripe
    doc.rect(0, 0, W, 90).fill(primary);

    // School info
    doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
       .text(settings?.school_name || 'School Management System', 40, 15, { align: 'center' });
    if (settings?.school_motto) {
      doc.fontSize(9).font('Helvetica-Oblique')
         .text(settings.school_motto, 40, 35, { align: 'center' });
    }
    doc.fontSize(11).font('Helvetica-Bold')
       .text('STUDENT REPORT CARD', 40, 52, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`${student.term_name || ''} | ${student.year_name || ''}`, 40, 68, { align: 'center' });

    // Student info card
    let y = 105;
    doc.fillColor('#f0f4ff').rect(40, y, W - 80, 70).fill();
    doc.fillColor(primary).rect(40, y, 3, 70).fill();

    doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('STUDENT INFORMATION', 52, y + 8);
    doc.font('Helvetica').fontSize(9);

    const col1 = 52, col2 = 220, col3 = 380;
    const infoY = y + 24;

    doc.fillColor('#6b7280').text('Name:', col1, infoY);
    doc.fillColor('#111').font('Helvetica-Bold').text(`${student.first_name} ${student.last_name}`, col1 + 40, infoY);

    doc.fillColor('#6b7280').font('Helvetica').text('Class:', col2, infoY);
    doc.fillColor('#111').font('Helvetica-Bold').text(student.class_name || '-', col2 + 35, infoY);

    doc.fillColor('#6b7280').font('Helvetica').text('Adm. No:', col3, infoY);
    doc.fillColor('#111').font('Helvetica-Bold').text(student.admission_number || '-', col3 + 50, infoY);

    doc.fillColor('#6b7280').font('Helvetica').text('Gender:', col1, infoY + 16);
    doc.fillColor('#111').font('Helvetica-Bold').text(student.gender || '-', col1 + 40, infoY + 16);

    doc.fillColor('#6b7280').font('Helvetica').text('Position:', col2, infoY + 16);
    doc.fillColor('#111').font('Helvetica-Bold')
       .text(termResult ? `${termResult.position_in_class || '-'} / ${termResult.total_students || '-'}` : '-', col2 + 45, infoY + 16);

    doc.fillColor('#6b7280').font('Helvetica').text('Average:', col3, infoY + 16);
    doc.fillColor('#111').font('Helvetica-Bold')
       .text(termResult ? `${parseFloat(termResult.average_marks || 0).toFixed(1)}%` : '-', col3 + 45, infoY + 16);

    // Scores table
    y += 85;
    doc.fillColor(primary).rect(40, y, W - 80, 22).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');

    const cols = { subject: 40, classTest: 215, assignment: 265, midTerm: 315, endTerm: 370, total: 425, grade: 465, remarks: 495 };
    const headerY = y + 7;
    doc.text('SUBJECT', cols.subject + 2, headerY);
    doc.text('C.T', cols.classTest, headerY, { width: 45, align: 'center' });
    doc.text('ASST', cols.assignment, headerY, { width: 45, align: 'center' });
    doc.text('MID', cols.midTerm, headerY, { width: 50, align: 'center' });
    doc.text('END', cols.endTerm, headerY, { width: 50, align: 'center' });
    doc.text('TOTAL', cols.total, headerY, { width: 38, align: 'center' });
    doc.text('GRD', cols.grade, headerY, { width: 28, align: 'center' });
    doc.text('REMARK', cols.remarks, headerY);

    y += 22;
    scores.forEach((score, idx) => {
      const rowBg = idx % 2 === 0 ? '#f8fafc' : 'white';
      doc.fillColor(rowBg).rect(40, y, W - 80, 18).fill();
      doc.fillColor('#1f2937').fontSize(8).font('Helvetica');

      const ry = y + 5;
      doc.text(score.subject_name, cols.subject + 2, ry, { width: 170 });
      doc.text(String(score.class_test || 0), cols.classTest, ry, { width: 45, align: 'center' });
      doc.text(String(score.assignment || 0), cols.assignment, ry, { width: 45, align: 'center' });
      doc.text(String(score.mid_term || 0), cols.midTerm, ry, { width: 50, align: 'center' });
      doc.text(String(score.end_of_term || 0), cols.endTerm, ry, { width: 50, align: 'center' });

      const total = parseFloat(score.total_score || 0);
      const gradeColor = total >= 80 ? '#16a34a' : total >= 60 ? '#d97706' : total < 50 ? '#dc2626' : '#1f2937';
      doc.fillColor(gradeColor).font('Helvetica-Bold')
         .text(String(total.toFixed(1)), cols.total, ry, { width: 38, align: 'center' });
      doc.text(score.grade || '-', cols.grade, ry, { width: 28, align: 'center' });
      doc.fillColor('#6b7280').font('Helvetica').fontSize(7)
         .text(score.remarks || '', cols.remarks, ry, { width: 60 });

      y += 18;
    });

    // Summary footer
    y += 8;
    doc.fillColor('#dbeafe').rect(40, y, W - 80, 24).fill();
    doc.fillColor(primary).fontSize(9).font('Helvetica-Bold')
       .text(`OVERALL GRADE: ${termResult?.overall_grade || '-'}   |   AVERAGE: ${parseFloat(termResult?.average_marks || 0).toFixed(1)}%`, 40, y + 7, { align: 'center', width: W - 80 });

    // Remarks
    y += 35;
    if (termResult?.class_teacher_remarks) {
      doc.fillColor('#1f2937').fontSize(8).font('Helvetica-Bold').text("Class Teacher's Remarks:", 40, y);
      doc.font('Helvetica').text(termResult.class_teacher_remarks, 40, y + 12, { width: (W - 80) / 2 - 10 });
    }
    if (termResult?.headmaster_remarks) {
      doc.fillColor('#1f2937').fontSize(8).font('Helvetica-Bold').text("Headmaster's Remarks:", (W / 2) + 10, y);
      doc.font('Helvetica').text(termResult.headmaster_remarks, (W / 2) + 10, y + 12, { width: (W - 80) / 2 - 10 });
    }

    // Attendance
    if (termResult?.attendance_days) {
      y += 55;
      doc.fillColor('#1f2937').fontSize(8).font('Helvetica-Bold')
         .text(`Attendance: ${termResult.attendance_days} / ${termResult.school_days} days`, 40, y);
    }

    // Footer
    doc.fillColor(primary).rect(0, doc.page.height - 30, W, 30).fill();
    doc.fillColor('white').fontSize(7).font('Helvetica')
       .text(`Generated by School Management System | ${new Date().toLocaleDateString('en-GB')}`, 40, doc.page.height - 18, { align: 'center', width: W - 80 });

    doc.end();
  });
}

function generateClassReportPDF(classData, students) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = doc.page.width;
    doc.fillColor('#1e3a8a').rect(0, 0, W, 60).fill();
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
       .text('CLASS PERFORMANCE REPORT', 40, 20, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`Class: ${classData.class_name} | Term: ${classData.term_name} | Year: ${classData.year_name}`, 40, 40, { align: 'center' });

    let y = 75;
    doc.fillColor('#1e3a8a').rect(40, y, W - 80, 20).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 45, y + 6); doc.text('Student Name', 60, y + 6);
    doc.text('Average', 280, y + 6); doc.text('Grade', 340, y + 6);
    doc.text('Position', 380, y + 6); doc.text('Remarks', 440, y + 6);

    y += 20;
    students.forEach((s, idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      doc.fillColor(bg).rect(40, y, W - 80, 18).fill();
      doc.fillColor('#1f2937').fontSize(8).font('Helvetica');
      doc.text(String(idx + 1), 45, y + 5);
      doc.text(`${s.student?.first_name || ''} ${s.student?.last_name || ''}`, 60, y + 5, { width: 200 });
      doc.text(String(parseFloat(s.average || 0).toFixed(1)), 280, y + 5);
      doc.text(s.overallGrade || '-', 340, y + 5);
      doc.text(String(s.position || '-'), 380, y + 5);
      doc.text(s.remarks || '', 440, y + 5, { width: 100 });
      y += 18;
    });

    doc.end();
  });
}

module.exports = { generateReceiptPDF, generateReportCardPDF, generateClassReportPDF };
