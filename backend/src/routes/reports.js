const router = require('express').Router();
const { query, queryOne } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { generateClassReportPDF } = require('../services/pdfService');
const XLSX = require('xlsx');

router.use(authenticate, authorize('admin', 'headmaster', 'accountant'));

// Student performance report
router.get('/student-performance', async (req, res, next) => {
  try {
    const { student_id, academic_year_id, term_id } = req.query;
    const results = await query(
      `SELECT tr.*, at.term_name, ay.year_name, c.class_name, u.first_name, u.last_name
       FROM term_results tr
       JOIN students s ON tr.student_id = s.id JOIN users u ON s.user_id = u.id
       JOIN classes c ON tr.class_id = c.id
       JOIN academic_terms at ON tr.term_id = at.id JOIN academic_years ay ON tr.academic_year_id = ay.id
       WHERE tr.student_id = ? ${academic_year_id ? 'AND tr.academic_year_id = ?' : ''} ${term_id ? 'AND tr.term_id = ?' : ''}
       ORDER BY ay.id DESC, tr.term_number`,
      [student_id, ...(academic_year_id ? [academic_year_id] : []), ...(term_id ? [term_id] : [])]
    );
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// Class performance report
router.get('/class-performance', async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.query;
    const results = await query(
      `SELECT tr.*, u.first_name, u.last_name, s.admission_number
       FROM term_results tr
       JOIN students s ON tr.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE tr.class_id = ? AND tr.academic_year_id = ? AND tr.term_id = ? AND tr.status = 'published'
       ORDER BY tr.position_in_class`,
      [class_id, academic_year_id, term_id]
    );
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// Fee collection report
router.get('/fee-collection', async (req, res, next) => {
  try {
    const { academic_year_id, term_id, class_id, start_date, end_date } = req.query;
    let conditions = ["fp.status = 'confirmed'"], params = [];
    if (academic_year_id) { conditions.push('fp.academic_year_id = ?'); params.push(academic_year_id); }
    if (term_id) { conditions.push('fp.term_id = ?'); params.push(term_id); }
    if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
    if (start_date) { conditions.push('fp.payment_date >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('fp.payment_date <= ?'); params.push(end_date); }

    const [payments, [summary]] = await Promise.all([
      query(
        `SELECT fp.receipt_number, fp.amount_paid, fp.payment_date, fp.payment_method,
                u.first_name, u.last_name, s.admission_number, c.class_name, at.term_name, ay.year_name
         FROM fee_payments fp JOIN students s ON fp.student_id = s.id
         JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id
         JOIN academic_terms at ON fp.term_id = at.id JOIN academic_years ay ON fp.academic_year_id = ay.id
         WHERE ${conditions.join(' AND ')} ORDER BY fp.payment_date DESC`,
        params
      ),
      query(
        `SELECT COUNT(*) AS transactions, SUM(fp.amount_paid) AS total
         FROM fee_payments fp JOIN students s ON fp.student_id = s.id
         WHERE ${conditions.join(' AND ')}`,
        params
      ),
    ]);

    res.json({ success: true, data: { payments, summary } });
  } catch (err) { next(err); }
});

// Subject analysis
router.get('/subject-analysis', async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.query;
    const analysis = await query(
      `SELECT s.subject_name, COUNT(ss.id) AS students, AVG(ss.total_score) AS avg_score,
              MAX(ss.total_score) AS highest, MIN(ss.total_score) AS lowest,
              SUM(CASE WHEN ss.total_score >= 50 THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN ss.total_score < 50 THEN 1 ELSE 0 END) AS failed
       FROM student_scores ss
       JOIN examinations e ON ss.examination_id = e.id JOIN subjects s ON e.subject_id = s.id
       WHERE e.class_id = ? AND e.academic_year_id = ? AND e.term_id = ? AND e.status = 'approved'
       GROUP BY s.id ORDER BY s.subject_name`,
      [class_id, academic_year_id, term_id]
    );
    res.json({ success: true, data: analysis });
  } catch (err) { next(err); }
});

// Export fee collection to Excel
router.get('/fee-collection/export', async (req, res, next) => {
  try {
    const { academic_year_id, term_id } = req.query;
    const payments = await query(
      `SELECT fp.receipt_number AS 'Receipt No', CONCAT(u.first_name,' ',u.last_name) AS 'Student',
              s.admission_number AS 'Admission No', c.class_name AS 'Class',
              fp.amount_paid AS 'Amount', fp.payment_method AS 'Method',
              fp.payment_date AS 'Date', at.term_name AS 'Term', ay.year_name AS 'Year'
       FROM fee_payments fp JOIN students s ON fp.student_id = s.id
       JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id
       JOIN academic_terms at ON fp.term_id = at.id JOIN academic_years ay ON fp.academic_year_id = ay.id
       WHERE fp.status = 'confirmed' AND fp.academic_year_id = ? AND fp.term_id = ?
       ORDER BY fp.payment_date DESC`,
      [academic_year_id, term_id]
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(payments);
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Collection');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="fee-collection-${Date.now()}.xlsx"`,
    });
    res.send(buf);
  } catch (err) { next(err); }
});

// Export students to Excel
router.get('/students/export', async (req, res, next) => {
  try {
    const { class_id, status } = req.query;
    let conditions = ['1=1'], params = [];
    if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
    if (status) { conditions.push('s.status = ?'); params.push(status); }

    const students = await query(
      `SELECT s.admission_number AS 'Admission No', CONCAT(u.first_name,' ',u.last_name) AS 'Full Name',
              s.gender AS 'Gender', s.date_of_birth AS 'Date of Birth', c.class_name AS 'Class',
              s.guardian_name AS 'Guardian', s.guardian_phone AS 'Guardian Phone',
              u.email AS 'Email', s.address AS 'Address', s.status AS 'Status'
       FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id
       WHERE ${conditions.join(' AND ')} ORDER BY c.class_name, u.last_name`,
      params
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), 'Students');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="students-export-${Date.now()}.xlsx"`,
    });
    res.send(buf);
  } catch (err) { next(err); }
});

// Download class report PDF
router.get('/class-report/pdf', async (req, res, next) => {
  try {
    const { class_id, academic_year_id, term_id } = req.query;
    const classInfo = await queryOne(
      `SELECT c.class_name, at.term_name, ay.year_name FROM classes c, academic_terms at, academic_years ay
       WHERE c.id = ? AND at.id = ? AND ay.id = ?`,
      [class_id, term_id, academic_year_id]
    );
    const students = await query(
      `SELECT tr.*, u.first_name, u.last_name, s.admission_number
       FROM term_results tr JOIN students s ON tr.student_id = s.id JOIN users u ON s.user_id = u.id
       WHERE tr.class_id = ? AND tr.academic_year_id = ? AND tr.term_id = ? ORDER BY tr.position_in_class`,
      [class_id, academic_year_id, term_id]
    );

    const pdfBuf = await generateClassReportPDF(classInfo, students.map(s => ({ student: s, average: s.average_marks, overallGrade: s.overall_grade, position: s.position_in_class, remarks: s.headmaster_remarks })));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="class-report.pdf"` });
    res.send(pdfBuf);
  } catch (err) { next(err); }
});

module.exports = router;
